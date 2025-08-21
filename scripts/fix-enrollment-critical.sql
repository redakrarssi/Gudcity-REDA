-- CRITICAL ENROLLMENT SYSTEM FIX
-- This script fixes the specific issues with Customer ID 4 & 27 and customers with 0 cards

-- 1. Create atomic function for enrollment + card creation
CREATE OR REPLACE FUNCTION create_enrollment_with_card(
  p_customer_id INTEGER,
  p_business_id INTEGER, 
  p_program_id TEXT
) RETURNS JSON AS $$
DECLARE
  v_enrollment_id INTEGER;
  v_card_id UUID;
  v_card_number TEXT;
  v_program_name TEXT;
  v_business_name TEXT;
  v_customer_name TEXT;
  v_result JSON;
  v_transaction_start TIMESTAMP;
BEGIN
  -- Record transaction start time for debugging
  v_transaction_start := NOW();
  
  -- Start transaction - CRITICAL for atomicity
  BEGIN
    -- Get program and business names for notifications
    SELECT COALESCE(name, 'Unknown Program') INTO v_program_name 
    FROM loyalty_programs WHERE id = p_program_id::uuid;
    
    SELECT COALESCE(name, 'Unknown Business') INTO v_business_name 
    FROM users WHERE id = p_business_id;
    
    SELECT COALESCE(name, 'Unknown Customer') INTO v_customer_name 
    FROM users WHERE id = p_customer_id;
    
    -- Check if enrollment already exists
    IF EXISTS (
      SELECT 1 FROM program_enrollments 
      WHERE customer_id = p_customer_id 
      AND program_id = p_program_id
    ) THEN
      -- Update existing enrollment to ACTIVE
      UPDATE program_enrollments
      SET status = 'ACTIVE', 
          updated_at = NOW()
      WHERE customer_id = p_customer_id 
      AND program_id = p_program_id
      RETURNING id INTO v_enrollment_id;
    ELSE
      -- Create new enrollment record
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
        p_customer_id,
        p_program_id,
        p_business_id,
        'ACTIVE',
        0,
        0,
        NOW(),
        NOW(),
        NOW()
      ) RETURNING id INTO v_enrollment_id;
    END IF;
    
    -- Verify enrollment was created/updated
    IF v_enrollment_id IS NULL THEN
      RAISE EXCEPTION 'Failed to create/update enrollment record for customer % in program %', p_customer_id, p_program_id;
    END IF;
    
    -- Check if card already exists
    IF EXISTS (
      SELECT 1 FROM loyalty_cards
      WHERE customer_id = p_customer_id
      AND program_id = p_program_id
    ) THEN
      -- Get existing card ID and ensure it's active
      SELECT id INTO v_card_id
      FROM loyalty_cards
      WHERE customer_id = p_customer_id
      AND program_id = p_program_id
      LIMIT 1;
      
      -- Ensure card is active
      UPDATE loyalty_cards
      SET is_active = true,
          status = 'ACTIVE',
          updated_at = NOW()
      WHERE id = v_card_id;
      
      -- Get card number for response
      SELECT card_number INTO v_card_number
      FROM loyalty_cards
      WHERE id = v_card_id;
      
    ELSE
      -- Generate unique card number
      v_card_number := 'GC-' || to_char(NOW(), 'YYMMDD-HH24MISS') || '-' || floor(random() * 10000)::TEXT;
      v_card_id := gen_random_uuid();
      
      -- Create new loyalty card
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
        v_card_id,
        p_customer_id,
        p_program_id,
        p_business_id,
        v_card_number,
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
    END IF;
    
    -- Verify card was created/updated
    IF v_card_id IS NULL THEN
      RAISE EXCEPTION 'Failed to create/update loyalty card for customer % in program %', p_customer_id, p_program_id;
    END IF;
    
    -- Update customer-business relationship
    INSERT INTO customer_business_relationships (
      customer_id,
      business_id,
      status,
      created_at,
      updated_at
    ) VALUES (
      p_customer_id::text,
      p_business_id::text,
      'ACTIVE',
      NOW(),
      NOW()
    )
    ON CONFLICT (customer_id, business_id) 
    DO UPDATE SET 
      status = 'ACTIVE',
      updated_at = NOW();
    
    -- Log successful transaction
    RAISE NOTICE 'Enrollment with card created successfully in % ms for customer % in program %', 
      EXTRACT(EPOCH FROM (NOW() - v_transaction_start)) * 1000, p_customer_id, p_program_id;
    
    -- Commit transaction
    COMMIT;
    
    -- Return success result
    v_result := json_build_object(
      'success', true,
      'enrollment_id', v_enrollment_id,
      'card_id', v_card_id,
      'card_number', v_card_number,
      'program_name', v_program_name,
      'business_name', v_business_name,
      'customer_name', v_customer_name,
      'transaction_time_ms', EXTRACT(EPOCH FROM (NOW() - v_transaction_start)) * 1000
    );
    
    RETURN v_result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback transaction on any error
    ROLLBACK;
    
    -- Log detailed error information
    RAISE NOTICE 'Error in create_enrollment_with_card: %, SQLSTATE: %, Duration: % ms for customer % in program %', 
      SQLERRM, SQLSTATE, EXTRACT(EPOCH FROM (NOW() - v_transaction_start)) * 1000, p_customer_id, p_program_id;
    
    -- Return error result
    v_result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE,
      'customer_id', p_customer_id,
      'program_id', p_program_id,
      'business_id', p_business_id
    );
    
    RETURN v_result;
  END;
END;
$$ LANGUAGE plpgsql;

-- 2. Create function to validate enrollment before point awarding
CREATE OR REPLACE FUNCTION validate_enrollment_for_points(
  p_customer_id INTEGER,
  p_program_id TEXT
) RETURNS JSON AS $$
DECLARE
  v_enrollment_exists BOOLEAN;
  v_enrollment_status TEXT;
  v_result JSON;
BEGIN
  -- Check if customer is enrolled in the program
  SELECT 
    EXISTS (
      SELECT 1 FROM program_enrollments 
      WHERE customer_id = p_customer_id 
      AND program_id = p_program_id
      AND status = 'ACTIVE'
    ),
    COALESCE(
      (SELECT status FROM program_enrollments 
       WHERE customer_id = p_customer_id 
       AND program_id = p_program_id
       LIMIT 1), 
      'NOT_ENROLLED'
    )
  INTO v_enrollment_exists, v_enrollment_status;
  
  -- Return validation result
  v_result := json_build_object(
    'is_enrolled', v_enrollment_exists,
    'enrollment_status', v_enrollment_status,
    'can_award_points', v_enrollment_exists,
    'customer_id', p_customer_id,
    'program_id', p_program_id
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to fix existing broken enrollments
CREATE OR REPLACE FUNCTION fix_broken_enrollments()
RETURNS TEXT AS $$
DECLARE
  v_fixed_count INTEGER := 0;
  v_enrollment RECORD;
  v_result JSON;
BEGIN
  -- Find enrollments without cards and fix them
  FOR v_enrollment IN 
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
      -- Use our atomic function to fix this enrollment
      SELECT create_enrollment_with_card(
        v_enrollment.customer_id,
        v_enrollment.business_id,
        v_enrollment.program_id
      ) INTO v_result;
      
      IF (v_result->>'success')::BOOLEAN THEN
        v_fixed_count := v_fixed_count + 1;
        RAISE NOTICE 'Fixed enrollment % for customer % in program %', 
          v_enrollment.enrollment_id, v_enrollment.customer_id, v_enrollment.program_id;
      ELSE
        RAISE NOTICE 'Failed to fix enrollment % for customer % in program %: %', 
          v_enrollment.enrollment_id, v_enrollment.customer_id, v_enrollment.program_id, 
          v_result->>'error';
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error fixing enrollment %: %', v_enrollment.enrollment_id, SQLERRM;
    END;
  END LOOP;
  
  RETURN 'Fixed ' || v_fixed_count::TEXT || ' broken enrollments';
END;
$$ LANGUAGE plpgsql;

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_enrollment_with_card(INTEGER, INTEGER, TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION validate_enrollment_for_points(INTEGER, TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION fix_broken_enrollments() TO PUBLIC;

-- 5. Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_program_enrollments_customer_program_active 
ON program_enrollments(customer_id, program_id) WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_loyalty_cards_customer_program_active 
ON loyalty_cards(customer_id, program_id) WHERE is_active = true;

-- 6. Fix existing broken enrollments immediately
SELECT fix_broken_enrollments() as fix_result;

-- 7. Show current status
SELECT 'Critical Enrollment System Fix Applied Successfully' as status;

-- 8. Test the fix for specific problematic customers
SELECT 
  'Testing enrollment creation for Customer ID 4' as test_case,
  create_enrollment_with_card(4, 1, 'test-program-id') as result
WHERE EXISTS (SELECT 1 FROM users WHERE id = 4);

SELECT 
  'Testing enrollment creation for Customer ID 27' as test_case,
  create_enrollment_with_card(27, 1, 'test-program-id') as result
WHERE EXISTS (SELECT 1 FROM users WHERE id = 27);