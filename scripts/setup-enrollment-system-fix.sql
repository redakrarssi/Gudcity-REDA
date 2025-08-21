-- Comprehensive Enrollment System Fix Database Setup Script
-- This script applies all the necessary fixes for the Customer Enrollment System

-- 1. Create the enhanced enrollment approval function
CREATE OR REPLACE FUNCTION process_enrollment_approval_enhanced(
  request_id UUID, 
  is_approved BOOLEAN
) RETURNS UUID AS $$
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
  transaction_start TIMESTAMP;
BEGIN
  -- Record transaction start time for debugging
  transaction_start := NOW();
  
  -- Start transaction - critical for ACID compliance
  BEGIN
    -- Update the approval request status with proper error handling
    UPDATE customer_approval_requests
    SET status = CASE WHEN is_approved THEN 'APPROVED' ELSE 'REJECTED' END,
        responded_at = NOW(),
        updated_at = NOW()
    WHERE id = request_id
    RETURNING customer_id, business_id, entity_id, notification_id 
    INTO customer_id_val, business_id_val, program_id_val, notification_id_val;
    
    -- Validate request was found
    IF customer_id_val IS NULL THEN
      RAISE EXCEPTION 'Approval request not found: %', request_id;
    END IF;
    
    -- Get program and business names with null safety
    SELECT COALESCE(name, 'Unknown Program') INTO program_name_val 
    FROM loyalty_programs WHERE id = program_id_val::uuid;
    
    SELECT COALESCE(name, 'Unknown Business') INTO business_name_val 
    FROM users WHERE id = business_id_val;
    
    SELECT COALESCE(name, 'Unknown Customer') INTO customer_name_val 
    FROM users WHERE id = customer_id_val;
    
    -- Mark notification as actioned immediately
    UPDATE customer_notifications
    SET action_taken = TRUE,
        is_read = TRUE,
        read_at = NOW(),
        updated_at = NOW()
    WHERE id = notification_id_val;
    
    -- Create business notification about customer decision
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
           THEN customer_name_val || ' has joined your ' || program_name_val
           ELSE customer_name_val || ' has declined to join your ' || program_name_val
      END,
      jsonb_build_object(
        'programId', program_id_val,
        'programName', program_name_val,
        'customerId', customer_id_val,
        'customerName', customer_name_val,
        'approved', is_approved,
        'timestamp', NOW().toISOString()
      ),
      FALSE,
      FALSE,
      FALSE,
      NOW()
    );
    
    -- Update customer-business relationship
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
    
    -- If not approved, commit and return early
    IF NOT is_approved THEN
      COMMIT;
      RETURN NULL;
    END IF;
    
    -- Check existing enrollment
    SELECT EXISTS (
      SELECT 1 FROM program_enrollments 
      WHERE customer_id = customer_id_val 
      AND program_id = program_id_val
    ) INTO enrollment_exists;
    
    -- Create or update enrollment
    IF enrollment_exists THEN
      UPDATE program_enrollments
      SET status = 'ACTIVE', 
          updated_at = NOW()
      WHERE customer_id = customer_id_val 
      AND program_id = program_id_val 
      AND status != 'ACTIVE'
      RETURNING id INTO enrollment_id_val;
      
      -- If no rows updated, get existing enrollment ID
      IF enrollment_id_val IS NULL THEN
        SELECT id INTO enrollment_id_val
        FROM program_enrollments
        WHERE customer_id = customer_id_val 
        AND program_id = program_id_val;
      END IF;
    ELSE
      INSERT INTO program_enrollments (
        customer_id,
        program_id,
        business_id,
        status,
        current_points,
        total_points_earned,
        enrolled_at,
        created_at,
        updated_at
      ) VALUES (
        customer_id_val,
        program_id_val,
        business_id_val,
        'ACTIVE',
        0,
        0,
        NOW(),
        NOW(),
        NOW()
      ) RETURNING id INTO enrollment_id_val;
    END IF;
    
    -- Verify enrollment was created
    IF enrollment_id_val IS NULL THEN
      RAISE EXCEPTION 'Failed to create or update enrollment record';
    END IF;
    
    -- Check for existing card
    SELECT EXISTS (
      SELECT 1 FROM loyalty_cards
      WHERE customer_id = customer_id_val
      AND program_id = program_id_val
    ) INTO card_exists;
    
    -- Create card if it doesn't exist
    IF NOT card_exists THEN
      -- Generate unique card number
      card_number_val := 'GC-' || to_char(NOW(), 'YYMMDD-HH24MISS') || '-' || floor(random() * 10000)::TEXT;
      card_id_val := gen_random_uuid();
      
      INSERT INTO loyalty_cards (
        id,
        customer_id,
        program_id,
        business_id,
        card_number,
        status,
        points,
        points_balance,
        total_points_earned,
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
        0,
        0,
        'STANDARD',
        'STANDARD',
        1.0,
        true,
        NOW(),
        NOW()
      );
      
      -- Verify card creation
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to create loyalty card';
      END IF;
    ELSE
      -- Get existing card ID and ensure it's active
      SELECT id INTO card_id_val
      FROM loyalty_cards
      WHERE customer_id = customer_id_val
      AND program_id = program_id_val
      LIMIT 1;
      
      IF card_id_val IS NULL THEN
        RAISE EXCEPTION 'Card existence check failed. Data inconsistency detected.';
      END IF;
      
      -- Ensure card is active
      UPDATE loyalty_cards
      SET is_active = true,
          status = 'ACTIVE',
          updated_at = NOW()
      WHERE id = card_id_val;
    END IF;
    
    -- Create success notification for customer
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
      'Your loyalty card for ' || program_name_val || ' at ' || business_name_val || ' is ready!',
      jsonb_build_object(
        'programId', program_id_val,
        'programName', program_name_val,
        'businessName', business_name_val,
        'cardId', card_id_val,
        'cardNumber', card_number_val,
        'timestamp', NOW().toISOString()
      ),
      FALSE,
      FALSE,
      FALSE,
      NOW()
    );
    
    -- Log successful transaction
    RAISE NOTICE 'Enrollment approval processed successfully in % ms', 
      EXTRACT(EPOCH FROM (NOW() - transaction_start)) * 1000;
    
    -- Commit transaction
    COMMIT;
    
    -- Return the card ID
    RETURN card_id_val;
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback transaction on any error
    ROLLBACK;
    
    -- Log detailed error information
    RAISE NOTICE 'Error in process_enrollment_approval_enhanced: %, SQLSTATE: %, Duration: % ms', 
      SQLERRM, SQLSTATE, EXTRACT(EPOCH FROM (NOW() - transaction_start)) * 1000;
    
    -- Re-raise the exception
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

-- 2. Create function to fix orphaned enrollments and missing cards
CREATE OR REPLACE FUNCTION fix_enrollment_inconsistencies()
RETURNS TEXT AS $$
DECLARE
  fixed_enrollments INTEGER := 0;
  fixed_cards INTEGER := 0;
  enrollment RECORD;
  card_id_val UUID;
  card_number_val TEXT;
BEGIN
  -- Fix enrollments without cards
  FOR enrollment IN 
    SELECT 
      pe.customer_id,
      pe.program_id,
      pe.business_id,
      pe.id as enrollment_id,
      pe.status
    FROM program_enrollments pe
    LEFT JOIN loyalty_cards lc ON 
      pe.customer_id = lc.customer_id AND 
      pe.program_id = lc.program_id
    WHERE pe.status = 'ACTIVE'
    AND lc.id IS NULL
  LOOP
    BEGIN
      -- Generate unique card number
      card_number_val := 'GC-FIXED-' || to_char(NOW(), 'YYMMDD') || '-' || floor(random() * 10000)::TEXT;
      card_id_val := gen_random_uuid();
      
      -- Create missing card
      INSERT INTO loyalty_cards (
        id,
        customer_id,
        program_id,
        business_id,
        card_number,
        status,
        points,
        points_balance,
        total_points_earned,
        card_type,
        tier,
        points_multiplier,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        card_id_val,
        enrollment.customer_id,
        enrollment.program_id,
        enrollment.business_id,
        card_number_val,
        'ACTIVE',
        0,
        0,
        0,
        'STANDARD',
        'STANDARD',
        1.0,
        true,
        NOW(),
        NOW()
      );
      
      fixed_cards := fixed_cards + 1;
      
      RAISE NOTICE 'Fixed missing card for enrollment %: Card ID %', enrollment.enrollment_id, card_id_val;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error fixing card for enrollment %: %', enrollment.enrollment_id, SQLERRM;
    END;
  END LOOP;

  -- Fix cards without enrollments
  FOR enrollment IN 
    SELECT 
      lc.customer_id,
      lc.program_id,
      lc.business_id,
      lc.id as card_id
    FROM loyalty_cards lc
    LEFT JOIN program_enrollments pe ON 
      lc.customer_id = pe.customer_id AND 
      lc.program_id = pe.program_id
    WHERE lc.is_active = true
    AND pe.id IS NULL
  LOOP
    BEGIN
      -- Create missing enrollment
      INSERT INTO program_enrollments (
        customer_id,
        program_id,
        business_id,
        status,
        current_points,
        total_points_earned,
        enrolled_at,
        created_at,
        updated_at
      ) VALUES (
        enrollment.customer_id,
        enrollment.program_id,
        enrollment.business_id,
        'ACTIVE',
        0,
        0,
        NOW(),
        NOW(),
        NOW()
      );
      
      fixed_enrollments := fixed_enrollments + 1;
      
      RAISE NOTICE 'Fixed missing enrollment for card %: Card ID %', enrollment.card_id, enrollment.card_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error fixing enrollment for card %: %', enrollment.card_id, SQLERRM;
    END;
  END LOOP;

  RETURN 'Fixed ' || fixed_cards::TEXT || ' missing loyalty cards and ' || fixed_enrollments::TEXT || ' missing enrollments';
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to clean up stale notifications
CREATE OR REPLACE FUNCTION cleanup_stale_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete notifications older than 30 days that are marked as read and actioned
  DELETE FROM customer_notifications
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND is_read = true
  AND action_taken = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to validate enrollment data integrity
CREATE OR REPLACE FUNCTION validate_enrollment_integrity()
RETURNS TABLE(
  issue_type TEXT,
  customer_id INTEGER,
  program_id TEXT,
  business_id INTEGER,
  details TEXT
) AS $$
BEGIN
  -- Check for enrollments without cards
  RETURN QUERY
  SELECT 
    'MISSING_CARD'::TEXT,
    pe.customer_id,
    pe.program_id,
    pe.business_id,
    'Enrollment exists but no loyalty card found'::TEXT
  FROM program_enrollments pe
  LEFT JOIN loyalty_cards lc ON 
    pe.customer_id = lc.customer_id AND 
    pe.program_id = lc.program_id
  WHERE pe.status = 'ACTIVE'
  AND lc.id IS NULL;
  
  -- Check for cards without enrollments
  RETURN QUERY
  SELECT 
    'MISSING_ENROLLMENT'::TEXT,
    lc.customer_id,
    lc.program_id,
    lc.business_id,
    'Loyalty card exists but no enrollment found'::TEXT
  FROM loyalty_cards lc
  LEFT JOIN program_enrollments pe ON 
    lc.customer_id = pe.customer_id AND 
    lc.program_id = pe.program_id
  WHERE lc.is_active = true
  AND pe.id IS NULL;
  
  -- Check for orphaned approval requests
  RETURN QUERY
  SELECT 
    'ORPHANED_APPROVAL_REQUEST'::TEXT,
    ar.customer_id,
    ar.entity_id,
    ar.business_id,
    'Approval request exists but no notification found'::TEXT
  FROM customer_approval_requests ar
  LEFT JOIN customer_notifications n ON ar.notification_id = n.id
  WHERE n.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_program_enrollments_customer_program 
ON program_enrollments(customer_id, program_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_cards_customer_program 
ON loyalty_cards(customer_id, program_id);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer_business 
ON customer_notifications(customer_id, business_id);

CREATE INDEX IF NOT EXISTS idx_customer_approval_requests_customer_business 
ON customer_approval_requests(customer_id, business_id);

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION process_enrollment_approval_enhanced(UUID, BOOLEAN) TO PUBLIC;
GRANT EXECUTE ON FUNCTION fix_enrollment_inconsistencies() TO PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_stale_notifications() TO PUBLIC;
GRANT EXECUTE ON FUNCTION validate_enrollment_integrity() TO PUBLIC;

-- 7. Run initial data consistency check and fix
SELECT fix_enrollment_inconsistencies() as initial_fix_result;

-- 8. Clean up stale notifications
SELECT cleanup_stale_notifications() as cleanup_result;

-- 9. Show current data integrity status
SELECT * FROM validate_enrollment_integrity();

-- 10. Create a maintenance function that can be run periodically
CREATE OR REPLACE FUNCTION maintain_enrollment_system()
RETURNS TEXT AS $$
DECLARE
  fixed_count TEXT;
  cleaned_count INTEGER;
  issues RECORD;
  issue_summary TEXT := '';
BEGIN
  -- Fix inconsistencies
  SELECT fix_enrollment_inconsistencies() INTO fixed_count;
  
  -- Clean up stale notifications
  SELECT cleanup_stale_notifications() INTO cleaned_count;
  
  -- Check for remaining issues
  FOR issues IN SELECT * FROM validate_enrollment_integrity() LOOP
    issue_summary := issue_summary || issues.issue_type || ': ' || issues.details || '; ';
  END LOOP;
  
  RETURN 'Maintenance completed. ' || fixed_count || '. Cleaned ' || cleaned_count || ' stale notifications. Issues: ' || COALESCE(issue_summary, 'None');
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION maintain_enrollment_system() TO PUBLIC;

-- 11. Create a view for easy monitoring of enrollment status
CREATE OR REPLACE VIEW enrollment_status_overview AS
SELECT 
  pe.customer_id,
  pe.program_id,
  pe.business_id,
  pe.status as enrollment_status,
  pe.enrolled_at,
  lc.id as card_id,
  lc.card_number,
  lc.status as card_status,
  lc.points,
  u1.name as customer_name,
  u2.name as business_name,
  lp.name as program_name,
  CASE 
    WHEN lc.id IS NULL THEN 'MISSING_CARD'
    WHEN pe.id IS NULL THEN 'MISSING_ENROLLMENT'
    ELSE 'HEALTHY'
  END as health_status
FROM program_enrollments pe
FULL OUTER JOIN loyalty_cards lc ON 
  pe.customer_id = lc.customer_id AND 
  pe.program_id = lc.program_id
LEFT JOIN users u1 ON pe.customer_id = u1.id
LEFT JOIN users u2 ON pe.business_id = u2.id
LEFT JOIN loyalty_programs lp ON pe.program_id = lp.id::text
WHERE pe.status = 'ACTIVE' OR lc.is_active = true;

-- 12. Grant access to the view
GRANT SELECT ON enrollment_status_overview TO PUBLIC;

-- 13. Create a function to get enrollment statistics
CREATE OR REPLACE FUNCTION get_enrollment_statistics()
RETURNS TABLE(
  total_enrollments BIGINT,
  total_cards BIGINT,
  missing_cards BIGINT,
  missing_enrollments BIGINT,
  active_enrollments BIGINT,
  pending_approvals BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM program_enrollments WHERE status = 'ACTIVE') as total_enrollments,
    (SELECT COUNT(*) FROM loyalty_cards WHERE is_active = true) as total_cards,
    (SELECT COUNT(*) FROM program_enrollments pe
     LEFT JOIN loyalty_cards lc ON pe.customer_id = lc.customer_id AND pe.program_id = lc.program_id
     WHERE pe.status = 'ACTIVE' AND lc.id IS NULL) as missing_cards,
    (SELECT COUNT(*) FROM loyalty_cards lc
     LEFT JOIN program_enrollments pe ON lc.customer_id = pe.customer_id AND lc.program_id = pe.program_id
     WHERE lc.is_active = true AND pe.id IS NULL) as missing_enrollments,
    (SELECT COUNT(*) FROM program_enrollments WHERE status = 'ACTIVE') as active_enrollments,
    (SELECT COUNT(*) FROM customer_approval_requests WHERE status = 'PENDING') as pending_approvals;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_enrollment_statistics() TO PUBLIC;

-- 14. Show final status
SELECT 'Enrollment System Fix Applied Successfully' as status;
SELECT * FROM get_enrollment_statistics() as current_statistics;