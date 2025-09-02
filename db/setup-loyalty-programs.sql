-- Setup loyalty programs for testing nearby feature

-- Drop the table if it exists
DROP TABLE IF EXISTS loyalty_programs CASCADE;

-- Create the loyalty_programs table
CREATE TABLE loyalty_programs (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  points_per_dollar DECIMAL(10, 2) DEFAULT 1.0,
  min_points_redemption INTEGER DEFAULT 100,
  welcome_bonus INTEGER DEFAULT 0,
  points_expiry_days INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_loyalty_programs_business_id ON loyalty_programs(business_id);
CREATE INDEX idx_loyalty_programs_category ON loyalty_programs(category);
CREATE INDEX idx_loyalty_programs_is_active ON loyalty_programs(is_active);

-- Insert sample loyalty programs for each business in the business_locations table
INSERT INTO loyalty_programs (
  business_id,
  name,
  description,
  category,
  points_per_dollar,
  min_points_redemption,
  welcome_bonus,
  points_expiry_days,
  is_active
)
SELECT 
  business_id,
  CASE 
    WHEN name LIKE '%Coffee%' THEN 'Coffee Rewards'
    WHEN name LIKE '%Tech%' THEN 'Tech Points'
    WHEN name LIKE '%Fitness%' THEN 'Fitness Members Club'
    WHEN name LIKE '%Bakery%' THEN 'Sweet Rewards'
    WHEN name LIKE '%Book%' THEN 'Readers Club'
    ELSE 'Loyalty Program'
  END,
  CASE 
    WHEN name LIKE '%Coffee%' THEN 'Earn points with every purchase and get free drinks and treats.'
    WHEN name LIKE '%Tech%' THEN 'Earn tech points on all purchases. Redeem for discounts and accessories.'
    WHEN name LIKE '%Fitness%' THEN 'Earn points for each workout. Redeem for classes and gear.'
    WHEN name LIKE '%Bakery%' THEN 'Get points for every dollar spent and redeem for delicious treats.'
    WHEN name LIKE '%Book%' THEN 'Earn points with every book purchased. Redeem for books and more.'
    ELSE 'Earn points with every purchase and redeem for rewards.'
  END,
  CASE 
    WHEN name LIKE '%Coffee%' THEN 'cafe'
    WHEN name LIKE '%Tech%' THEN 'electronics'
    WHEN name LIKE '%Fitness%' THEN 'fitness'
    WHEN name LIKE '%Bakery%' THEN 'cafe'
    WHEN name LIKE '%Book%' THEN 'retail'
    ELSE 'retail'
  END,
  CASE 
    WHEN name LIKE '%Coffee%' THEN 10
    WHEN name LIKE '%Tech%' THEN 5
    ELSE 1
  END,
  100,
  CASE 
    WHEN name LIKE '%Coffee%' THEN 50
    WHEN name LIKE '%Book%' THEN 100
    ELSE 0
  END,
  365,
  TRUE
FROM (SELECT DISTINCT business_id, name FROM business_locations) AS distinct_businesses; 