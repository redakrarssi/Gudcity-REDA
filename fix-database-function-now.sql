-- =====================================================
-- IMMEDIATE DATABASE FIX - Run this SQL NOW
-- =====================================================
-- This fixes the award_points_to_card function in your database
-- that is causing the 3x multiplication issue
-- =====================================================

-- Step 1: Drop the old multiplication function
DROP FUNCTION IF EXISTS award_points_to_card(INTEGER, INTEGER, VARCHAR, TEXT, VARCHAR);

-- Step 2: Create the FIXED function (updates ONLY main points column)
CREATE OR REPLACE FUNCTION award_points_to_card(
  p_card_id INTEGER,
  p_points INTEGER,
  p_source VARCHAR(50) DEFAULT 'MANUAL',
  p_description TEXT DEFAULT '',
  p_transaction_ref VARCHAR(255) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := FALSE;
BEGIN
  -- FIXED: Update ONLY the main points column
  UPDATE loyalty_cards
  SET 
    points = COALESCE(points, 0) + p_points,
    updated_at = NOW()
  WHERE id = p_card_id AND is_active = TRUE;
  
  -- Check if update was successful
  IF FOUND THEN
    v_success := TRUE;
    
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
      COALESCE(p_description, 'Points awarded'),
      COALESCE(p_transaction_ref, 'tx-' || extract(epoch from now())),
      NOW()
    );
  END IF;
  
  RETURN v_success;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Test the fix immediately
DO $$
DECLARE
    test_card_id INTEGER;
    initial_points INTEGER := 0;
    final_points INTEGER := 0;
BEGIN
    -- Find a card to test
    SELECT id INTO test_card_id FROM loyalty_cards WHERE is_active = TRUE LIMIT 1;
    
    IF test_card_id IS NOT NULL THEN
        -- Get initial points
        SELECT COALESCE(points, 0) INTO initial_points 
        FROM loyalty_cards 
        WHERE id = test_card_id;
        
        RAISE NOTICE 'Testing fix: Card % has % points initially', test_card_id, initial_points;
        
        -- Award 1 point to test
        PERFORM award_points_to_card(test_card_id, 1, 'TEST', 'Testing multiplication fix');
        
        -- Check result
        SELECT COALESCE(points, 0) INTO final_points 
        FROM loyalty_cards 
        WHERE id = test_card_id;
        
        IF final_points = initial_points + 1 THEN
            RAISE NOTICE '✅ SUCCESS: 1 point = 1 point (NO MORE MULTIPLICATION!)';
        ELSE
            RAISE NOTICE '❌ STILL FAILING: Expected %, got %', initial_points + 1, final_points;
        END IF;
    ELSE
        RAISE NOTICE 'No test card found';
    END IF;
END $$;

RAISE NOTICE '🎉 DATABASE FUNCTION FIX APPLIED!';
RAISE NOTICE 'The multiplication bug should now be fixed.';
RAISE NOTICE 'Test by awarding 1 point - customer should receive exactly 1 point.'; 