-- Business Settings Database Schema

-- Check if the business_settings table exists, create if not
CREATE TABLE IF NOT EXISTS business_settings (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  
  -- Loyalty Settings (JSON format)
  loyalty_settings JSONB DEFAULT '{
    "pointsPerDollar": 10,
    "pointsExpiryDays": 365,
    "minimumPointsRedemption": 100,
    "welcomeBonus": 50
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

-- Add index
CREATE INDEX IF NOT EXISTS idx_business_settings_business_id ON business_settings(business_id);

-- Sample data for testing (uncomment to use)
/*
INSERT INTO business_settings (business_id, name, phone, address, language, country, currency, timezone, tax_id)
VALUES (
  1, -- Replace with a valid user ID
  'Coffee Haven',
  '+1 555-987-6543',
  '123 Main St, Downtown',
  'en',
  'United States',
  'USD',
  'America/New_York',
  'TAX12345678'
);
*/ 