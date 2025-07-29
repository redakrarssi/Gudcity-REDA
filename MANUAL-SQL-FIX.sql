-- =====================================================
-- MANUAL MULTIPLICATION BUG FIX
-- =====================================================
-- Copy and paste these commands into your PostgreSQL database
-- to fix the 3x point multiplication issue
-- =====================================================

-- Step 1: Drop the old function that causes multiplication
DROP FUNCTION IF EXISTS award_points_to_card(INTEGER, INTEGER, VARCHAR, TEXT, VARCHAR);
DROP FUNCTION IF EXISTS award_points_to_card_old(INTEGER, INTEGER, VARCHAR, TEXT, VARCHAR);

-- Step 2: Create the CORRECTED function (only updates main points column)
CREATE OR REPLACE FUNCTION award_points_to_card(
  p_card_id INTEGER,
  p_points INTEGER,
  p_source VARCHAR(50) DEFAULT 'MANUAL',
  p_description TEXT DEFAULT '',
  p_transaction_ref VARCHAR(255) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_customer_id INTEGER;
  v_program_id INTEGER;
  v_business_id INTEGER;
  v_success BOOLEAN := FALSE;
  v_current_points INTEGER := 0;
BEGIN
  -- Get card details and current points
  SELECT customer_id, program_id, business_id, COALESCE(points, 0)
  INTO v_customer_id, v_program_id, v_business_id, v_current_points
  FROM loyalty_cards
  WHERE id = p_card_id AND is_active = TRUE;
  
  -- Check if card exists
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- 🔧 FIXED: Update ONLY the main points column (no multiplication!)
  UPDATE loyalty_cards
  SET 
    points = COALESCE(points, 0) + p_points,
    updated_at = NOW()
  WHERE id = p_card_id;
  
  -- Verify the update worked
  IF FOUND THEN
    v_success := TRUE;
    
    -- Record transaction in card_activities table
    INSERT INTO card_activities (
      card_id,
      activity_type,
      points,
      description,
      transaction_reference,
      created_at
    ) VALUES (
      p_card_id,
      'EARN_POINTS',
      p_points,
      COALESCE(p_description, 'Points awarded via ' || p_source),
      COALESCE(p_transaction_ref, 'tx-' || extract(epoch from now())),
      NOW()
    );
    
    -- Optional: Update program_enrollments for sync (if exists)
    UPDATE program_enrollments
    SET current_points = current_points + p_points,
        last_activity = NOW()
    WHERE customer_id = v_customer_id::VARCHAR 
    AND program_id = v_program_id;
  END IF;
  
  RETURN v_success;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Test the fix (optional - you can skip this if you want)
DO $$
DECLARE
    test_card_id INTEGER;
    initial_points INTEGER := 0;
    final_points INTEGER := 0;
BEGIN
    -- Find the first available card for testing
    SELECT id INTO test_card_id FROM loyalty_cards WHERE is_active = TRUE LIMIT 1;
    
    IF test_card_id IS NOT NULL THEN
        -- Get initial points
        SELECT COALESCE(points, 0) INTO initial_points 
        FROM loyalty_cards 
        WHERE id = test_card_id;
        
        RAISE NOTICE 'Testing card ID: %, Initial points: %', test_card_id, initial_points;
        
        -- Test: Award exactly 1 point (should be +1, not +3)
        PERFORM award_points_to_card(test_card_id, 1, 'TEST', 'Testing multiplication fix');
        
        -- Check result
        SELECT COALESCE(points, 0) INTO final_points 
        FROM loyalty_cards 
        WHERE id = test_card_id;
        
        IF final_points = initial_points + 1 THEN
            RAISE NOTICE 'TEST PASSED: 1 point = 1 point (no multiplication)';
        ELSE
            RAISE NOTICE 'TEST FAILED: Expected %, got %', initial_points + 1, final_points;
        END IF;
    ELSE
        RAISE NOTICE 'No test card found';
    END IF;
END $$;

-- =====================================================
-- MULTIPLICATION BUG FIXED!
-- =====================================================
-- The function now updates ONLY the main 'points' column
-- Result: 1 point awarded = 1 point received (no multiplication)
-- ===================================================== 