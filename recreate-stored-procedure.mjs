#!/usr/bin/env node

/**
 * Recreate Stored Procedure
 * This script recreates the process_enrollment_approval stored procedure
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

async function recreateStoredProcedure() {
  try {
    console.log('Recreating stored procedure...');
    
    // Drop the existing function
    await sql`DROP FUNCTION IF EXISTS process_enrollment_approval(uuid, boolean)`;
    console.log('✅ Dropped existing function');
    
    // Create the new function
    await sql`
      CREATE OR REPLACE FUNCTION process_enrollment_approval(request_id UUID, is_approved BOOLEAN)
      RETURNS TEXT AS $$
              DECLARE
          customer_id_val INTEGER;
          business_id_val INTEGER;
          program_id_val TEXT;
          notification_id_val UUID;
          enrollment_exists BOOLEAN;
          card_id_val TEXT;
          card_exists BOOLEAN;
          card_number_val TEXT;
          program_name_val TEXT;
          business_name_val TEXT;
          customer_name_val TEXT;
          enrollment_id_val INTEGER;
          existing_notification UUID;
          actual_customer_id INTEGER;
      BEGIN
        -- Update the approval request status
        UPDATE customer_approval_requests
      SET status = CASE WHEN is_approved THEN 'APPROVED' ELSE 'REJECTED' END,
          response_at = NOW()
      WHERE id = request_id
      RETURNING customer_id, business_id, entity_id, notification_id INTO customer_id_val, business_id_val, program_id_val, notification_id_val;
      
                -- If customer_id is null, the request wasn't found
          IF customer_id_val IS NULL THEN
            RAISE EXCEPTION 'Approval request not found: %', request_id;
          END IF;
          
          -- Get the actual customer ID from the customers table
          SELECT id INTO actual_customer_id FROM customers WHERE user_id = customer_id_val;
          IF actual_customer_id IS NULL THEN
            RAISE EXCEPTION 'Customer record not found for user %', customer_id_val;
          END IF;
      
      -- Get program and business names for better notifications
      SELECT name INTO program_name_val FROM loyalty_programs WHERE id = program_id_val::integer;
      IF program_name_val IS NULL THEN
        program_name_val := 'Unknown program';
        RAISE NOTICE 'Program name not found for %', program_id_val;
      END IF;
      
      SELECT name INTO business_name_val FROM users WHERE id = business_id_val;
      IF business_name_val IS NULL THEN
        business_name_val := 'Unknown business';
        RAISE NOTICE 'Business name not found for %', business_id_val;
      END IF;
      
      SELECT name INTO customer_name_val FROM users WHERE id = customer_id_val;
      IF customer_name_val IS NULL THEN
        customer_name_val := 'Unknown customer';
        RAISE NOTICE 'Customer name not found for %', customer_id_val;
      END IF;
      
      -- Mark notification as actioned
      UPDATE customer_notifications
      SET action_taken = TRUE,
          is_read = TRUE,
          read_at = NOW()
      WHERE id = notification_id_val;
      
      -- If not approved, just return null (no card created)
      IF NOT is_approved THEN
        RETURN NULL;
      END IF;
      
                          -- Check if already enrolled
          SELECT EXISTS (
            SELECT 1 FROM program_enrollments 
            WHERE customer_id = actual_customer_id 
            AND program_id = program_id_val::integer
          ) INTO enrollment_exists;
          
          IF enrollment_exists THEN
            -- Already enrolled, just update status if needed
            UPDATE program_enrollments
            SET status = 'ACTIVE'
            WHERE customer_id = actual_customer_id 
            AND program_id = program_id_val::integer 
            AND status != 'ACTIVE';
            
            -- Get the enrollment ID
            SELECT id INTO enrollment_id_val
            FROM program_enrollments
            WHERE customer_id = actual_customer_id 
            AND program_id = program_id_val::integer;
          ELSE
            -- Create enrollment record
            INSERT INTO program_enrollments (
              customer_id,
              program_id,
              status,
              current_points,
              enrolled_at
            ) VALUES (
              actual_customer_id,
              program_id_val::integer,
              'ACTIVE',
              0,
              NOW()
            ) RETURNING id INTO enrollment_id_val;
          END IF;
      
                        -- Let the triggers handle card creation
          -- Just get the card ID if it exists
          SELECT id::text INTO card_id_val
          FROM loyalty_cards
          WHERE customer_id = actual_customer_id
          AND program_id = program_id_val::integer
          LIMIT 1;
      
      -- Create notification for customer about their new card
      INSERT INTO customer_notifications (
        id,
        customer_id,
        business_id,
        type,
        title,
        message,
        data,
        requires_action,
        action_taken,
        is_read,
        created_at
      ) VALUES (
        gen_random_uuid(),
        customer_id_val,
        business_id_val,
        'CARD_CREATED',
        'Loyalty Card Created',
        'Your loyalty card for ' || COALESCE(program_name_val, 'the loyalty program') || 
        ' at ' || COALESCE(business_name_val, 'the business') || ' is ready',
        jsonb_build_object(
          'programId', program_id_val,
          'programName', program_name_val,
          'businessName', business_name_val,
          'cardId', card_id_val
        ),
        FALSE,
        FALSE,
        FALSE,
        NOW()
      );
      
      -- Double-check we have enrollments and cards
      IF enrollment_id_val IS NULL THEN
        RAISE EXCEPTION 'Failed to create or find enrollment record for customer % and program %', customer_id_val, program_id_val;
      END IF;
      
      IF card_id_val IS NULL THEN
        RAISE EXCEPTION 'Failed to create or find card record for customer % and program %', customer_id_val, program_id_val;
      END IF;
      
      -- Return the card ID
      RETURN card_id_val;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('✅ Created new stored procedure');
    
    // Test the function
    console.log('\nTesting the new function...');
    const testResult = await sql`SELECT process_enrollment_approval('00000000-0000-0000-0000-000000000000'::uuid, false)`;
    console.log('Test result:', testResult);
    
    console.log('\n✅ Stored procedure recreated successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error recreating stored procedure:', error);
    return false;
  } finally {
    await sql.end();
  }
}

// Run the script
recreateStoredProcedure()
  .then(() => {
    console.log('\nScript completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running script:', error);
    process.exit(1);
  });