-- Admin Businesses Endpoint - Required Database Schema
-- This script ensures all necessary tables exist for the /api/admin/businesses endpoint

-- Check if the business_daily_logins table exists, create if not
CREATE TABLE IF NOT EXISTS business_daily_logins (
  id SERIAL PRIMARY KEY,
  business_id INTEGER,
  user_id INTEGER,
  login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(50),
  device VARCHAR(100),
  session_duration INTEGER DEFAULT 0
);

-- Add indexes for business_daily_logins
CREATE INDEX IF NOT EXISTS idx_business_daily_logins_business_id ON business_daily_logins(business_id);
CREATE INDEX IF NOT EXISTS idx_business_daily_logins_user_id ON business_daily_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_business_daily_logins_login_time ON business_daily_logins(login_time);

-- Check if the businesses table exists (for legacy business records)
CREATE TABLE IF NOT EXISTS businesses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(100),
  type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  address TEXT,
  logo VARCHAR(500),
  description TEXT,
  notes TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for businesses table
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_registered_at ON businesses(registered_at);

-- Check if the business_profile table exists (for user business accounts)
CREATE TABLE IF NOT EXISTS business_profile (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  language VARCHAR(10) DEFAULT 'en',
  country VARCHAR(100),
  currency VARCHAR(3) DEFAULT 'USD',
  timezone VARCHAR(50) DEFAULT 'UTC',
  tax_id VARCHAR(100),
  
  -- Business Hours (JSON format)
  business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "17:00", "isClosed": false},
    "tuesday": {"open": "09:00", "close": "17:00", "isClosed": false},
    "wednesday": {"open": "09:00", "close": "17:00", "isClosed": false},
    "thursday": {"open": "09:00", "close": "17:00", "isClosed": false},
    "friday": {"open": "09:00", "close": "17:00", "isClosed": false},
    "saturday": {"open": "10:00", "close": "14:00", "isClosed": false},
    "sunday": {"open": "00:00", "close": "00:00", "isClosed": true}
  }',
  
  -- Payment Settings (JSON format)
  payment_settings JSONB DEFAULT '{
    "acceptsCard": true,
    "acceptsCash": true,
    "acceptsOnline": false,
    "serviceFeePercent": 0
  }',
  
  -- Notification Settings (JSON format)
  notification_settings JSONB DEFAULT '{
    "email": true,
    "push": true,
    "sms": false,
    "customerActivity": true,
    "promotionStats": true,
    "systemUpdates": true
  }',
  
  -- Integrations (JSON format)
  integrations JSONB DEFAULT '{
    "pos": false,
    "accounting": false,
    "marketing": false,
    "crm": false
  }',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for business_profile
CREATE INDEX IF NOT EXISTS idx_business_profile_business_id ON business_profile(business_id);

-- Check if the loyalty_programs table exists
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- POINTS, STAMPS, CASHBACK
  category VARCHAR(50) DEFAULT 'retail', -- retail, cafe, restaurant, etc.
  point_value NUMERIC(10, 2) DEFAULT 1.0,
  expiration_days INTEGER,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for loyalty_programs
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_business ON loyalty_programs(business_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_status ON loyalty_programs(status);

-- Check if the customers table exists
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  tier VARCHAR(50) DEFAULT 'Bronze',
  loyalty_points INTEGER DEFAULT 0,
  total_spent NUMERIC(10, 2) DEFAULT 0,
  visits INTEGER DEFAULT 0,
  birthday DATE,
  last_visit TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for customers
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier);

-- Check if the program_enrollments table exists
CREATE TABLE IF NOT EXISTS program_enrollments (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(255) NOT NULL,
  program_id INTEGER NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
  current_points INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for program_enrollments
CREATE INDEX IF NOT EXISTS idx_program_enrollments_customer ON program_enrollments(customer_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_program ON program_enrollments(program_id);

-- Check if the promo_codes table exists
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

-- Add indexes for promo_codes
CREATE INDEX IF NOT EXISTS idx_promo_codes_business_id ON promo_codes(business_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_status ON promo_codes(status);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);

-- Ensure users table has the required columns for business accounts
DO $$
BEGIN
  -- Add user_type column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_type') THEN
    ALTER TABLE users ADD COLUMN user_type VARCHAR(50) DEFAULT 'customer';
  END IF;
  
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
    ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';
  END IF;
  
  -- Add business_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_name') THEN
    ALTER TABLE users ADD COLUMN business_name VARCHAR(255);
  END IF;
  
  -- Add business_phone column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_phone') THEN
    ALTER TABLE users ADD COLUMN business_phone VARCHAR(100);
  END IF;
END $$;

-- Create sample data for testing if tables are empty
DO $$
BEGIN
  -- Insert sample business user if none exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE user_type = 'business') THEN
    INSERT INTO users (name, email, user_type, status, business_name, business_phone) 
    VALUES ('Sample Business', 'business@example.com', 'business', 'active', 'Sample Business Inc.', '+1234567890');
  END IF;
  
  -- Insert sample business profile if none exists
  IF NOT EXISTS (SELECT 1 FROM business_profile) THEN
    INSERT INTO business_profile (business_id, name, phone, address, country, currency)
    SELECT id, business_name, business_phone, '123 Business St, City, State', 'US', 'USD'
    FROM users WHERE user_type = 'business' LIMIT 1;
  END IF;
  
  -- Insert sample loyalty program if none exists
  IF NOT EXISTS (SELECT 1 FROM loyalty_programs) THEN
    INSERT INTO loyalty_programs (business_id, name, description, type, category)
    SELECT bp.business_id, 'Sample Loyalty Program', 'A sample loyalty program for testing', 'POINTS', 'retail'
    FROM business_profile bp LIMIT 1;
  END IF;
  
  -- Insert sample customer if none exists
  IF NOT EXISTS (SELECT 1 FROM customers) THEN
    INSERT INTO customers (name, email, tier, phone, address)
    VALUES ('Sample Customer', 'customer@example.com', 'Bronze', '+1987654321', '456 Customer Ave, City, State');
  END IF;
  
  -- Insert sample promotion if none exists
  IF NOT EXISTS (SELECT 1 FROM promo_codes) THEN
    INSERT INTO promo_codes (business_id, code, type, value, currency, name, description)
    SELECT bp.business_id, 'WELCOME10', 'DISCOUNT', 10.00, 'USD', 'Welcome Discount', '10% off your first purchase'
    FROM business_profile bp LIMIT 1;
  END IF;
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Admin businesses schema setup completed successfully';
END $$;