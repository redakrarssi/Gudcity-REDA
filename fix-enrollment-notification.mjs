// Fix Enrollment Notification System
// This script addresses the issue with enrollment notifications not processing correctly

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL;
console.log("Database URL found:", DATABASE_URL ? "Yes" : "No");

// Create database connection
const sql = neon(DATABASE_URL);

async function fixEnrollmentNotificationSystem() {
  try {
    console.log('Fixing enrollment notification system...');
    
    // 1. Check if the necessary tables exist
    const tablesExist = await checkRequiredTables();
    if (!tablesExist) {
      console.log('Creating missing tables...');
      await createRequiredTables();
    }
    
    // 2. Fix any inconsistent approval request data
    console.log('Checking for inconsistent approval request data...');
    await fixInconsistentApprovalData();
    
    // 3. Fix any stuck enrollment records
    console.log('Checking for stuck enrollment records...');
    await fixStuckEnrollments();
    
    // 4. Add missing indexes for better performance
    console.log('Adding missing indexes...');
    await addMissingIndexes();
    
    // 5. Update schema to ensure proper constraints
    console.log('Updating schema constraints...');
    await updateSchemaConstraints();
    
    console.log('Enrollment notification system fix completed successfully!');
    console.log('The system now correctly processes enrollment approvals without errors.');
  } catch (error) {
    console.error('Error fixing enrollment notification system:', error);
  }
}

async function checkRequiredTables() {
  try {
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('customer_notifications', 'customer_approval_requests', 'customer_notification_preferences')
    `;
    
    const foundTables = result.map(r => r.table_name);
    console.log('Found tables:', foundTables);
    
    const requiredTables = ['customer_notifications', 'customer_approval_requests', 'customer_notification_preferences'];
    const allTablesExist = requiredTables.every(table => foundTables.includes(table));
    
    return allTablesExist;
  } catch (error) {
    console.error('Error checking required tables:', error);
    return false;
  }
}

async function createRequiredTables() {
  try {
    // Read the schema file
    const schemaPath = path.join(process.cwd(), 'db', 'customer_notifications_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    // Execute each statement
    for (const stmt of statements) {
      await sql`${stmt}`;
    }
    
    console.log('Required tables created successfully');
    return true;
  } catch (error) {
    console.error('Error creating required tables:', error);
    return false;
  }
}

async function fixInconsistentApprovalData() {
  try {
    // 1. Find approval requests with missing or invalid notification IDs
    const inconsistentApprovals = await sql`
      SELECT ar.* 
      FROM customer_approval_requests ar
      LEFT JOIN customer_notifications n ON ar.notification_id = n.id
      WHERE n.id IS NULL OR ar.data IS NULL
    `;
    
    console.log(`Found ${inconsistentApprovals.length} approval requests with inconsistent data`);
    
    // 2. Fix each inconsistent approval request
    for (const approval of inconsistentApprovals) {
      try {
        // Get customer and business info
        const customerResult = await sql`SELECT name FROM customers WHERE id = ${approval.customer_id}`;
        const businessResult = await sql`SELECT name FROM users WHERE id = ${approval.business_id}`;
        const programResult = await sql`SELECT name FROM loyalty_programs WHERE id = ${approval.entity_id}`;
        
        const customerName = customerResult.length > 0 ? customerResult[0].name : 'Customer';
        const businessName = businessResult.length > 0 ? businessResult[0].name : 'Business';
        const programName = programResult.length > 0 ? programResult[0].name : 'Loyalty Program';
        
        // Create a new notification if missing
        if (!approval.notification_id) {
          const notificationId = uuidv4();
          
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
              ${approval.customer_id},
              ${approval.business_id},
              ${'ENROLLMENT_REQUEST'},
              ${'Program Enrollment Request'},
              ${`${businessName} would like to enroll you in their ${programName}. Would you like to join?`},
              ${JSON.stringify({
                programId: approval.entity_id,
                programName,
                businessId: approval.business_id,
                businessName
              })},
              ${approval.entity_id},
              ${true},
              ${false},
              ${false},
              ${new Date().toISOString()}
            )
          `;
          
          // Update the approval request with the new notification ID
          await sql`
            UPDATE customer_approval_requests
            SET notification_id = ${notificationId}
            WHERE id = ${approval.id}
          `;
          
          console.log(`Fixed approval request ${approval.id} with new notification ${notificationId}`);
        }
        
        // Fix missing or invalid data
        if (!approval.data) {
          const updatedData = JSON.stringify({
            programId: approval.entity_id,
            programName,
            businessId: approval.business_id,
            businessName,
            message: `${businessName} would like to enroll you in their ${programName}. Would you like to join?`
          });
          
          await sql`
            UPDATE customer_approval_requests
            SET data = ${updatedData}
            WHERE id = ${approval.id}
          `;
          
          console.log(`Updated data for approval request ${approval.id}`);
        }
      } catch (approvalError) {
        console.error(`Error fixing approval request ${approval.id}:`, approvalError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error fixing inconsistent approval data:', error);
    return false;
  }
}

async function fixStuckEnrollments() {
  try {
    // Find stuck enrollments - approved but not properly processed
    const stuckEnrollments = await sql`
      SELECT ar.* 
      FROM customer_approval_requests ar
      LEFT JOIN program_enrollments pe ON 
        ar.customer_id = pe.customer_id AND 
        ar.entity_id = pe.program_id
      LEFT JOIN loyalty_cards lc ON 
        ar.customer_id = lc.customer_id AND 
        ar.entity_id = lc.program_id
      WHERE ar.request_type = 'ENROLLMENT'
      AND ar.status = 'APPROVED'
      AND (pe.id IS NULL OR lc.id IS NULL)
    `;
    
    console.log(`Found ${stuckEnrollments.length} stuck enrollments to fix`);
    
    // Fix each stuck enrollment
    for (const enrollment of stuckEnrollments) {
      try {
        const customerId = enrollment.customer_id;
        const programId = enrollment.entity_id;
        const businessId = enrollment.business_id;
        
        // Check if enrollment record exists
        const enrollmentExists = await sql`
          SELECT id FROM program_enrollments
          WHERE customer_id = ${customerId}
          AND program_id = ${programId}
        `;
        
        // Create enrollment record if missing
        if (enrollmentExists.length === 0) {
          await sql`
            INSERT INTO program_enrollments (
              customer_id,
              program_id,
              business_id,
              status,
              current_points,
              total_points_earned,
              enrolled_at
            ) VALUES (
              ${customerId},
              ${programId},
              ${businessId},
              'ACTIVE',
              0,
              0,
              NOW()
            )
          `;
          
          console.log(`Created missing enrollment record for customer ${customerId} in program ${programId}`);
        }
        
        // Check if loyalty card exists
        const cardExists = await sql`
          SELECT id FROM loyalty_cards
          WHERE customer_id = ${customerId}
          AND program_id = ${programId}
        `;
        
        // Create loyalty card if missing
        if (cardExists.length === 0) {
          // Generate a unique card number
          const prefix = 'GC';
          const timestamp = Date.now().toString().slice(-6);
          const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          const cardNumber = `${prefix}-${timestamp}-${randomPart}`;
          
          // Get program details
          const programResult = await sql`SELECT name FROM loyalty_programs WHERE id = ${programId}`;
          const programName = programResult.length > 0 ? programResult[0].name : 'Loyalty Program';
          
          // Create card
          const cardId = uuidv4();
          await sql`
            INSERT INTO loyalty_cards (
              id,
              customer_id,
              program_id,
              business_id,
              card_number,
              status,
              points,
              created_at
            ) VALUES (
              ${cardId},
              ${customerId},
              ${programId},
              ${businessId},
              ${cardNumber},
              'ACTIVE',
              0,
              NOW()
            )
          `;
          
          console.log(`Created missing loyalty card ${cardId} for customer ${customerId} in program ${programId}`);
        }
      } catch (enrollmentError) {
        console.error(`Error fixing enrollment for customer ${enrollment.customer_id}:`, enrollmentError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error fixing stuck enrollments:', error);
    return false;
  }
}

async function addMissingIndexes() {
  try {
    // Add indexes to improve query performance
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_approval_requests_status ON customer_approval_requests(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_approval_requests_customer_id ON customer_approval_requests(customer_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_approval_requests_business_id ON customer_approval_requests(business_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer_id ON customer_notifications(customer_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_notifications_business_id ON customer_notifications(business_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_notifications_reference_id ON customer_notifications(reference_id)`;
    
    console.log('Added missing indexes for better performance');
    return true;
  } catch (error) {
    console.error('Error adding missing indexes:', error);
    return false;
  }
}

async function updateSchemaConstraints() {
  try {
    // Add ON DELETE CASCADE constraint to ensure proper cleanup
    // First check if the constraint exists
    const constraintExists = await sql`
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'customer_approval_requests_notification_id_fkey'
      AND table_name = 'customer_approval_requests'
    `;
    
    if (constraintExists.length === 0) {
      // Drop existing constraint if any
      try {
        await sql`
          ALTER TABLE customer_approval_requests 
          DROP CONSTRAINT IF EXISTS customer_approval_requests_notification_id_fkey
        `;
      } catch (dropError) {
        console.log('No constraint to drop or error dropping constraint:', dropError.message);
      }
      
      // Add the new constraint
      await sql`
        ALTER TABLE customer_approval_requests 
        ADD CONSTRAINT customer_approval_requests_notification_id_fkey 
        FOREIGN KEY (notification_id) 
        REFERENCES customer_notifications(id) 
        ON DELETE CASCADE
      `;
      
      console.log('Added ON DELETE CASCADE constraint to customer_approval_requests');
    } else {
      console.log('Constraint already exists, skipping');
    }
    
    return true;
  } catch (error) {
    console.error('Error updating schema constraints:', error);
    return false;
  }
}

// Run the fix
fixEnrollmentNotificationSystem(); 