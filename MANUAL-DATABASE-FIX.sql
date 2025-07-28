-- =====================================================
-- MANUAL DATABASE FIX - 3x Point Multiplication Bug
-- =====================================================
-- Run this SQL script directly in your PostgreSQL database
-- to fix the issue where 1 point becomes 3 points
-- =====================================================

-- Step 1: Drop the old function that causes multiplication
DROP FUNCTION IF EXISTS award_points_to_card(INTEGER, INTEGER, VARCHAR, TEXT, VARCHAR);

-- Step 2: Create the fixed function that updates ONLY the main points column
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
    RAISE NOTICE 'Card not found or inactive: %', p_card_id;
    RETURN FALSE;
  END IF;
  
  RAISE NOTICE 'BEFORE: Card % has % points', p_card_id, v_current_points;
  
  -- FIXED: Update ONLY the main points column (no multiplication!)
  UPDATE loyalty_cards
  SET 
    points = COALESCE(points, 0) + p_points,
    updated_at = NOW()
  WHERE id = p_card_id;
  
  -- Verify the update
  IF FOUND THEN
    v_success := TRUE;
    
    -- Get updated points for verification
    SELECT COALESCE(points, 0) INTO v_current_points
    FROM loyalty_cards
    WHERE id = p_card_id;
    
    RAISE NOTICE 'AFTER: Card % now has % points (added exactly % points)', 
        p_card_id, v_current_points, p_points;
    
    -- Record transaction in card_activities
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
    
    -- Update program_enrollments if exists (optional)
    UPDATE program_enrollments
    SET current_points = current_points + p_points,
        last_activity = NOW()
    WHERE customer_id = v_customer_id::VARCHAR 
    AND program_id = v_program_id;
    
    RAISE NOTICE '✅ SUCCESS: Exactly % points awarded to card %', p_points, p_card_id;
  ELSE
    RAISE NOTICE '❌ FAILED: No rows updated for card %', p_card_id;
  END IF;
  
  RETURN v_success;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TEST THE FIX (Replace 1 with an actual card ID)
-- =====================================================

-- Find a card to test with
SELECT id, customer_id, points FROM loyalty_cards LIMIT 3;

-- Test 1: Award exactly 1 point (replace 1 with actual card ID)
-- SELECT award_points_to_card(1, 1, 'TEST', 'Testing 1 point fix');

-- Test 2: Award exactly 10 points (replace 1 with actual card ID)  
-- SELECT award_points_to_card(1, 10, 'TEST', 'Testing 10 point fix');

-- Verify the results (replace 1 with actual card ID)
-- SELECT id, customer_id, points, updated_at FROM loyalty_cards WHERE id = 1;

-- =====================================================
-- INSTRUCTIONS:
-- =====================================================
-- 1. Copy this entire script
-- 2. Run it in your PostgreSQL database interface (pgAdmin, etc.)
-- 3. Find an actual card ID from the SELECT query above
-- 4. Uncomment and run the test queries with real card ID
-- 5. Verify that exactly the amount you specify is added
-- 
-- EXPECTED RESULTS:
-- - Award 1 point → Card gets exactly 1 point (not 3)
-- - Award 10 points → Card gets exactly 10 points (not 30)
-- ===================================================== 