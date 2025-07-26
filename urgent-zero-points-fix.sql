-- =====================================================
-- URGENT: Fix Persistent 0 Points Issue
-- =====================================================
-- Run these queries step by step to identify the exact problem
-- =====================================================

-- STEP 1: Check the exact card showing 0 points
-- (Replace 'REDA MAMNAAKRICH' with the exact customer/business name you see)
SELECT 
  'CURRENT CARD STATE' as check_type,
  lc.id as card_id,
  lc.customer_id,
  lc.program_id,
  lp.name as program_name,
  u.name as business_name,
  lc.points,
  lc.points_balance,
  lc.total_points_earned,
  lc.card_number,
  lc.is_active,
  lc.updated_at
FROM loyalty_cards lc
LEFT JOIN loyalty_programs lp ON lc.program_id = lp.id
LEFT JOIN users u ON lp.business_id = u.id
WHERE (lp.name ILIKE '%delta%' OR u.name ILIKE '%REDA%' OR u.name ILIKE '%MAMNAAKRICH%')
ORDER BY lc.updated_at DESC;

-- STEP 2: Check program_enrollments for the same customer
SELECT 
  'ENROLLMENT STATE' as check_type,
  pe.customer_id,
  pe.program_id,
  lp.name as program_name,
  pe.current_points,
  pe.status,
  pe.enrolled_at,
  pe.last_activity
FROM program_enrollments pe
LEFT JOIN loyalty_programs lp ON pe.program_id = lp.id
WHERE lp.name ILIKE '%delta%' OR lp.name ILIKE '%program%'
ORDER BY pe.customer_id;

-- STEP 3: Check for any recent point transactions
SELECT 
  'RECENT TRANSACTIONS' as check_type,
  ca.card_id,
  ca.activity_type,
  ca.points,
  ca.description,
  ca.created_at,
  lc.customer_id
FROM card_activities ca
JOIN loyalty_cards lc ON ca.card_id = lc.id
WHERE ca.created_at > NOW() - INTERVAL '24 hours'
ORDER BY ca.created_at DESC;

-- STEP 4: IMMEDIATE FIX - Force update all cards with proper points
-- This will sync points from program_enrollments to loyalty_cards
UPDATE loyalty_cards lc
SET 
  points = COALESCE(pe.current_points, lc.points, 0),
  points_balance = COALESCE(pe.current_points, lc.points, 0),
  total_points_earned = GREATEST(
    COALESCE(pe.current_points, 0), 
    COALESCE(lc.total_points_earned, 0),
    COALESCE(lc.points, 0)
  ),
  updated_at = NOW()
FROM program_enrollments pe
WHERE lc.customer_id::VARCHAR = pe.customer_id
AND lc.program_id = pe.program_id;

-- STEP 5: If no program_enrollments exist, create them
INSERT INTO program_enrollments (customer_id, program_id, current_points, enrolled_at, status)
SELECT DISTINCT
  lc.customer_id::VARCHAR,
  lc.program_id,
  COALESCE(lc.points, 0),
  COALESCE(lc.created_at, NOW()),
  'ACTIVE'
FROM loyalty_cards lc
LEFT JOIN program_enrollments pe ON lc.customer_id::VARCHAR = pe.customer_id AND lc.program_id = pe.program_id
WHERE pe.id IS NULL AND lc.is_active = TRUE;

-- STEP 6: Test adding points to a specific card
-- Find the card ID from STEP 1 results and replace below
DO $$
DECLARE
  test_card_id INTEGER;
  test_customer_id INTEGER;
  test_program_id INTEGER;
BEGIN
  -- Get the first active card
  SELECT id, customer_id, program_id 
  INTO test_card_id, test_customer_id, test_program_id
  FROM loyalty_cards 
  WHERE is_active = TRUE 
  LIMIT 1;
  
  IF test_card_id IS NOT NULL THEN
    -- Add 50 test points
    UPDATE loyalty_cards
    SET 
      points = COALESCE(points, 0) + 50,
      points_balance = COALESCE(points_balance, 0) + 50,
      total_points_earned = COALESCE(total_points_earned, 0) + 50,
      updated_at = NOW()
    WHERE id = test_card_id;
    
    -- Update enrollment too
    UPDATE program_enrollments
    SET 
      current_points = COALESCE(current_points, 0) + 50,
      last_activity = NOW()
    WHERE customer_id = test_customer_id::VARCHAR 
    AND program_id = test_program_id;
    
    -- Log the test
    INSERT INTO card_activities (
      card_id, activity_type, points, description, created_at
    ) VALUES (
      test_card_id, 'EARN_POINTS', 50, 'URGENT FIX TEST - 50 points added', NOW()
    );
    
    RAISE NOTICE 'TEST: Added 50 points to card ID %', test_card_id;
  END IF;
END $$;

-- STEP 7: Verify the fix worked
SELECT 
  'AFTER FIX VERIFICATION' as check_type,
  lc.id as card_id,
  lc.customer_id,
  lc.program_id,
  lp.name as program_name,
  lc.points,
  lc.points_balance,
  lc.total_points_earned,
  lc.updated_at,
  pe.current_points as enrollment_points
FROM loyalty_cards lc
LEFT JOIN loyalty_programs lp ON lc.program_id = lp.id
LEFT JOIN program_enrollments pe ON lc.customer_id::VARCHAR = pe.customer_id AND lc.program_id = pe.program_id
WHERE lc.is_active = TRUE
ORDER BY lc.updated_at DESC
LIMIT 10;

-- STEP 8: Quick manual test - Award points to specific card
-- REPLACE '1' with the actual card ID you want to test
-- SELECT 'MANUAL POINT TEST' as test_type;
-- UPDATE loyalty_cards 
-- SET 
--   points = points + 25,
--   points_balance = points_balance + 25,
--   total_points_earned = total_points_earned + 25,
--   updated_at = NOW()
-- WHERE id = 1;  -- Replace 1 with actual card ID

-- =====================================================
-- VERIFICATION QUERIES - Run these after the fixes
-- =====================================================

-- Check specific customer's cards (replace customer_id)
-- SELECT * FROM loyalty_cards WHERE customer_id = 4;

-- Check if points are in program_enrollments
-- SELECT * FROM program_enrollments WHERE customer_id = '4';

-- Check recent activities
-- SELECT * FROM card_activities WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC;

-- =====================================================
-- EMERGENCY MANUAL FIX
-- =====================================================
-- If nothing else works, manually set points for testing:
--
-- UPDATE loyalty_cards 
-- SET points = 100, points_balance = 100, total_points_earned = 100, updated_at = NOW()
-- WHERE customer_id = 4 AND program_id = 1;  -- Replace with actual IDs
--
-- ===================================================== 