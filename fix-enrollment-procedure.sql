-- Fix for enrollment approval stored procedure
-- This script adds proper transaction handling to the process_enrollment_approval function

-- Create or replace the function with transaction support
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
  -- Start transaction - we need this at the outer level to ensure consistency
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
    
    -- Mark notification as actioned - this is critical
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
    
    -- Verify enrollment was created - critical check
    IF enrollment_id_val IS NULL THEN
      RAISE EXCEPTION 'Failed to create or update enrollment record';
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
      
      -- Verify card was created - this is critical
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to create loyalty card';
      END IF;
    ELSE
      -- Get the existing card ID
      SELECT id INTO card_id_val
      FROM loyalty_cards
      WHERE customer_id = customer_id_val
      AND program_id = program_id_val
      LIMIT 1;
      
      -- If we didn't find a card ID, something is wrong with our check
      IF card_id_val IS NULL THEN
        RAISE EXCEPTION 'Card existence check failed. Data inconsistency detected.';
      END IF;
      
      -- Ensure the card is active
      UPDATE loyalty_cards
      SET is_active = true,
          status = 'ACTIVE',
          updated_at = NOW()
      WHERE id = card_id_val;
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
    
    -- Commit transaction
    COMMIT;
    
    -- Return the card ID
    RETURN card_id_val;
  EXCEPTION WHEN OTHERS THEN
    -- Rollback transaction on error
    ROLLBACK;
    -- Log error details
    RAISE NOTICE 'Error in process_enrollment_approval: %, SQLSTATE: %', SQLERRM, SQLSTATE;
    RAISE; -- Re-raise the exception after rollback
  END;
EXCEPTION WHEN OTHERS THEN
  -- Catch any errors that might occur outside the inner transaction block
  RAISE NOTICE 'Fatal error in process_enrollment_approval: %, SQLSTATE: %', SQLERRM, SQLSTATE;
  RAISE; -- Re-raise the exception
END;
$$ LANGUAGE plpgsql;

-- Create a function to fix stuck enrollments that might have been impacted previously
CREATE OR REPLACE FUNCTION fix_stuck_enrollments()
RETURNS TEXT AS $$
DECLARE
  fixed_enrollments INTEGER := 0;
  fixed_cards INTEGER := 0;
  enrollment RECORD;
BEGIN
  -- Loop through all program enrollments that don't have cards
  FOR enrollment IN 
    SELECT 
      pe.customer_id,
      pe.program_id,
      pe.business_id,
      pe.id as enrollment_id
    FROM program_enrollments pe
    LEFT JOIN loyalty_cards lc ON 
      pe.customer_id = lc.customer_id AND 
      pe.program_id = lc.program_id
    WHERE pe.status = 'ACTIVE'
    AND lc.id IS NULL
  LOOP
    BEGIN
      -- Create a card for this enrollment
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
        gen_random_uuid(),
        enrollment.customer_id,
        enrollment.program_id,
        enrollment.business_id,
        'GC-FIXED-' || to_char(NOW(), 'YYMMDD') || '-' || floor(random() * 10000)::TEXT,
        'ACTIVE',
        0,
        'STANDARD',
        'STANDARD',
        1.0,
        true,
        NOW(),
        NOW()
      );
      
      fixed_cards := fixed_cards + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error fixing card for enrollment %: %', enrollment.enrollment_id, SQLERRM;
    END;
  END LOOP;

  RETURN 'Fixed ' || fixed_cards::TEXT || ' missing loyalty cards';
END;
$$ LANGUAGE plpgsql;
