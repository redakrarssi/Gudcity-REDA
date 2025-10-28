-- =====================================================
-- Test Exact Point Amounts
-- =====================================================
-- This script tests that points are awarded exactly as specified
-- 1 point = 1 point, 10 points = 10 points (no multiplication)
-- =====================================================

-- Test 1: Award 1 point exactly
-- Replace CARD_ID with an actual card ID from your database
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
    
    RAISE NOTICE 'Test 1: Initial points for card %: %', test_card_id, initial_points;
    
    -- Award exactly 1 point
    PERFORM award_points_to_card(test_card_id, 1, 'TEST', 'Testing 1 point award');
    
    -- Check final points
    SELECT COALESCE(points, 0) INTO final_points 
    FROM loyalty_cards 
    WHERE id = test_card_id;
    
    RAISE NOTICE 'Test 1: Final points for card %: % (should be % + 1 = %)', 
        test_card_id, final_points, initial_points, initial_points + 1;
    
    -- Verify exactly 1 point was added
    IF final_points = initial_points + 1 THEN
        RAISE NOTICE 'Test 1: ✅ SUCCESS - Exactly 1 point was awarded';
    ELSE
        RAISE NOTICE 'Test 1: ❌ FAILED - Expected %, got %', initial_points + 1, final_points;
    END IF;
END $$;

-- Test 2: Award 10 points exactly
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
    
    RAISE NOTICE 'Test 2: Initial points for card %: %', test_card_id, initial_points;
    
    -- Award exactly 10 points
    PERFORM award_points_to_card(test_card_id, 10, 'TEST', 'Testing 10 point award');
    
    -- Check final points
    SELECT COALESCE(points, 0) INTO final_points 
    FROM loyalty_cards 
    WHERE id = test_card_id;
    
    RAISE NOTICE 'Test 2: Final points for card %: % (should be % + 10 = %)', 
        test_card_id, final_points, initial_points, initial_points + 10;
    
    -- Verify exactly 10 points were added
    IF final_points = initial_points + 10 THEN
        RAISE NOTICE 'Test 2: ✅ SUCCESS - Exactly 10 points were awarded';
    ELSE
        RAISE NOTICE 'Test 2: ❌ FAILED - Expected %, got %', initial_points + 10, final_points;
    END IF;
END $$;

-- Test 3: Check no multiplication is happening
SELECT 
    id,
    customer_id,
    program_id,
    points,
    points_balance,
    total_points_earned,
    updated_at
FROM loyalty_cards 
WHERE id = 1 -- Replace with actual card ID
ORDER BY updated_at DESC;

-- =====================================================
-- Instructions:
-- 1. Replace "1" with an actual card ID from your database
-- 2. Run this script to test exact point awarding
-- 3. Check the output messages for SUCCESS/FAILED
-- ===================================================== 