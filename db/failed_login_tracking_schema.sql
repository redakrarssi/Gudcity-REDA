-- Failed Login Tracking Schema for GudCity REDA
-- Adds comprehensive failed login attempt tracking and account security measures

-- Create table for tracking failed login attempts
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  failure_reason VARCHAR(100) DEFAULT 'invalid_credentials', -- invalid_credentials, account_locked, account_disabled, etc.
  
  -- Indexes for efficient querying
  INDEX idx_failed_login_email (email),
  INDEX idx_failed_login_ip (ip_address),
  INDEX idx_failed_login_attempted_at (attempted_at)
);

-- Add failed login tracking columns to users table if they don't exist
DO $$
BEGIN
  -- Add failed_login_attempts column to track per-user attempts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'failed_login_attempts'
  ) THEN
    ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
  END IF;

  -- Add last_failed_login column to track when last failure occurred
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_failed_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_failed_login TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add account_locked_until column for account lockout functionality
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'account_locked_until'
  ) THEN
    ALTER TABLE users ADD COLUMN account_locked_until TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add status column if it doesn't exist (for banned, suspended, active users)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_users_failed_login_attempts ON users(failed_login_attempts);
CREATE INDEX IF NOT EXISTS idx_users_last_failed_login ON users(last_failed_login);
CREATE INDEX IF NOT EXISTS idx_users_account_locked_until ON users(account_locked_until);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Create a function to reset failed login attempts on successful login
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

-- Create a function to record failed login attempt
CREATE OR REPLACE FUNCTION record_failed_login_attempt(
  user_email VARCHAR(255),
  client_ip INET DEFAULT NULL,
  client_user_agent TEXT DEFAULT NULL,
  reason VARCHAR(100) DEFAULT 'invalid_credentials'
)
RETURNS INTEGER AS $$
DECLARE
  current_attempts INTEGER := 0;
  lockout_duration INTERVAL := '15 minutes';
  max_attempts INTEGER := 5;
BEGIN
  -- Insert failed attempt record
  INSERT INTO failed_login_attempts (email, ip_address, user_agent, failure_reason)
  VALUES (user_email, client_ip, client_user_agent, reason);
  
  -- Update user record with failed attempt
  UPDATE users 
  SET 
    failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
    last_failed_login = CURRENT_TIMESTAMP
  WHERE email = user_email;
  
  -- Get updated attempt count
  SELECT COALESCE(failed_login_attempts, 0) INTO current_attempts
  FROM users WHERE email = user_email;
  
  -- If max attempts exceeded, lock the account
  IF current_attempts >= max_attempts THEN
    UPDATE users 
    SET account_locked_until = CURRENT_TIMESTAMP + lockout_duration
    WHERE email = user_email;
  END IF;
  
  RETURN current_attempts;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(user_email VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
  locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT account_locked_until INTO locked_until
  FROM users WHERE email = user_email;
  
  -- If no lockout time set, account is not locked
  IF locked_until IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If lockout time has passed, clear it and return false
  IF locked_until <= CURRENT_TIMESTAMP THEN
    UPDATE users 
    SET 
      account_locked_until = NULL,
      failed_login_attempts = 0
    WHERE email = user_email;
    RETURN FALSE;
  END IF;
  
  -- Account is still locked
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get remaining lockout time
CREATE OR REPLACE FUNCTION get_lockout_remaining_time(user_email VARCHAR(255))
RETURNS INTERVAL AS $$
DECLARE
  locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT account_locked_until INTO locked_until
  FROM users WHERE email = user_email;
  
  IF locked_until IS NULL OR locked_until <= CURRENT_TIMESTAMP THEN
    RETURN INTERVAL '0';
  END IF;
  
  RETURN locked_until - CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create a view for security monitoring
CREATE OR REPLACE VIEW failed_login_summary AS
SELECT 
  email,
  COUNT(*) as total_failed_attempts,
  MAX(attempted_at) as last_failed_attempt,
  COUNT(DISTINCT ip_address) as distinct_ips,
  array_agg(DISTINCT failure_reason) as failure_reasons
FROM failed_login_attempts
WHERE attempted_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY email
ORDER BY total_failed_attempts DESC;

-- Comment explaining the schema
COMMENT ON TABLE failed_login_attempts IS 'Tracks all failed login attempts for security monitoring and forensics';
COMMENT ON FUNCTION record_failed_login_attempt IS 'Records a failed login attempt and applies account lockout if threshold exceeded';
COMMENT ON FUNCTION is_account_locked IS 'Checks if an account is currently locked due to failed login attempts';
COMMENT ON FUNCTION reset_failed_login_attempts IS 'Resets failed login counters on successful authentication';
COMMENT ON VIEW failed_login_summary IS 'Summary view of failed login attempts for security monitoring';
