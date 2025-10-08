-- Fix Local Database Issues - December 2024
-- This script addresses the missing security_audit_logs table and other local development issues

-- Create security_audit_logs table if it doesn't exist
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

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_audit_action_type ON security_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_ip_address ON security_audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON security_audit_logs(timestamp);

-- Create index on JSONB details column for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_security_audit_details ON security_audit_logs USING GIN (details);

-- Create refresh_tokens table if it doesn't exist (needed for JWT refresh functionality)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Create index for refresh tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Create revoked_tokens table if it doesn't exist (for token blacklisting)
CREATE TABLE IF NOT EXISTS revoked_tokens (
  id SERIAL PRIMARY KEY,
  token_id VARCHAR(255) NOT NULL,
  user_id INTEGER NOT NULL,
  revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(100) DEFAULT 'logout',
  UNIQUE(token_id)
);

-- Create index for revoked tokens
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_token_id ON revoked_tokens(token_id);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_user_id ON revoked_tokens(user_id);

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

-- Create functions for failed login tracking
CREATE OR REPLACE FUNCTION record_failed_login_attempt(user_email VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET 
        failed_login_attempts = failed_login_attempts + 1,
        last_failed_login = CURRENT_TIMESTAMP,
        account_locked_until = CASE 
            WHEN failed_login_attempts >= 4 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
            ELSE account_locked_until
        END
    WHERE email = user_email;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_account_locked(user_email VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    locked_until TIMESTAMP;
BEGIN
    SELECT account_locked_until INTO locked_until
    FROM users 
    WHERE email = user_email;
    
    IF locked_until IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF locked_until > CURRENT_TIMESTAMP THEN
        RETURN TRUE;
    ELSE
        -- Unlock the account if lockout period has expired
        UPDATE users 
        SET account_locked_until = NULL, failed_login_attempts = 0
        WHERE email = user_email;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_failed_login_attempts(user_email VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET 
        failed_login_attempts = 0,
        last_failed_login = NULL,
        account_locked_until = NULL
    WHERE email = user_email;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_lockout_remaining_time(user_email VARCHAR(255))
RETURNS INTEGER AS $$
DECLARE
    locked_until TIMESTAMP;
    remaining_seconds INTEGER;
BEGIN
    SELECT account_locked_until INTO locked_until
    FROM users 
    WHERE email = user_email;
    
    IF locked_until IS NULL OR locked_until <= CURRENT_TIMESTAMP THEN
        RETURN 0;
    END IF;
    
    remaining_seconds := EXTRACT(EPOCH FROM (locked_until - CURRENT_TIMESTAMP))::INTEGER;
    RETURN remaining_seconds;
END;
$$ LANGUAGE plpgsql;

-- Create cleanup function for old security logs
CREATE OR REPLACE FUNCTION cleanup_old_security_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM security_audit_logs
    WHERE timestamp < CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create views for security monitoring
CREATE OR REPLACE VIEW recent_security_events AS
SELECT 
    id,
    action_type,
    resource_id,
    user_id,
    ip_address,
    user_agent,
    details,
    timestamp
FROM security_audit_logs
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY timestamp DESC;

CREATE OR REPLACE VIEW failed_login_analysis AS
SELECT 
    user_id as email,
    COUNT(*) as failed_attempts,
    COUNT(DISTINCT ip_address) as unique_ips,
    MAX(timestamp) as last_attempt,
    MIN(timestamp) as first_attempt,
    array_agg(DISTINCT ip_address) as ip_addresses
FROM security_audit_logs
WHERE action_type = 'FAILED_LOGIN'
AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY user_id
ORDER BY failed_attempts DESC;

-- Add comments
COMMENT ON TABLE security_audit_logs IS 'Comprehensive security audit log for tracking authentication and security-related events';
COMMENT ON TABLE refresh_tokens IS 'Stores JWT refresh tokens for secure token management';
COMMENT ON TABLE revoked_tokens IS 'Blacklist for revoked JWT tokens to prevent reuse';
COMMENT ON FUNCTION cleanup_old_security_logs IS 'Removes security audit logs older than specified retention period (default 90 days)';
COMMENT ON VIEW recent_security_events IS 'View of security events from the last 24 hours for monitoring dashboard';
COMMENT ON VIEW failed_login_analysis IS 'Analysis of failed login attempts grouped by user for security monitoring';

-- Insert a test record to verify the table works
INSERT INTO security_audit_logs (action_type, resource_id, user_id, ip_address, user_agent, details)
VALUES ('SYSTEM_INIT', 'database_setup', 'system', '127.0.0.1', 'database_migration', '{"message": "Local database setup completed"}')
ON CONFLICT DO NOTHING;

-- Verify the setup
SELECT 'Database setup completed successfully' as status;
SELECT COUNT(*) as security_logs_count FROM security_audit_logs;
SELECT COUNT(*) as refresh_tokens_count FROM refresh_tokens;
SELECT COUNT(*) as revoked_tokens_count FROM revoked_tokens;
