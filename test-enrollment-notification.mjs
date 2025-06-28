// Test Enrollment Notification System

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL;

// Create database connection
const sql = neon(DATABASE_URL);

async function main() {
  try {
    console.log('Testing enrollment notification system...');
    
    // Test connection
    console.log('Testing database connection...');
    const testResult = await sql`SELECT 1 as connected`;
    console.log('Connection test result:', testResult);
    
    // Get a customer ID
    const customers = await sql`SELECT id FROM customers LIMIT 1`;
    if (!customers.length) {
      console.error('No customers found in the database');
      return;
    }
    const customerId = customers[0].id;
    console.log(`Using customer ID: ${customerId}`);
    
    // Get a business ID
    const businesses = await sql`SELECT id FROM users WHERE role = 'business' LIMIT 1`;
    if (!businesses.length) {
      console.error('No businesses found in the database');
      return;
    }
    const businessId = businesses[0].id;
    console.log(`Using business ID: ${businessId}`);
    
    // Get a program ID
    const programs = await sql`SELECT id, name FROM loyalty_programs LIMIT 1`;
    if (!programs.length) {
      console.error('No loyalty programs found in the database');
      return;
    }
    const programId = programs[0].id;
    const programName = programs[0].name;
    console.log(`Using program: ${programName} (ID: ${programId})`);
    
    // Create a notification
    const notificationId = uuidv4();
    console.log('Creating notification...');
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
        ${'Would you like to join this loyalty program?'},
        ${JSON.stringify({
          programId,
          programName
        })},
        ${programId},
        ${true},
        ${false},
        ${false},
        ${new Date().toISOString()}
      )
    `;
    console.log(`✅ Created notification with ID: ${notificationId}`);
    
    // Create an approval request
    const approvalId = uuidv4();
    console.log('Creating approval request...');
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
        ${programId},
        ${'PENDING'},
        ${JSON.stringify({
          programId,
          programName
        })},
        ${new Date().toISOString()},
        ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}
      )
    `;
    console.log(`✅ Created approval request with ID: ${approvalId}`);
    
    // Verify that the notification was created
    const notifications = await sql`
      SELECT * FROM customer_notifications WHERE id = ${notificationId}
    `;
    console.log('Notification created:', notifications.length > 0);
    
    // Verify that the approval request was created
    const approvals = await sql`
      SELECT * FROM customer_approval_requests WHERE id = ${approvalId}
    `;
    console.log('Approval request created:', approvals.length > 0);
    
    console.log('✅ Enrollment notification system test completed successfully!');
  } catch (error) {
    console.error('❌ Error testing enrollment notification system:', error);
  }
}

// Run the main function
main(); 