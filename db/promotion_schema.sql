-- Promotions Database Schema

-- Check if the promo_codes table exists, create if not
CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('POINTS', 'DISCOUNT', 'CASHBACK', 'GIFT')),
  value NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3),
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'DEPLETED', 'CANCELLED')),
  name VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_business_id ON promo_codes(business_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_status ON promo_codes(status);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);

-- Check if the promo_redemptions table exists, create if not
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id SERIAL PRIMARY KEY,
  code_id INTEGER NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL,
  business_id INTEGER NOT NULL,
  value NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3),
  transaction_id VARCHAR(255),
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code_id ON promo_redemptions(code_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_customer_id ON promo_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_business_id ON promo_redemptions(business_id);

-- Sample data for testing (uncomment to use)
/*
INSERT INTO promo_codes (business_id, code, type, value, currency, max_uses, name, description) 
VALUES 
  (20, 'SUMMER25', 'DISCOUNT', 25.00, 'USD', 100, 'Summer Special', '25% off your summer purchase'),
  (20, 'WELCOME50', 'DISCOUNT', 50.00, 'USD', 50, 'Welcome Discount', '50% off your first purchase'),
  (20, 'POINTS100', 'POINTS', 100.00, NULL, NULL, 'Point Booster', 'Earn extra 100 points'),
  (20, 'CASHBACK10', 'CASHBACK', 10.00, 'USD', 200, 'Cash Back Offer', 'Get 10% cashback on purchases');
*/ 