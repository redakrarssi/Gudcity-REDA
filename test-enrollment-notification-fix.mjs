// Test Enrollment Notification System Fix
// This script tests the fixed enrollment notification system

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL;
console.log("Database URL found:", DATABASE_URL ? "Yes" : "No");

// Create database connection
const sql = neon(DATABASE_URL);

async function testFixedNotificationSystem() {
  try {
    console.log('Testing fixed enrollment notification system...');
    
    // Test customer and business IDs (replace with actual IDs from your database)
    const customerId = 1; // Replace with a valid customer ID
    const businessId = 2; // Replace with a valid business ID
    const programId = 1; // Replace with a valid program ID
    
    // Get customer and business names
    const customerResult = await sql`SELECT id, name FROM customers WHERE id = ${customerId}`;
    const businessResult = await sql`SELECT id, name FROM users WHERE id = ${businessId}`;
    const programResult = await sql`SELECT id, name FROM loyalty_programs WHERE id = ${programId}`;
    
    if (customerResult.length === 0) {
      console.error(`Customer with ID ${customerId} not found`);
      return;
    }
    
    if (businessResult.length === 0) {
      console.error(`Business with ID ${businessId} not found`);
      return;
    }
    
    if (programResult.length === 0) {
      console.error(`Program with ID ${programId} not found`);
      return;
    }
    
    const customer = customerResult[0];
    const business = businessResult[0];
    const program = programResult[0];
    
    console.log(`Creating test notification for customer ${customer.name} from business ${business.name} for program ${program.name}...`);
    
    // Generate UUIDs for the notification and approval request
    const notificationId = uuidv4();
    const approvalId = uuidv4();
    
    // Create a test notification
    await sql`
      INSERT INTO customer_notifications (
        id,
        customer_id,
        business_id,
        type,
        title,
        message,
        data,
        reference_id,
        requires_action,
        action_taken,
        is_read,
        created_at
      ) VALUES (
        ${notificationId},
        ${customerId},
        ${businessId},
        ${'ENROLLMENT_REQUEST'},
        ${'Program Enrollment Request'},
        ${`${business.name} would like to enroll you in their ${program.name} program. Would you like to join?`},
        ${JSON.stringify({
          programId: programId,
          programName: program.name,
          businessId: businessId,
          businessName: business.name
        })},
        ${programId.toString()},
        ${true},
        ${false},
        ${false},
        ${new Date().toISOString()}
      )
    `;
    
    console.log(`Created notification with ID ${notificationId}`);
    
    // Create a test approval request
    await sql`
      INSERT INTO customer_approval_requests (
        id,
        notification_id,
        customer_id,
        business_id,
        request_type,
        entity_id,
        status,
        data,
        requested_at,
        expires_at
      ) VALUES (
        ${approvalId},
        ${notificationId},
        ${customerId},
        ${businessId},
        ${'ENROLLMENT'},
        ${programId.toString()},
        ${'PENDING'},
        ${JSON.stringify({
          programId: programId,
          programName: program.name,
          businessId: businessId,
          businessName: business.name,
          message: `${business.name} would like to enroll you in their ${program.name} program. Would you like to join?`
        })},
        ${new Date().toISOString()},
        ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}
      )
    `;
    
    console.log(`Created approval request with ID ${approvalId}`);
    
    // Verify the notification and approval request were created
    const notificationResult = await sql`SELECT * FROM customer_notifications WHERE id = ${notificationId}`;
    const approvalResult = await sql`SELECT * FROM customer_approval_requests WHERE id = ${approvalId}`;
    
    console.log('Notification created:', notificationResult.length > 0 ? 'Yes' : 'No');
    console.log('Approval request created:', approvalResult.length > 0 ? 'Yes' : 'No');
    
    // Test the stored procedure
    console.log('\nTesting enrollment approval with stored procedure...');
    console.log('Simulating customer accepting the enrollment request...');
    
    // Call the stored procedure to approve the enrollment
    const procedureResult = await sql`SELECT process_enrollment_approval(${approvalId}, ${true})`;
    const success = procedureResult[0]?.process_enrollment_approval === true;
    
    console.log('Stored procedure success:', success ? 'Yes' : 'No');
    
    // Verify the approval request was updated
    const updatedApprovalResult = await sql`SELECT * FROM customer_approval_requests WHERE id = ${approvalId}`;
    console.log('Approval status updated:', 
      updatedApprovalResult.length > 0 ? updatedApprovalResult[0].status : 'Not found');
    
    // Verify the enrollment was created
    const enrollmentResult = await sql`
      SELECT * FROM program_enrollments 
      WHERE customer_id = ${customerId} 
      AND program_id = ${programId}
    `;
    
    console.log('Enrollment created:', enrollmentResult.length > 0 ? 'Yes' : 'No');
    
    // Verify the loyalty card was created
    const cardResult = await sql`
      SELECT * FROM loyalty_cards 
      WHERE customer_id = ${customerId} 
      AND program_id = ${programId}
    `;
    
    console.log('Loyalty card created:', cardResult.length > 0 ? 'Yes' : 'No');
    if (cardResult.length > 0) {
      console.log('Card ID:', cardResult[0].id);
      console.log('Card number:', cardResult[0].card_number);
    }
    
    console.log('\n✅ Enrollment notification system fix test completed successfully!');
    console.log('\nTo complete testing:');
    console.log('1. Log in as the customer to see the notification in the notification center');
    console.log('2. Accept or reject the enrollment request');
    console.log('3. Verify that no errors occur during the process');
    console.log('4. Check that the loyalty card appears in the customer dashboard if accepted');
  } catch (err) {
    console.error('Error testing notification system fix:', err);
  }
}

testFixedNotificationSystem(); 