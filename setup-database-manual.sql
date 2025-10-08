-- Simple Database Setup for Local Development
-- Run this script manually to create the required tables

-- Create security_audit_logs table
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) DEFAULT 'unknown',
  user_agent TEXT DEFAULT 'unknown',
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_security_audit_action_type ON security_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON security_audit_logs(timestamp);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Create revoked_tokens table
CREATE TABLE IF NOT EXISTS revoked_tokens (
  id SERIAL PRIMARY KEY,
  token_id VARCHAR(255) NOT NULL,
  user_id INTEGER NOT NULL,
  revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(100) DEFAULT 'logout',
  UNIQUE(token_id)
);

-- Create auth_tokens table (for token storage)
CREATE TABLE IF NOT EXISTS auth_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  jti VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(jti)
);

-- Create failed_logins table (for rate limiting)
CREATE TABLE IF NOT EXISTS failed_logins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add failed login tracking columns to users table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_failed_login') THEN
        ALTER TABLE users ADD COLUMN last_failed_login TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'account_locked_until') THEN
        ALTER TABLE users ADD COLUMN account_locked_until TIMESTAMP;
    END IF;
END $$;

-- Insert a test record to verify the table works
INSERT INTO security_audit_logs (action_type, resource_id, user_id, ip_address, user_agent, details)
VALUES ('SYSTEM_INIT', 'database_setup', 'system', '127.0.0.1', 'manual_setup', '{"message": "Local database setup completed manually"}')
ON CONFLICT DO NOTHING;

-- Verify the setup
SELECT 'Database setup completed successfully' as status;
SELECT COUNT(*) as security_logs_count FROM security_audit_logs;
SELECT COUNT(*) as refresh_tokens_count FROM refresh_tokens;
SELECT COUNT(*) as revoked_tokens_count FROM revoked_tokens;
SELECT COUNT(*) as auth_tokens_count FROM auth_tokens;
SELECT COUNT(*) as failed_logins_count FROM failed_logins;
