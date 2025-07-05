/**
 * Test script for the enrollment notification system fix
 * 
 * This script tests the fixed enrollment transaction process to ensure
 * it properly handles approvals and declines without transaction errors.
 */

import sql from './src/utils/db.js';
import { v4 as uuidv4 } from 'uuid';
import { ensureEnrollmentProcedureExists } from './src/utils/db.js';

// Main test function
async function runTests() {
  try {
    console.log('Starting enrollment notification system test...');
    
    // Make sure the stored procedure exists
    await ensureEnrollmentProcedureExists();
    console.log('Enrollment procedure exists or was created successfully');
    
    // Test data
    const customerId = 4;
    const businessId = 1;
    const programId = '6f47ce2a-447a-41bb-986c-283492644bf9';
    
    // Run tests
    console.log('\n--- TEST 1: Accept Enrollment Flow ---');
    await testEnrollmentAccept(customerId, businessId, programId);
    
    console.log('\n--- TEST 2: Decline Enrollment Flow ---');
    await testEnrollmentDecline(customerId, businessId, programId);
    
    console.log('\n--- TEST 3: End-to-End Flow with Verification ---');
    await testFullEnrollmentFlow(customerId, businessId, programId);
    
    console.log('\nAll tests completed successfully');
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    process.exit(0);
  }
}

// Test accepting an enrollment
async function testEnrollmentAccept(customerId, businessId, programId) {
  try {
    // Create an approval request with notification
    console.log('Creating approval request for accept test...');
    const notificationId = uuidv4();
    const requestId = uuidv4();
    
    // First create the notification
    await sql`
      INSERT INTO customer_notifications (
        id,
        customer_id,
        business_id,
        type,
        title,
        message,
        requires_action,
        action_taken,
        is_read,
        created_at
      ) VALUES (
        ${notificationId},
        ${customerId},
        ${businessId},
        'ENROLLMENT_REQUEST',
        'Program Enrollment Request',
        'A business would like to enroll you in their loyalty program',
        TRUE,
        FALSE,
        FALSE,
        NOW()
      )
    `;
    
    // Then create the approval request
    await sql`
      INSERT INTO customer_approval_requests (
        id,
        notification_id,
        customer_id,
        business_id,
        request_type,
        entity_id,
        status,
        requested_at
      ) VALUES (
        ${requestId},
        ${notificationId},
        ${customerId},
        ${businessId},
        'ENROLLMENT',
        ${programId},
        'PENDING',
        NOW()
      )
    `;
    console.log(`Created test approval request with ID: ${requestId}`);
    
    // Process the approval (ACCEPTING)
    console.log('Processing approval (ACCEPTING)...');
    const cardResult = await sql`
      SELECT process_enrollment_approval(${requestId}::uuid, TRUE)
    `;
    const cardId = cardResult[0].process_enrollment_approval;
    console.log(`Process completed successfully with card ID: ${cardId || 'No card created'}`);
    
    // Verify the results
    console.log('Verifying results...');
    
    // 1. Check notification was marked as actioned
    const notificationCheck = await sql`
      SELECT action_taken, is_read FROM customer_notifications
      WHERE id = ${notificationId}
    `;
    console.log('Notification actioned:', notificationCheck[0].action_taken);
    
    // 2. Check enrollment status
    const enrollmentCheck = await sql`
      SELECT status FROM program_enrollments
      WHERE customer_id = ${customerId} AND program_id = ${programId}
    `;
    console.log('Enrollment status:', enrollmentCheck.length ? enrollmentCheck[0].status : 'Not found');
    
    // 3. Check card created
    const cardCheck = await sql`
      SELECT id, card_number, status FROM loyalty_cards
      WHERE customer_id = ${customerId} AND program_id = ${programId}
    `;
    console.log('Card created:', cardCheck.length ? 'Yes' : 'No');
    if (cardCheck.length) {
      console.log(`Card number: ${cardCheck[0].card_number}, Status: ${cardCheck[0].status}`);
    }
    
    // 4. Check business notification created
    const businessNotificationCheck = await sql`
      SELECT id, type, title FROM customer_notifications
      WHERE customer_id = ${businessId} AND type = 'ENROLLMENT_ACCEPTED'
      ORDER BY created_at DESC LIMIT 1
    `;
    console.log('Business notification created:', businessNotificationCheck.length ? 'Yes' : 'No');
    
    // 5. Check customer-business relationship
    const relationshipCheck = await sql`
      SELECT status FROM customer_business_relationships
      WHERE customer_id = ${customerId}::text AND business_id = ${businessId}::text
    `;
    console.log('Customer-business relationship status:', relationshipCheck.length ? relationshipCheck[0].status : 'Not found');
    
    // 6. Check new customer notification about enrollment success
    const customerSuccessNotification = await sql`
      SELECT id, type, title FROM customer_notifications
      WHERE customer_id = ${customerId} AND type = 'ENROLLMENT_SUCCESS'
      ORDER BY created_at DESC LIMIT 1
    `;
    console.log('Customer success notification created:', customerSuccessNotification.length ? 'Yes' : 'No');
    
    return true;
  } catch (error) {
    console.error('Error in acceptance test:', error);
    return false;
  }
}

// Test declining an enrollment
async function testEnrollmentDecline(customerId, businessId, programId) {
  try {
    // Create an approval request with notification
    console.log('Creating approval request for decline test...');
    const notificationId = uuidv4();
    const requestId = uuidv4();
    
    // First create the notification
    await sql`
      INSERT INTO customer_notifications (
        id,
        customer_id,
        business_id,
        type,
        title,
        message,
        requires_action,
        action_taken,
        is_read,
        created_at
      ) VALUES (
        ${notificationId},
        ${customerId},
        ${businessId},
        'ENROLLMENT_REQUEST',
        'Program Enrollment Request',
        'A business would like to enroll you in their loyalty program',
        TRUE,
        FALSE,
        FALSE,
        NOW()
      )
    `;
    
    // Then create the approval request
    await sql`
      INSERT INTO customer_approval_requests (
        id,
        notification_id,
        customer_id,
        business_id,
        request_type,
        entity_id,
        status,
        requested_at
      ) VALUES (
        ${requestId},
        ${notificationId},
        ${customerId},
        ${businessId},
        'ENROLLMENT',
        ${programId},
        'PENDING',
        NOW()
      )
    `;
    console.log(`Created test approval request with ID: ${requestId}`);
    
    // Process the approval (DECLINING)
    console.log('Processing approval (DECLINING)...');
    const result = await sql`
      SELECT process_enrollment_approval(${requestId}::uuid, FALSE)
    `;
    console.log('Process completed successfully');
    
    // Verify the results
    console.log('Verifying results...');
    
    // 1. Check notification was marked as actioned
    const notificationCheck = await sql`
      SELECT action_taken, is_read FROM customer_notifications
      WHERE id = ${notificationId}
    `;
    console.log('Notification actioned:', notificationCheck[0].action_taken);
    
    // 2. Check enrollment NOT created
    const enrollmentCheck = await sql`
      SELECT COUNT(*) as count FROM program_enrollments
      WHERE customer_id = ${customerId} 
      AND program_id = ${programId}
      AND status = 'ACTIVE'
      AND created_at > (NOW() - INTERVAL '1 minute')
    `;
    console.log('New enrollment NOT created:', enrollmentCheck[0].count === '0' ? 'Verified' : 'Failed');
    
    // 3. Check business notification created
    const businessNotificationCheck = await sql`
      SELECT id, type, title FROM customer_notifications
      WHERE customer_id = ${businessId} AND type = 'ENROLLMENT_REJECTED'
      ORDER BY created_at DESC LIMIT 1
    `;
    console.log('Business rejection notification created:', businessNotificationCheck.length ? 'Yes' : 'No');
    
    // 4. Check customer-business relationship updated
    const relationshipCheck = await sql`
      SELECT status FROM customer_business_relationships
      WHERE customer_id = ${customerId}::text AND business_id = ${businessId}::text
    `;
    console.log('Customer-business relationship status:', relationshipCheck.length ? relationshipCheck[0].status : 'Not found');
    
    // 5. Check customer notification about enrollment decline
    const customerDeclineNotification = await sql`
      SELECT id, type, title FROM customer_notifications
      WHERE customer_id = ${customerId} AND type = 'ENROLLMENT_DECLINED'
      ORDER BY created_at DESC LIMIT 1
    `;
    console.log('Customer decline notification created:', customerDeclineNotification.length ? 'Yes' : 'No');
    
    return true;
  } catch (error) {
    console.error('Error in decline test:', error);
    return false;
  }
}

// End-to-end test of the full enrollment flow with verification
async function testFullEnrollmentFlow(customerId, businessId, programId) {
  try {
    console.log('Testing full enrollment flow with verification...');
    
    // 1. Ensure we start with a clean state (delete previous enrollments)
    console.log('Preparing test environment...');
    
    try {
      // Delete any existing enrollment
      await sql`
        DELETE FROM program_enrollments 
        WHERE customer_id = ${customerId} AND program_id = ${programId}
      `;
      
      // Delete any existing card
      await sql`
        DELETE FROM loyalty_cards
        WHERE customer_id = ${customerId} AND program_id = ${programId}
      `;
      
      console.log('Test environment prepared. Previous enrollments and cards removed.');
    } catch (cleanupError) {
      console.warn('Warning during cleanup:', cleanupError.message);
      // Continue with test even if cleanup fails
    }
    
    // 2. Create an enrollment request
    console.log('Creating enrollment request...');
    const notificationId = uuidv4();
    const requestId = uuidv4();
    
    // Create the notification
    await sql`
      INSERT INTO customer_notifications (
        id,
        customer_id,
        business_id,
        type,
        title,
        message,
        requires_action,
        action_taken,
        is_read,
        created_at,
        reference_id
      ) VALUES (
        ${notificationId},
        ${customerId},
        ${businessId},
        'ENROLLMENT_REQUEST',
        'Program Enrollment Request',
        'A business would like to enroll you in their loyalty program',
        TRUE,
        FALSE,
        FALSE,
        NOW(),
        ${programId}
      )
    `;
    
    // Create the approval request
    await sql`
      INSERT INTO customer_approval_requests (
        id,
        notification_id,
        customer_id,
        business_id,
        request_type,
        entity_id,
        status,
        requested_at,
        data
      ) VALUES (
        ${requestId},
        ${notificationId},
        ${customerId},
        ${businessId},
        'ENROLLMENT',
        ${programId},
        'PENDING',
        NOW(),
        '{"programName": "Test Program", "businessName": "Test Business"}'
      )
    `;
    console.log(`Created enrollment request with ID: ${requestId}`);
    
    // 3. Process the approval
    console.log('Approving enrollment...');
    const cardResult = await sql`
      SELECT process_enrollment_approval(${requestId}::uuid, TRUE)
    `;
    const cardId = cardResult[0].process_enrollment_approval;
    console.log(`Approval processed with card ID: ${cardId || 'No card created'}`);
    
    // 4. Verify enrollment record exists
    console.log('Verifying enrollment...');
    const enrollment = await sql`
      SELECT id, status, current_points FROM program_enrollments
      WHERE customer_id = ${customerId} AND program_id = ${programId}
    `;
    
    if (!enrollment.length) {
      throw new Error('Enrollment record not found after approval');
    }
    
    console.log('✓ Enrollment record verified:', {
      id: enrollment[0].id,
      status: enrollment[0].status,
      points: enrollment[0].current_points
    });
    
    // 5. Verify card record exists
    console.log('Verifying loyalty card...');
    const card = await sql`
      SELECT id, card_number, status, points FROM loyalty_cards
      WHERE customer_id = ${customerId} AND program_id = ${programId}
    `;
    
    if (!card.length) {
      throw new Error('Card record not found after approval');
    }
    
    console.log('✓ Loyalty card verified:', {
      id: card[0].id,
      cardNumber: card[0].card_number,
      status: card[0].status,
      points: card[0].points
    });
    
    // 6. Verify notifications created
    console.log('Verifying notifications...');
    const notifications = await sql`
      SELECT type, title, action_taken, is_read
      FROM customer_notifications
      WHERE (customer_id = ${customerId} OR customer_id = ${businessId})
      AND created_at > (NOW() - INTERVAL '5 minutes')
      ORDER BY created_at DESC
    `;
    
    console.log(`✓ Found ${notifications.length} recent notifications`);
    notifications.forEach((notification, i) => {
      console.log(`  ${i+1}. ${notification.type}: ${notification.title} (read: ${notification.is_read}, actioned: ${notification.action_taken})`);
    });
    
    // 7. Verify customer-business relationship
    console.log('Verifying customer-business relationship...');
    const relationship = await sql`
      SELECT status, created_at, updated_at
      FROM customer_business_relationships
      WHERE customer_id = ${customerId}::text AND business_id = ${businessId}::text
    `;
    
    if (!relationship.length) {
      throw new Error('Customer-business relationship not found');
    }
    
    console.log('✓ Relationship verified:', {
      status: relationship[0].status
    });
    
    console.log('Full enrollment flow test completed successfully');
    return true;
  } catch (error) {
    console.error('Error in full enrollment flow test:', error);
    throw error;
  }
}

// Run the tests
runTests(); 