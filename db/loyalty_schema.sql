-- Loyalty Programs Database Schema

-- Check if the loyalty_programs table exists, create if not
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id SERIAL PRIMARY KEY,
  business_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- POINTS, STAMPS, CASHBACK
  point_value NUMERIC(10, 2) DEFAULT 1.0,
  expiration_days INTEGER,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_business ON loyalty_programs(business_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_status ON loyalty_programs(status);

-- Check if the reward_tiers table exists, create if not
CREATE TABLE IF NOT EXISTS reward_tiers (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
  points_required INTEGER NOT NULL,
  reward VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_reward_tiers_program ON reward_tiers(program_id);

-- Check if the program_enrollments table exists, create if not
CREATE TABLE IF NOT EXISTS program_enrollments (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(255) NOT NULL,
  program_id INTEGER NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
  current_points INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_program_enrollments_customer ON program_enrollments(customer_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_program ON program_enrollments(program_id);
-- Create unique index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_program_enrollments_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_program_enrollments_unique ON program_enrollments(customer_id, program_id);
  END IF;
END
$$;

-- Check if the loyalty_transactions table exists, create if not
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(255) NOT NULL,
  business_id VARCHAR(255) NOT NULL,
  program_id INTEGER NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- EARN, REDEEM
  points INTEGER NOT NULL,
  amount NUMERIC(10, 2), -- For points earned from purchase
  reward_id INTEGER, -- For redemptions, references reward_tiers(id)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_business ON loyalty_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_program ON loyalty_transactions(program_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created ON loyalty_transactions(created_at);

-- Sample data (uncomment to use for testing)
/*
-- Insert sample loyalty programs
INSERT INTO loyalty_programs (business_id, name, description, type, point_value, expiration_days, status)
VALUES
  ('1', 'Coffee Rewards', 'Earn points for every coffee purchase', 'POINTS', 1.0, 365, 'ACTIVE'),
  ('1', 'Lunch Stamps', 'Collect stamps for every lunch purchase', 'STAMPS', 1.0, NULL, 'ACTIVE');

-- Insert sample reward tiers
INSERT INTO reward_tiers (program_id, points_required, reward)
VALUES
  (1, 10, 'Free Coffee'),
  (1, 25, 'Free Pastry'),
  (1, 50, 'Free Lunch'),
  (2, 5, 'Free Drink'),
  (2, 10, 'Free Meal');
*/ 