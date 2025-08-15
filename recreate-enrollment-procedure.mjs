import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.VITE_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ VITE_DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('Database URL found: Yes');

const sql = postgres(databaseUrl);

async function recreateEnrollmentProcedure() {
  try {
    console.log('🔄 Recreating process_enrollment_approval stored procedure...');
    
    // Drop the existing function first
    await sql`DROP FUNCTION IF EXISTS process_enrollment_approval(UUID, BOOLEAN)`;
    console.log('✅ Dropped existing function');
    
    // Create the new function with fixed transaction structure
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
        
        -- Create a notification for the business about the customer's decision
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
          business_id_val,
          business_id_val,
          CASE WHEN is_approved THEN 'ENROLLMENT_ACCEPTED' ELSE 'ENROLLMENT_REJECTED' END,
          CASE WHEN is_approved THEN 'Customer Joined Program' ELSE 'Enrollment Declined' END,
          CASE WHEN is_approved 
              THEN COALESCE(customer_name_val, 'A customer') || ' has joined your ' || COALESCE(program_name_val, 'loyalty program')
              ELSE COALESCE(customer_name_val, 'A customer') || ' has declined to join your ' || COALESCE(program_name_val, 'loyalty program')
          END,
          jsonb_build_object(
            'programId', program_id_val,
            'programName', program_name_val,
            'customerId', customer_id_val,
            'approved', is_approved
          ),
          FALSE,
          FALSE,
          FALSE,
          NOW()
        );
        
        -- Create or update customer-business relationship regardless of approval decision
        -- For both approved and declined enrollments, we want to track the relationship
        -- Note: This table may not exist, so we'll handle it gracefully
        BEGIN
          INSERT INTO customer_business_relationships (
            customer_id,
            business_id,
            status,
            created_at
          ) VALUES (
            customer_id_val::text,
            business_id_val::text,
            CASE WHEN is_approved THEN 'ACTIVE' ELSE 'DECLINED' END,
            NOW()
          )
          ON CONFLICT (customer_id, business_id) 
          DO UPDATE SET 
            status = CASE WHEN is_approved THEN 'ACTIVE' ELSE 'DECLINED' END;
        EXCEPTION WHEN OTHERS THEN
          -- Table doesn't exist or other error, continue execution
          RAISE NOTICE 'Customer business relationships table not available, continuing...';
        END;
        
        -- Create a notification for the customer about their decision
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
          CASE WHEN is_approved THEN 'ENROLLMENT_SUCCESS' ELSE 'ENROLLMENT_DECLINED' END,
          CASE WHEN is_approved THEN 'Enrollment Success' ELSE 'Enrollment Declined' END,
          CASE WHEN is_approved 
              THEN 'You have been enrolled in ' || COALESCE(program_name_val, 'the loyalty program')
              ELSE 'You declined to join ' || COALESCE(program_name_val, 'the loyalty program')
          END,
          jsonb_build_object(
            'programId', program_id_val,
            'programName', program_name_val,
            'businessName', business_name_val
          ),
          FALSE,
          TRUE,
          FALSE,
          NOW()
        );
        
        -- If not approved, just return null (no card created)
        IF NOT is_approved THEN
          RETURN NULL;
        END IF;
        
        -- Get the actual customer ID from the customers table
        SELECT id INTO actual_customer_id FROM customers WHERE user_id = customer_id_val;
        IF actual_customer_id IS NULL THEN
          RAISE EXCEPTION 'Customer record not found for user %', customer_id_val;
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
          AND status != 'ACTIVE'
          RETURNING id INTO enrollment_id_val;
          
          -- If no rows were updated, get the existing enrollment ID
          IF enrollment_id_val IS NULL THEN
            SELECT id INTO enrollment_id_val FROM program_enrollments 
            WHERE customer_id = actual_customer_id 
            AND program_id = program_id_val::integer;
          END IF;
        ELSE
          -- Create enrollment record
          INSERT INTO program_enrollments (
            customer_id,
            program_id,
            current_points,
            last_activity,
            enrolled_at,
            status
          ) VALUES (
            actual_customer_id,
            program_id_val::integer,
            0,
            NOW(),
            NOW(),
            'ACTIVE'
          ) RETURNING id INTO enrollment_id_val;
        END IF;
        
        -- Check if card exists
        SELECT EXISTS (
          SELECT 1 FROM loyalty_cards
          WHERE customer_id = actual_customer_id
          AND program_id = program_id_val::integer
        ) INTO card_exists;
        
        -- Create card if it doesn't exist
        IF NOT card_exists THEN
          -- Generate a unique card number with timestamp and random component
          card_number_val := 'GC-' || to_char(NOW(), 'YYMMDD-HH24MISS') || '-' || floor(random() * 10000)::TEXT;
          
          -- Create the card
          INSERT INTO loyalty_cards (
            customer_id,
            program_id,
            business_id,
            card_number,
            card_type,
            status,
            points,
            tier,
            points_multiplier,
            is_active,
            created_at,
            updated_at
          ) VALUES (
            actual_customer_id,
            program_id_val::integer,
            business_id_val,
            card_number_val,
            'STANDARD',
            'ACTIVE',
            0,
            'STANDARD',
            1.0,
            true,
            NOW(),
            NOW()
          ) RETURNING id INTO card_id_val;
        ELSE
          -- Get the existing card ID
          SELECT id::text INTO card_id_val
          FROM loyalty_cards
          WHERE customer_id = actual_customer_id
          AND program_id = program_id_val::integer
          LIMIT 1;
        END IF;
        
        -- Check if we already sent a card notification for this program
        SELECT id INTO existing_notification 
        FROM customer_notifications 
        WHERE customer_id = customer_id_val 
        AND type = 'CARD_CREATED'
        AND data->>'programId' = program_id_val
        LIMIT 1;
        
        -- Only create card notification if we haven't already
        IF existing_notification IS NULL THEN
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
        END IF;
        
        -- Double-check we have enrollments and cards
        IF enrollment_id_val IS NULL THEN
          RAISE EXCEPTION 'Failed to create or find enrollment record for customer % and program %', actual_customer_id, program_id_val;
        END IF;
        
        IF card_id_val IS NULL THEN
          RAISE EXCEPTION 'Failed to create or find card record for customer % and program %', actual_customer_id, program_id_val;
        END IF;
        
        -- Ensure we have a valid card ID before returning
        IF card_id_val IS NULL OR card_id_val = '' THEN
          RAISE EXCEPTION 'Card ID is null or empty after creation for customer % and program %', actual_customer_id, program_id_val;
        END IF;
        
        -- Return the card ID as a string for better compatibility
        RETURN card_id_val;
      EXCEPTION WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE NOTICE 'Error in process_enrollment_approval: %', SQLERRM;
        RAISE;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('✅ Successfully recreated process_enrollment_approval function');
    
    // Test the function
    console.log('🧪 Testing the function...');
    const testResult = await sql`SELECT process_enrollment_approval('00000000-0000-0000-0000-000000000000'::uuid, false)`;
    console.log('✅ Function test successful:', testResult);
    
  } catch (error) {
    console.error('❌ Error recreating enrollment procedure:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the recreation
recreateEnrollmentProcedure()
  .then(() => {
    console.log('🎉 Enrollment procedure recreation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to recreate enrollment procedure:', error);
    process.exit(1);
  });