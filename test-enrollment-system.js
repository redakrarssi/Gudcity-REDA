// Simple test script to verify enrollment system fix
import pkg from 'postgres-pool';
const { createPool } = pkg;
import { v4 as uuidv4 } from 'uuid';

// Database connection
const sql = createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gudcity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 10
});

// Create or update the enrollment stored procedure
async function ensureEnrollmentProcedureExists() {
  try {
    // Check if the function exists
    const functionExists = await sql.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'process_enrollment_approval'
      );
    `);
    
    if (functionExists.rows[0] && functionExists.rows[0].exists === true) {
      console.log('✓ Enrollment procedure already exists');
      return true;
    }
    
    // Create the function if it doesn't exist
    await sql.query(`
      CREATE OR REPLACE FUNCTION process_enrollment_approval(request_id UUID, is_approved BOOLEAN)
      RETURNS UUID AS $$
      DECLARE
        customer_id_val INTEGER;
        business_id_val INTEGER;
        program_id_val TEXT;
        notification_id_val UUID;
        enrollment_exists BOOLEAN;
        card_id_val UUID;
        card_exists BOOLEAN;
        card_number_val TEXT;
        program_name_val TEXT;
        business_name_val TEXT;
        customer_name_val TEXT;
        enrollment_id_val INTEGER;
        existing_notification UUID;
      BEGIN
        -- Start an explicit transaction
        BEGIN
          -- Update the approval request status
          UPDATE customer_approval_requests
          SET status = CASE WHEN is_approved THEN 'APPROVED' ELSE 'REJECTED' END,
              responded_at = NOW(),
              updated_at = NOW()
          WHERE id = request_id
          RETURNING customer_id, business_id, entity_id, notification_id INTO customer_id_val, business_id_val, program_id_val, notification_id_val;
          
          -- If customer_id is null, the request wasn't found
          IF customer_id_val IS NULL THEN
            RAISE EXCEPTION 'Approval request not found: %', request_id;
          END IF;
          
          -- Get program and business names for better notifications
          SELECT name INTO program_name_val FROM loyalty_programs WHERE id = program_id_val::uuid;
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
          INSERT INTO customer_business_relationships (
            customer_id,
            business_id,
            status,
            created_at,
            updated_at
          ) VALUES (
            customer_id_val::text,
            business_id_val::text,
            CASE WHEN is_approved THEN 'ACTIVE' ELSE 'DECLINED' END,
            NOW(),
            NOW()
          )
          ON CONFLICT (customer_id, business_id) 
          DO UPDATE SET 
            status = CASE WHEN is_approved THEN 'ACTIVE' ELSE 'DECLINED' END,
            updated_at = NOW();
          
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
            -- Commit transaction
            COMMIT;
            RETURN NULL;
          END IF;
          
          -- Check if already enrolled
          SELECT EXISTS (
            SELECT 1 FROM program_enrollments 
            WHERE customer_id = customer_id_val 
            AND program_id = program_id_val
          ) INTO enrollment_exists;
          
          IF enrollment_exists THEN
            -- Already enrolled, just update status if needed
            UPDATE program_enrollments
            SET status = 'ACTIVE', 
                updated_at = NOW()
            WHERE customer_id = customer_id_val 
            AND program_id = program_id_val 
            AND status != 'ACTIVE'
            RETURNING id INTO enrollment_id_val;
          ELSE
            -- Create enrollment record
            INSERT INTO program_enrollments (
              customer_id,
              program_id,
              business_id,
              status,
              current_points,
              total_points_earned,
              enrolled_at
            ) VALUES (
              customer_id_val,
              program_id_val,
              business_id_val,
              'ACTIVE',
              0,
              0,
              NOW()
            ) RETURNING id INTO enrollment_id_val;
          END IF;
          
          -- Check if card exists
          SELECT EXISTS (
            SELECT 1 FROM loyalty_cards
            WHERE customer_id = customer_id_val
            AND program_id = program_id_val
          ) INTO card_exists;
          
          -- Create card if it doesn't exist
          IF NOT card_exists THEN
            -- Generate a unique card number with timestamp and random component
            card_number_val := 'GC-' || to_char(NOW(), 'YYMMDD-HH24MISS') || '-' || floor(random() * 10000)::TEXT;
            
            -- Generate a new UUID for the card
            card_id_val := gen_random_uuid();
            
            -- Create the card
            INSERT INTO loyalty_cards (
              id,
              customer_id,
              program_id,
              business_id,
              card_number,
              status,
              points,
              card_type,
              tier,
              points_multiplier,
              is_active,
              created_at,
              updated_at
            ) VALUES (
              card_id_val,
              customer_id_val,
              program_id_val,
              business_id_val,
              card_number_val,
              'ACTIVE',
              0,
              'STANDARD',
              'STANDARD',
              1.0,
              true,
              NOW(),
              NOW()
            );
          ELSE
            -- Get the existing card ID
            SELECT id INTO card_id_val
            FROM loyalty_cards
            WHERE customer_id = customer_id_val
            AND program_id = program_id_val
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
            RAISE EXCEPTION 'Failed to create or find enrollment record for customer % and program %', customer_id_val, program_id_val;
          END IF;
          
          IF card_id_val IS NULL THEN
            RAISE EXCEPTION 'Failed to create or find card record for customer % and program %', customer_id_val, program_id_val;
          END IF;
          
          -- Commit transaction
          COMMIT;
          
          -- Return the card ID
          RETURN card_id_val;
        EXCEPTION WHEN OTHERS THEN
          -- Rollback transaction on error
          ROLLBACK;
          RAISE;
        END;
      EXCEPTION WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE NOTICE 'Error in process_enrollment_approval: %', SQLERRM;
        RAISE;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✓ Created enrollment procedure successfully');
    return true;
  } catch (error) {
    console.error('✗ Failed to create enrollment procedure:', error);
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
      await sql.query(`
        DELETE FROM program_enrollments 
        WHERE customer_id = $1 AND program_id = $2
      `, [customerId, programId]);
      
      // Delete any existing card
      await sql.query(`
        DELETE FROM loyalty_cards
        WHERE customer_id = $1 AND program_id = $2
      `, [customerId, programId]);
      
      console.log('✓ Test environment prepared. Previous enrollments and cards removed.');
    } catch (cleanupError) {
      console.warn('⚠ Warning during cleanup:', cleanupError.message);
      // Continue with test even if cleanup fails
    }
    
    // 2. Create an enrollment request
    console.log('Creating enrollment request...');
    const notificationId = uuidv4();
    const requestId = uuidv4();
    
    // Create the notification
    await sql.query(`
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
        $1, $2, $3, 'ENROLLMENT_REQUEST', 'Program Enrollment Request',
        'A business would like to enroll you in their loyalty program',
        TRUE, FALSE, FALSE, NOW(), $4
      )
    `, [notificationId, customerId, businessId, programId]);
    
    // Create the approval request
    await sql.query(`
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
        $1, $2, $3, $4, 'ENROLLMENT', $5, 'PENDING', NOW(),
        '{"programName": "Test Program", "businessName": "Test Business"}'
      )
    `, [requestId, notificationId, customerId, businessId, programId]);
    
    console.log(`✓ Created enrollment request with ID: ${requestId}`);
    
    // 3. Process the approval
    console.log('Approving enrollment...');
    const cardResult = await sql.query(`
      SELECT process_enrollment_approval($1::uuid, TRUE)
    `, [requestId]);
    
    const cardId = cardResult.rows[0].process_enrollment_approval;
    console.log(`✓ Approval processed with card ID: ${cardId || 'No card created'}`);
    
    // 4. Verify enrollment record exists
    console.log('Verifying enrollment...');
    const enrollment = await sql.query(`
      SELECT id, status, current_points FROM program_enrollments
      WHERE customer_id = $1 AND program_id = $2
    `, [customerId, programId]);
    
    if (enrollment.rows.length === 0) {
      throw new Error('❌ Enrollment record not found after approval');
    }
    
    console.log('✓ Enrollment record verified:', {
      id: enrollment.rows[0].id,
      status: enrollment.rows[0].status,
      points: enrollment.rows[0].current_points
    });
    
    // 5. Verify card record exists
    console.log('Verifying loyalty card...');
    const card = await sql.query(`
      SELECT id, card_number, status, points FROM loyalty_cards
      WHERE customer_id = $1 AND program_id = $2
    `, [customerId, programId]);
    
    if (card.rows.length === 0) {
      throw new Error('❌ Card record not found after approval');
    }
    
    console.log('✓ Loyalty card verified:', {
      id: card.rows[0].id,
      cardNumber: card.rows[0].card_number,
      status: card.rows[0].status,
      points: card.rows[0].points
    });
    
    // 6. Verify notifications created
    console.log('Verifying notifications...');
    const notifications = await sql.query(`
      SELECT type, title, action_taken, is_read
      FROM customer_notifications
      WHERE (customer_id = $1 OR customer_id = $2)
      AND created_at > (NOW() - INTERVAL '5 minutes')
      ORDER BY created_at DESC
    `, [customerId, businessId]);
    
    console.log(`✓ Found ${notifications.rows.length} recent notifications`);
    notifications.rows.forEach((notification, i) => {
      console.log(`  ${i+1}. ${notification.type}: ${notification.title} (read: ${notification.is_read}, actioned: ${notification.action_taken})`);
    });
    
    // 7. Verify customer-business relationship
    console.log('Verifying customer-business relationship...');
    const relationship = await sql.query(`
      SELECT status, created_at, updated_at
      FROM customer_business_relationships
      WHERE customer_id = $1 AND business_id = $2
    `, [`${customerId}`, `${businessId}`]);
    
    if (relationship.rows.length === 0) {
      throw new Error('❌ Customer-business relationship not found');
    }
    
    console.log('✓ Relationship verified:', {
      status: relationship.rows[0].status
    });
    
    console.log('✅ Full enrollment flow test completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in full enrollment flow test:', error);
    throw error;
  }
}

// Main test function
async function runTests() {
  try {
    console.log('=== Starting enrollment system test ===');
    
    // Make sure the stored procedure exists
    await ensureEnrollmentProcedureExists();
    
    // Test data - use appropriate values for your database
    const customerId = 4;
    const businessId = 1; 
    const programId = '6f47ce2a-447a-41bb-986c-283492644bf9';
    
    // Run full enrollment flow test
    console.log('\n=== TEST: End-to-End Enrollment Flow ===');
    await testFullEnrollmentFlow(customerId, businessId, programId);
    
    console.log('\n🎉 All tests completed successfully! 🎉');
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

// Run the tests
runTests(); 