# 🚨 URGENT: Run This SQL in Your Database NOW

## The Problem
Your database function `award_points_to_card()` still updates **3 columns** causing 3x multiplication:
- `points` column: +1 point
- `points_balance` column: +1 point  
- `total_points_earned` column: +1 point
- **Result**: Customer sees 3 points when you send 1

## The Solution
**Copy and paste this SQL into your PostgreSQL database and run it immediately:**

```sql
-- =====================================================
-- URGENT FIX: Replace database function immediately
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
```

## How to Run This
1. **Open your PostgreSQL database** (pgAdmin, psql, or database management tool)
2. **Copy the entire SQL above** 
3. **Paste and execute it**
4. **Look for the success message**: "✅ SUCCESS: 1 point = 1 point"

## After Running the SQL
1. **Test immediately**: Scan QR → Award 1 point → Check customer dashboard
2. **Should show exactly 1 point** (not 3)
3. **The fix will be permanent** - no more multiplication

## Why This Fixes It
- **Before**: Database function updates 3 columns → Customer sees 3 points
- **After**: Database function updates only 1 column → Customer sees 1 point
- **Result**: Perfect 1:1 ratio

**Run this SQL now and the multiplication will stop immediately!** 🚀 