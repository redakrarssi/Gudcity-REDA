-- =====================================================
-- Fix 3x Point Multiplication Bug
-- =====================================================
-- This script fixes the issue where awarding 1 point becomes 3 points
-- The problem: Database function was updating 3 columns with same amount
-- The solution: Update only the main 'points' column
-- =====================================================

-- Drop the old function that causes multiplication
DROP FUNCTION IF EXISTS award_points_to_card(INTEGER, INTEGER, VARCHAR, TEXT, VARCHAR);

-- Create corrected function that updates ONLY the main points column
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
-- Test the fixed function
-- =====================================================

-- Test 1: Award exactly 1 point (should result in +1, not +3)
DO $$
DECLARE
    test_card_id INTEGER := 1; -- Replace with actual card ID
    initial_points INTEGER;
    final_points INTEGER;
BEGIN
    -- Get initial points
    SELECT COALESCE(points, 0) INTO initial_points 
    FROM loyalty_cards 
    WHERE id = test_card_id;
    
    RAISE NOTICE '=== TEST 1: Awarding 1 point ===';
    RAISE NOTICE 'Initial points: %', initial_points;
    
    -- Award exactly 1 point
    PERFORM award_points_to_card(test_card_id, 1, 'TEST', 'Fix multiplication test - 1 point');
    
    -- Check final points
    SELECT COALESCE(points, 0) INTO final_points 
    FROM loyalty_cards 
    WHERE id = test_card_id;
    
    RAISE NOTICE 'Final points: % (expected: %)', final_points, initial_points + 1;
    
    IF final_points = initial_points + 1 THEN
        RAISE NOTICE '✅ TEST 1 PASSED: Exactly 1 point was added';
    ELSE
        RAISE NOTICE '❌ TEST 1 FAILED: Expected %, got %', initial_points + 1, final_points;
    END IF;
END $$;

-- Test 2: Award exactly 10 points (should result in +10, not +30)
DO $$
DECLARE
    test_card_id INTEGER := 1; -- Replace with actual card ID
    initial_points INTEGER;
    final_points INTEGER;
BEGIN
    -- Get initial points
    SELECT COALESCE(points, 0) INTO initial_points 
    FROM loyalty_cards 
    WHERE id = test_card_id;
    
    RAISE NOTICE '=== TEST 2: Awarding 10 points ===';
    RAISE NOTICE 'Initial points: %', initial_points;
    
    -- Award exactly 10 points
    PERFORM award_points_to_card(test_card_id, 10, 'TEST', 'Fix multiplication test - 10 points');
    
    -- Check final points
    SELECT COALESCE(points, 0) INTO final_points 
    FROM loyalty_cards 
    WHERE id = test_card_id;
    
    RAISE NOTICE 'Final points: % (expected: %)', final_points, initial_points + 10;
    
    IF final_points = initial_points + 10 THEN
        RAISE NOTICE '✅ TEST 2 PASSED: Exactly 10 points were added';
    ELSE
        RAISE NOTICE '❌ TEST 2 FAILED: Expected %, got %', initial_points + 10, final_points;
    END IF;
END $$;

-- Verification query
SELECT 
    id,
    customer_id,
    program_id,
    points,
    updated_at
FROM loyalty_cards 
WHERE id = 1 -- Replace with actual card ID
ORDER BY updated_at DESC;

-- =====================================================
-- MULTIPLICATION BUG FIXED!
-- =====================================================
-- Changes made:
-- 1. ✅ Removed points_balance and total_points_earned updates 
-- 2. ✅ Only update the main 'points' column
-- 3. ✅ Added verification logging
-- 4. ✅ Added test cases to verify 1:1 ratio
-- 
-- Result: 1 point = 1 point, 10 points = 10 points
-- ===================================================== 