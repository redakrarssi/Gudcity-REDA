#!/usr/bin/env node

/**
 * Test Enrollment Process
 * This script tests the complete enrollment process to identify where it's failing
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL;
console.log("Database URL found:", DATABASE_URL ? "Yes" : "No");

// Create database connection
const sql = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 10
});

async function testEnrollmentProcess() {
  try {
    console.log('Starting enrollment process test...');
    
    // 1. Test the stored procedure directly
    console.log('\n1. Testing stored procedure...');
    
    // Get a pending enrollment request
    const pendingRequest = await sql`
      SELECT id, customer_id, business_id, entity_id, status
      FROM customer_approval_requests
      WHERE request_type = 'ENROLLMENT' AND status = 'PENDING'
      LIMIT 1
    `;
    
    if (pendingRequest.length === 0) {
      console.log('❌ No pending enrollment requests found');
      return false;
    }
    
    const request = pendingRequest[0];
    console.log(`Testing with request: ID=${request.id}, Customer=${request.customer_id}, Program=${request.entity_id}`);
    
    // Test the stored procedure
    try {
      const result = await sql`SELECT process_enrollment_approval(${request.id}::uuid, true)`;
      console.log('Stored procedure result:', result);
      
      if (result && result[0] && result[0].process_enrollment_approval) {
        console.log('✅ Stored procedure returned card ID:', result[0].process_enrollment_approval);
      } else {
        console.log('❌ Stored procedure did not return expected result');
      }
    } catch (error) {
      console.error('❌ Error calling stored procedure:', error);
    }
    
    // 2. Check if enrollment was created
    console.log('\n2. Checking enrollment creation...');
    const enrollment = await sql`
      SELECT * FROM program_enrollments
      WHERE customer_id = ${request.customer_id}
      AND program_id = ${request.entity_id}
    `;
    
    if (enrollment.length > 0) {
      console.log('✅ Enrollment created:', enrollment[0]);
    } else {
      console.log('❌ No enrollment found');
    }
    
    // 3. Check if card was created
    console.log('\n3. Checking card creation...');
    const card = await sql`
      SELECT * FROM loyalty_cards
      WHERE customer_id = ${request.customer_id}
      AND program_id = ${request.entity_id}
    `;
    
    if (card.length > 0) {
      console.log('✅ Card created:', card[0]);
    } else {
      console.log('❌ No card found');
    }
    
    // 4. Check if approval request status was updated
    console.log('\n4. Checking approval request status...');
    const updatedRequest = await sql`
      SELECT status, response_at FROM customer_approval_requests
      WHERE id = ${request.id}
    `;
    
    if (updatedRequest.length > 0) {
      console.log('✅ Request status updated:', updatedRequest[0]);
    } else {
      console.log('❌ Request not found');
    }
    
    // 5. Check if notifications were created
    console.log('\n5. Checking notifications...');
    const notifications = await sql`
      SELECT type, title, message FROM customer_notifications
      WHERE reference_id = ${request.id}
      OR (data->>'programId' = ${request.entity_id} AND data->>'customerId' = ${request.customer_id}::text)
    `;
    
    if (notifications.length > 0) {
      console.log(`✅ ${notifications.length} notifications created:`);
      notifications.forEach((notif, index) => {
        console.log(`  ${index + 1}. ${notif.type}: ${notif.title}`);
      });
    } else {
      console.log('❌ No notifications found');
    }
    
    console.log('\n✅ Enrollment process test completed!');
    return true;
  } catch (error) {
    console.error('❌ Error in enrollment process test:', error);
    return false;
  }
}

// Run the test
testEnrollmentProcess()
  .then(() => {
    console.log('\nTest completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running test:', error);
    process.exit(1);
  });