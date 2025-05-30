-- Loyalty Cards Schema

-- Check if the loyalty_cards table exists, create if not
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id INTEGER NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
  card_type VARCHAR(50) NOT NULL, -- PREMIUM, GOLD, SILVER, BASIC, etc.
  points INTEGER NOT NULL DEFAULT 0,
  next_reward VARCHAR(255),
  points_to_next INTEGER,
  expiry_date DATE,
  benefits TEXT[], -- Array of benefits
  last_used TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_customer_id ON loyalty_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_business_id ON loyalty_cards(business_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_program_id ON loyalty_cards(program_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_is_active ON loyalty_cards(is_active);

-- Create unique index to ensure a customer has only one card per program
CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_cards_customer_program 
ON loyalty_cards(customer_id, program_id) 
WHERE is_active = TRUE;

-- Check if the card_activities table exists, create if not
CREATE TABLE IF NOT EXISTS card_activities (
  id SERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES loyalty_cards(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- EARN_POINTS, REDEEM_POINTS, CARD_USED
  points INTEGER,
  description TEXT,
  transaction_reference VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_card_activities_card_id ON card_activities(card_id);
CREATE INDEX IF NOT EXISTS idx_card_activities_created_at ON card_activities(created_at);

-- Sample data (uncomment to use for testing)
/*
-- Assuming you have customers and loyalty_programs data already
INSERT INTO loyalty_cards (
  customer_id, 
  business_id,
  program_id,
  card_type,
  points,
  next_reward,
  points_to_next,
  expiry_date,
  benefits,
  last_used,
  is_active
)
VALUES
  (1, 1, 1, 'PREMIUM', 235, 'Free Coffee', 15, '2024-12-31', ARRAY['10% off every purchase', 'Free coffee on birthdays', 'Access to member events'], NOW() - INTERVAL '10 days', TRUE),
  (1, 2, 2, 'GOLD', 450, 'Free Dessert Platter', 50, '2024-11-15', ARRAY['Free pastry with coffee', 'Early access to seasonal items', 'Double points on weekends'], NOW() - INTERVAL '15 days', TRUE),
  (1, 3, 3, 'SILVER', 320, 'Free Training Session', 30, '2024-09-30', ARRAY['Guest passes', 'Locker access', 'Discounted personal training'], NOW() - INTERVAL '22 days', TRUE);

-- Insert sample card activities
INSERT INTO card_activities (
  card_id,
  activity_type,
  points,
  description,
  transaction_reference
)
VALUES
  (1, 'EARN_POINTS', 15, 'Purchase at Local Coffee Shop', 'TXN-12345'),
  (1, 'EARN_POINTS', 10, 'Birthday bonus', 'BONUS-001'),
  (2, 'EARN_POINTS', 25, 'Purchase at Tasty Treats Bakery', 'TXN-67890'),
  (3, 'EARN_POINTS', 20, 'Monthly subscription', 'SUB-123');
*/ 