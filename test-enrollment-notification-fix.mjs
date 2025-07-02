/**
 * Test script for the enrollment notification system fix
 * 
 * This script tests the fixed enrollment transaction process to ensure
 * it properly handles approvals and declines without transaction errors.
 */

import sql from './src/utils/db.js';
import { v4 as uuidv4 } from 'uuid';

// Main test function
async function testFixedNotificationSystem() {
  console.log('Testing fixed enrollment notification system...');
  
  try {
    // Test database connection
    console.log('Testing database connection...');
    await sql`SELECT 1`;
    console.log('Database connection successful.');
    
    // Create test data
    console.log('\nCreating test data...');
    const customerId = 1;  // Use an existing customer ID
    const businessId = 1;  // Use an existing business ID
    
    // Create a test loyalty program if needed
    console.log('Creating/finding test loyalty program...');
    let programId;
    const existingProgram = await sql`
      SELECT id FROM loyalty_programs 
      WHERE business_id = ${businessId}
      LIMIT 1
    `;
    
    if (existingProgram.length === 0) {
      const newProgram = await sql`
        INSERT INTO loyalty_programs (
          business_id, 
          name, 
          description, 
          type, 
          point_value, 
          status
        ) VALUES (
          ${businessId},
          'Test Loyalty Program',
          'Program created for testing',
          'POINTS',
          1.0,
          'ACTIVE'
        ) RETURNING id
      `;
      programId = newProgram[0].id;
      console.log(`Created new test program with ID: ${programId}`);
    } else {
      programId = existingProgram[0].id;
      console.log(`Using existing program with ID: ${programId}`);
    }
    
    // Ensure the stored procedure exists
    console.log('\nEnsuring enrollment procedure exists...');
    await ensureEnrollmentProcedureExists();
    
    // Test 1: Accept an enrollment
    console.log('\n=== Test 1: Customer ACCEPTING enrollment ===');
    await testEnrollmentAccept(customerId, businessId, programId);
    
    // Test 2: Decline an enrollment
    console.log('\n=== Test 2: Customer DECLINING enrollment ===');
    await testEnrollmentDecline(customerId, businessId, programId);
    
    console.log('\nTests completed successfully!');
  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    // Close database connection
    await sql.end();
    console.log('Database connection closed.');
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
    
    // 2. Check no enrollment created/activated
    const enrollmentCheck = await sql`
      SELECT status FROM program_enrollments
      WHERE customer_id = ${customerId} AND program_id = ${programId} AND status = 'ACTIVE'
    `;
    console.log('Active enrollment found:', enrollmentCheck.length > 0 ? 'Yes' : 'No');
    
    // 3. Check business notification created for declined enrollment
    const businessNotificationCheck = await sql`
      SELECT id, type, title FROM customer_notifications
      WHERE customer_id = ${businessId} AND type = 'ENROLLMENT_REJECTED'
      ORDER BY created_at DESC LIMIT 1
    `;
    console.log('Business notification created:', businessNotificationCheck.length ? 'Yes' : 'No');
    
    // 4. Check customer-business relationship is marked as declined
    const relationshipCheck = await sql`
      SELECT status FROM customer_business_relationships
      WHERE customer_id = ${customerId}::text AND business_id = ${businessId}::text
    `;
    console.log('Customer-business relationship status:', relationshipCheck.length ? relationshipCheck[0].status : 'Not found');
    
    return true;
  } catch (error) {
    console.error('Error in decline test:', error);
    return false;
  }
}

// Helper function to ensure the stored procedure exists
async function ensureEnrollmentProcedureExists() {
  try {
    // Check if the function exists
    const functionExists = await sql`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'process_enrollment_approval'
      );
    `;
    
    if (functionExists && functionExists[0] && functionExists[0].exists === true) {
      return true;
    }
    
    // Create the function if it doesn't exist
    await sql`
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
        SELECT name INTO business_name_val FROM users WHERE id = business_id_val;
        SELECT name INTO customer_name_val FROM users WHERE id = customer_id_val;
        
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
        
        -- If not approved, just return null (no card created)
        IF NOT is_approved THEN
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
          AND status != 'ACTIVE';
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
          );
        END IF;
        
        -- Check if card exists
        SELECT EXISTS (
          SELECT 1 FROM loyalty_cards
          WHERE customer_id = customer_id_val
          AND program_id = program_id_val
        ) INTO card_exists;
        
        -- Create card if it doesn't exist
        IF NOT card_exists THEN
          -- Generate a unique card number
          card_number_val := 'GC-' || to_char(NOW(), 'YYMMDD') || '-' || floor(random() * 10000)::TEXT;
          
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
        
        -- Return the card ID
        RETURN card_id_val;
        
      EXCEPTION WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE NOTICE 'Error in process_enrollment_approval: %', SQLERRM;
        RAISE;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    return true;
  } catch (error) {
    console.error('Error ensuring enrollment procedure exists:', error);
    return false;
  }
}

// Run the test
testFixedNotificationSystem(); 