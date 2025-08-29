-- Admin Settings Database Schema Fixes
-- This file adds missing columns required for admin settings functionality

-- Add missing phone column to users table (separate from business_phone)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone VARCHAR(50);
  END IF;
END
$$;

-- Add password_hash column (for backward compatibility, some code expects this name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    -- If password column exists, create password_hash as alias/copy
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password'
    ) THEN
      ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
      -- Copy existing password data to password_hash
      UPDATE users SET password_hash = password WHERE password IS NOT NULL;
    ELSE
      ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
  END IF;
END
$$;

-- Add two_factor_enabled column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'two_factor_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
  END IF;
END
$$;

-- Add notification_settings column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'notification_settings'
  ) THEN
    ALTER TABLE users ADD COLUMN notification_settings JSONB DEFAULT '{
      "email_notifications": true,
      "login_alerts": true,
      "system_updates": true
    }';
  END IF;
END
$$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END
$$;

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';
  END IF;
END
$$;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to users table if it doesn't exist
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_two_factor ON users(two_factor_enabled);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);

-- Create admin_settings table for global admin settings
CREATE TABLE IF NOT EXISTS admin_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  setting_type VARCHAR(50) NOT NULL DEFAULT 'general',
  description TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add trigger to admin_settings table
DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON admin_settings;
CREATE TRIGGER update_admin_settings_updated_at
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin settings
INSERT INTO admin_settings (setting_key, setting_value, setting_type, description) VALUES
  ('site_name', '"Vcarda Loyalty Platform"', 'general', 'Website name'),
  ('default_language', '"en"', 'general', 'Default language for new users'),
  ('maintenance_mode', 'false', 'general', 'Enable maintenance mode'),
  ('user_registration_enabled', 'true', 'security', 'Allow new user registrations'),
  ('password_min_length', '8', 'security', 'Minimum password length'),
  ('session_timeout_minutes', '30', 'security', 'Session timeout in minutes'),
  ('email_notifications_enabled', 'true', 'notifications', 'Enable email notifications'),
  ('default_currency', '"USD"', 'payments', 'Default currency for transactions')
ON CONFLICT (setting_key) DO NOTHING;
