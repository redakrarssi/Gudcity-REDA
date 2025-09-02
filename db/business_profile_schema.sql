-- Business Profile Database Schema

-- Check if the business_profile table exists, create if not
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

-- Add index
CREATE INDEX IF NOT EXISTS idx_business_profile_business_id ON business_profile(business_id); 