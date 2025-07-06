// Test script for fixing enrollment notification issues
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// Database connection setup
const { Pool } = pg;
const sql = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test customer and business IDs - you can change these to test with different users
// Default test customer ID = 4
const customerId = process.env.TEST_CUSTOMER_ID || 4;
// Default test business ID = 1
const businessId = process.env.TEST_BUSINESS_ID || 1;

async function main() {
  console.log(chalk.blue('=== ENROLLMENT NOTIFICATION & CARD CREATION TEST ==='));
  console.log(chalk.blue('This test script will verify the full enrollment flow:'));
  console.log(chalk.blue('1. Receiving a notification to join a program'));
  console.log(chalk.blue('2. Accepting the enrollment request'));
  console.log(chalk.blue('3. Proper program enrollment'));
  console.log(chalk.blue('4. Loyalty card creation'));
  console.log(chalk.blue('================================================='));
  
  try {
    // First, make sure our test customer and business exist
    console.log(chalk.yellow('\nVerifying test accounts...'));
    await verifyTestAccounts(customerId, businessId);
    
    // Find or create a test program for our business
    console.log(chalk.yellow('\nSetting up test loyalty program...'));
    const programId = await getOrCreateTestProgram(businessId);
    
    // Clean up any existing enrollments between this customer and program
    console.log(chalk.yellow('\nCleaning up existing test data...'));
    await cleanupExistingData(customerId, businessId, programId);
    
    // Step 1: Create the enrollment notification and approval request
    console.log(chalk.yellow('\nStep 1: Creating enrollment notification...'));
    const { notificationId, approvalRequestId } = await createEnrollmentRequest(customerId, businessId, programId);
    
    // Verify the notification was created
    console.log(chalk.yellow('\nVerifying notification created...'));
    const notification = await verifyNotificationExists(notificationId);
    console.log(chalk.green('✓ Notification created successfully:'));
    console.log(`  - Title: ${notification.title}`);
    console.log(`  - Message: ${notification.message}`);
    console.log(`  - Requires Action: ${notification.requires_action}`);
    
    // Step 2: Accept the enrollment request
    console.log(chalk.yellow('\nStep 2: Accepting enrollment request...'));
    const cardId = await acceptEnrollmentRequest(approvalRequestId);
    console.log(chalk.green('✓ Enrollment accepted successfully!'));
    if (cardId) {
      console.log(chalk.green(`✓ Card created with ID: ${cardId}`));
    } else {
      console.log(chalk.red('✗ No card ID returned - possible issue in card creation'));
    }
    
    // Step 3: Verify proper program enrollment
    console.log(chalk.yellow('\nStep 3: Verifying program enrollment...'));
    const enrollment = await verifyProgramEnrollment(customerId, programId);
    if (enrollment) {
      console.log(chalk.green('✓ Program enrollment verified:'));
      console.log(`  - Status: ${enrollment.status}`);
      console.log(`  - Enrolled At: ${enrollment.enrolled_at}`);
      console.log(`  - Points: ${enrollment.current_points}`);
    } else {
      console.log(chalk.red('✗ Program enrollment not found or inactive'));
      throw new Error('Enrollment verification failed');
    }
    
    // Step 4: Verify card creation
    console.log(chalk.yellow('\nStep 4: Verifying loyalty card creation...'));
    const card = await verifyCardCreation(customerId, programId);
    if (card) {
      console.log(chalk.green('✓ Loyalty card verified:'));
      console.log(`  - Card Number: ${card.card_number}`);
      console.log(`  - Status: ${card.status}`);
      console.log(`  - Points: ${card.points}`);
      console.log(`  - Created At: ${card.created_at}`);
      console.log(`  - ID matches returned ID: ${card.id === cardId ? 'Yes' : 'No'}`);
    } else {
      console.log(chalk.red('✗ Loyalty card not found'));
      throw new Error('Card verification failed');
    }
    
    // Final verification - check for appropriate success notifications
    console.log(chalk.yellow('\nFinal verification - checking success notifications...'));
    const successNotifications = await verifySuccessNotifications(customerId, businessId, programId);
    
    if (successNotifications) {
      console.log(chalk.green('✓ All notifications created properly'));
    } else {
      console.log(chalk.yellow('⚠ Some success notifications may be missing'));
    }
    
    // All steps complete successfully!
    console.log(chalk.green('\n================================================='));
    console.log(chalk.green('✓ ALL TESTS PASSED - ENROLLMENT FLOW WORKING CORRECTLY!'));
    console.log(chalk.green('================================================='));
    
  } catch (error) {
    console.error(chalk.red('\n✗ TEST FAILED:'), error.message);
    console.error(chalk.yellow('Details:'), error);
  } finally {
    await sql.end();
  }
}

async function verifyTestAccounts(customerId, businessId) {
  const customerQuery = await sql.query('SELECT id, name, email FROM users WHERE id = $1', [customerId]);
  const businessQuery = await sql.query('SELECT id, name, email FROM users WHERE id = $1', [businessId]);
  
  if (customerQuery.rows.length === 0) {
    throw new Error(`Test customer with ID ${customerId} does not exist`);
  }
  
  if (businessQuery.rows.length === 0) {
    throw new Error(`Test business with ID ${businessId} does not exist`);
  }
  
  console.log(chalk.green('✓ Found test customer:'), customerQuery.rows[0].name);
  console.log(chalk.green('✓ Found test business:'), businessQuery.rows[0].name);
  
  return { customer: customerQuery.rows[0], business: businessQuery.rows[0] };
}

async function getOrCreateTestProgram(businessId) {
  // Check if business has any loyalty programs
  const programQuery = await sql.query(
    'SELECT id, name FROM loyalty_programs WHERE business_id = $1 AND status = $2 LIMIT 1',
    [businessId, 'ACTIVE']
  );
  
  if (programQuery.rows.length > 0) {
    console.log(chalk.green('✓ Found existing loyalty program:'), programQuery.rows[0].name);
    return programQuery.rows[0].id;
  }
  
  // Create a test program if none exists
  const newProgramId = uuidv4();
  await sql.query(`
    INSERT INTO loyalty_programs (
      id, business_id, name, description, type, point_value, 
      expiration_days, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
    )
  `, [
    newProgramId,
    businessId,
    'Test Loyalty Program',
    'A test program for enrollment notification testing',
    'POINTS',
    1.0,
    365,
    'ACTIVE'
  ]);
  
  console.log(chalk.green('✓ Created new test loyalty program with ID:'), newProgramId);
  return newProgramId;
}

async function cleanupExistingData(customerId, businessId, programId) {
  // Delete any existing approval requests
  await sql.query(`
    DELETE FROM customer_approval_requests 
    WHERE customer_id = $1 AND business_id = $2 AND entity_id = $3
  `, [customerId, businessId, programId]);
  
  // Delete any existing notifications for this program
  await sql.query(`
    DELETE FROM customer_notifications
    WHERE customer_id = $1 
    AND business_id = $2 
    AND (data->>'programId')::text = $3
  `, [customerId, businessId, programId]);
  
  // Delete any existing cards for this program and customer
  await sql.query(`
    DELETE FROM loyalty_cards 
    WHERE customer_id = $1 AND program_id = $3
  `, [customerId, businessId, programId]);
  
  // Delete any existing enrollments
  await sql.query(`
    DELETE FROM program_enrollments
    WHERE customer_id = $1 AND program_id = $3
  `, [customerId, businessId, programId]);
  
  console.log(chalk.green('✓ Cleaned up existing test data'));
}

async function createEnrollmentRequest(customerId, businessId, programId) {
  // Get business and program name for better messages
  const businessResult = await sql.query('SELECT name FROM users WHERE id = $1', [businessId]);
  const programResult = await sql.query('SELECT name FROM loyalty_programs WHERE id = $1', [programId]);
  
  const businessName = businessResult.rows[0]?.name || 'Business';
  const programName = programResult.rows[0]?.name || 'Loyalty Program';
  
  // Create a new notification
  const notificationId = uuidv4();
  await sql.query(`
    INSERT INTO customer_notifications (
      id, customer_id, business_id, type, title, message,
      data, requires_action, action_taken, is_read, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
    )
  `, [
    notificationId,
    customerId,
    businessId,
    'ENROLLMENT_REQUEST',
    'Program Enrollment Request',
    `${businessName} would like to enroll you in their ${programName} loyalty program. Would you like to join?`,
    JSON.stringify({
      programId,
      programName,
      businessId,
      businessName
    }),
    true, // requires action
    false, // action not yet taken
    false, // not read
  ]);
  
  // Create an approval request
  const approvalRequestId = uuidv4();
  await sql.query(`
    INSERT INTO customer_approval_requests (
      id, notification_id, customer_id, business_id,
      request_type, entity_id, status, requested_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, NOW()
    )
  `, [
    approvalRequestId,
    notificationId,
    customerId,
    businessId,
    'ENROLLMENT',
    programId,
    'PENDING'
  ]);
  
  console.log(chalk.green('✓ Created enrollment request:'));
  console.log(`  - Notification ID: ${notificationId}`);
  console.log(`  - Approval Request ID: ${approvalRequestId}`);
  
  return { notificationId, approvalRequestId };
}

async function verifyNotificationExists(notificationId) {
  const result = await sql.query(
    'SELECT * FROM customer_notifications WHERE id = $1',
    [notificationId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Notification not created successfully');
  }
  
  return result.rows[0];
}

async function acceptEnrollmentRequest(approvalRequestId) {
  // Call the stored procedure to process the enrollment approval
  const result = await sql.query(
    'SELECT process_enrollment_approval($1, $2) as card_id',
    [approvalRequestId, true] // true = approve
  );
  
  return result.rows[0]?.card_id;
}

async function verifyProgramEnrollment(customerId, programId) {
  const result = await sql.query(`
    SELECT * FROM program_enrollments
    WHERE customer_id = $1 AND program_id = $2
  `, [customerId, programId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

async function verifyCardCreation(customerId, programId) {
  const result = await sql.query(`
    SELECT * FROM loyalty_cards
    WHERE customer_id = $1 AND program_id = $2
  `, [customerId, programId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

async function verifySuccessNotifications(customerId, businessId, programId) {
  // Check for enrollment success notification
  const enrollmentSuccess = await sql.query(`
    SELECT * FROM customer_notifications
    WHERE customer_id = $1
    AND business_id = $2
    AND type = 'ENROLLMENT_SUCCESS'
    AND (data->>'programId')::text = $3
  `, [customerId, businessId, programId]);
  
  // Check for card created notification
  const cardCreated = await sql.query(`
    SELECT * FROM customer_notifications
    WHERE customer_id = $1
    AND business_id = $2
    AND type = 'CARD_CREATED'
    AND (data->>'programId')::text = $3
  `, [customerId, businessId, programId]);
  
  // Check for business notification
  const businessNotification = await sql.query(`
    SELECT * FROM customer_notifications
    WHERE customer_id = $2
    AND business_id = $2
    AND type = 'ENROLLMENT_ACCEPTED'
    AND (data->>'customerId')::text = $1
    AND (data->>'programId')::text = $3
  `, [customerId, businessId, programId]);
  
  console.log(chalk.green('✓ Success notifications found:'));
  console.log(`  - Enrollment Success: ${enrollmentSuccess.rows.length > 0 ? 'Yes' : 'No'}`);
  console.log(`  - Card Created: ${cardCreated.rows.length > 0 ? 'Yes' : 'No'}`);
  console.log(`  - Business Notification: ${businessNotification.rows.length > 0 ? 'Yes' : 'No'}`);
  
  return enrollmentSuccess.rows.length > 0 && 
         cardCreated.rows.length > 0 && 
         businessNotification.rows.length > 0;
}

// Run the main test function
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 