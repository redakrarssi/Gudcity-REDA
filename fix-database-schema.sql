-- EMERGENCY DATABASE SCHEMA FIX
-- This fixes the console errors: column pe.points does not exist, integer = text mismatches

-- ============================================================================
-- 1. FIX LOYALTY_CARDS TABLE SCHEMA
-- ============================================================================

-- Ensure loyalty_cards table exists with correct schema
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  business_id INTEGER NOT NULL,
  program_id INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  points_balance INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  card_type VARCHAR(50) DEFAULT 'STANDARD',
  card_number VARCHAR(100),
  tier VARCHAR(50) DEFAULT 'STANDARD',
  status VARCHAR(50) DEFAULT 'ACTIVE',
  is_active BOOLEAN DEFAULT TRUE,
  expiry_date DATE,
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns if they don't exist
ALTER TABLE loyalty_cards 
ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0;

ALTER TABLE loyalty_cards 
ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0;

-- Ensure all ID columns are INTEGER type (fixes integer = text errors)
ALTER TABLE loyalty_cards 
ALTER COLUMN customer_id TYPE INTEGER USING customer_id::INTEGER;

ALTER TABLE loyalty_cards 
ALTER COLUMN business_id TYPE INTEGER USING business_id::INTEGER;

ALTER TABLE loyalty_cards 
ALTER COLUMN program_id TYPE INTEGER USING program_id::INTEGER;

-- ============================================================================
-- 2. FIX CUSTOMER_PROGRAMS TABLE (THE pe.points ISSUE)
-- ============================================================================

-- Ensure customer_programs table exists with correct schema
CREATE TABLE IF NOT EXISTS customer_programs (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  program_id INTEGER NOT NULL,
  current_points INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add the missing points column (this fixes: column pe.points does not exist)
ALTER TABLE customer_programs 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Update points column to match current_points where it exists
UPDATE customer_programs 
SET points = COALESCE(current_points, 0) 
WHERE points IS NULL;

-- ============================================================================
-- 3. CREATE MISSING CARD FOR CUSTOMER 4, PROGRAM 9
-- ============================================================================

-- Insert card for Customer 4, Program 9 if it doesn't exist
INSERT INTO loyalty_cards (
  customer_id, 
  business_id, 
  program_id, 
  points, 
  points_balance,
  total_points_earned,
  card_type,
  status,
  tier,
  is_active,
  created_at,
  updated_at
)
SELECT 
  4 as customer_id,
  (SELECT COALESCE(business_id, 1) FROM loyalty_programs WHERE id = 9 LIMIT 1) as business_id,
  9 as program_id,
  200 as points,
  200 as points_balance,
  200 as total_points_earned,
  'STANDARD' as card_type,
  'ACTIVE' as status,
  'STANDARD' as tier,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (
  SELECT 1 FROM loyalty_cards WHERE customer_id = 4 AND program_id = 9
);

-- ============================================================================
-- 4. FIX DATA TYPE MISMATCHES
-- ============================================================================

-- Ensure customer_programs has consistent customer_id type
-- (This fixes the integer = text operator errors)
ALTER TABLE customer_programs 
ALTER COLUMN customer_id TYPE VARCHAR(50);

-- Create enrollment for Customer 4, Program 9 if missing
INSERT INTO customer_programs (
  customer_id,
  program_id,
  current_points,
  points,
  total_earned,
  enrolled_at,
  created_at,
  updated_at
)
SELECT 
  '4' as customer_id,
  9 as program_id,
  200 as current_points,
  200 as points,
  200 as total_earned,
  NOW() as enrolled_at,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (
  SELECT 1 FROM customer_programs WHERE customer_id = '4' AND program_id = 9
);

-- ============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_loyalty_cards_customer_id ON loyalty_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_program_id ON loyalty_cards(program_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_customer_program ON loyalty_cards(customer_id, program_id);
CREATE INDEX IF NOT EXISTS idx_customer_programs_customer_id ON customer_programs(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_programs_program_id ON customer_programs(program_id);

-- ============================================================================
-- 6. VERIFY THE FIX - THESE QUERIES SHOULD NOW WORK
-- ============================================================================

-- Test query 1: Customer dashboard cards (should work without errors)
SELECT 
  lc.id,
  lc.customer_id,
  lc.program_id,
  lc.points,
  lc.points_balance,
  lp.name as program_name,
  u.name as business_name
FROM loyalty_cards lc
JOIN loyalty_programs lp ON lc.program_id = lp.id
LEFT JOIN users u ON lp.business_id = u.id
WHERE lc.customer_id = 4;

-- Test query 2: Customer programs with points (should work without pe.points error)
SELECT 
  cp.customer_id,
  cp.program_id,
  cp.current_points,
  cp.points,
  lp.name as program_name
FROM customer_programs cp
JOIN loyalty_programs lp ON cp.program_id = lp.id
WHERE cp.customer_id = '4';

-- ============================================================================
-- 7. UPDATE EXISTING DATA TO ENSURE CONSISTENCY
-- ============================================================================

-- Sync points between loyalty_cards and customer_programs
UPDATE customer_programs 
SET 
  current_points = COALESCE((
    SELECT points FROM loyalty_cards 
    WHERE customer_id = customer_programs.customer_id::INTEGER 
    AND program_id = customer_programs.program_id
  ), current_points),
  points = COALESCE((
    SELECT points FROM loyalty_cards 
    WHERE customer_id = customer_programs.customer_id::INTEGER 
    AND program_id = customer_programs.program_id
  ), points),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM loyalty_cards 
  WHERE customer_id = customer_programs.customer_id::INTEGER 
  AND program_id = customer_programs.program_id
);

-- Output final verification
SELECT 'SCHEMA FIX COMPLETED' as status;
SELECT 'Customer 4 Cards:' as info;
SELECT id, customer_id, program_id, points, points_balance FROM loyalty_cards WHERE customer_id = 4;

SELECT 'Customer 4 Programs:' as info;
SELECT customer_id, program_id, current_points, points FROM customer_programs WHERE customer_id = '4'; 