// Test Enrollment Notification System
// This script tests the enrollment notification system by creating a test notification and approval request

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

async function testNotificationSystem() {
  try {
    console.log('Testing enrollment notification system...');
    
    // Test customer and business IDs (replace with actual IDs from your database)
    const customerId = 1; // Replace with a valid customer ID
    const businessId = 2; // Replace with a valid business ID
    const programId = 1; // Replace with a valid program ID
    
    // Get customer and business names
    const customerResult = await sql`SELECT id, name FROM customers WHERE id = ${customerId}`;
    const businessResult = await sql`SELECT id, name FROM users WHERE id = ${businessId}`;
    
    if (customerResult.length === 0) {
      console.error(`Customer with ID ${customerId} not found`);
      return;
    }
    
    if (businessResult.length === 0) {
      console.error(`Business with ID ${businessId} not found`);
      return;
    }
    
    const customer = customerResult[0];
    const business = businessResult[0];
    
    console.log(`Creating test notification for customer ${customer.name} from business ${business.name}...`);
    
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
        ${`${business.name} would like to enroll you in their loyalty program. Would you like to join?`},
        ${JSON.stringify({
          programId,
          programName: 'Test Loyalty Program',
          businessId,
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
          programId,
          programName: 'Test Loyalty Program',
          businessId,
          businessName: business.name,
          message: `${business.name} would like to enroll you in their Test Loyalty Program. Would you like to join?`
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
    
    console.log('✅ Enrollment notification system test completed successfully!');
  } catch (err) {
    console.error('Error testing notification system:', err);
  }
}

testNotificationSystem(); 