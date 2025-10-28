-- Security Audit Logs Schema for GudCity REDA
-- Provides comprehensive security logging and monitoring for authentication events

-- Create security_audit_logs table
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(100) NOT NULL, -- FAILED_LOGIN, SUCCESSFUL_LOGIN, ACCOUNT_LOCKOUT, SUSPICIOUS_ACTIVITY, etc.
  resource_id VARCHAR(255) NOT NULL, -- Resource affected (e.g., 'authentication', user_id)
  user_id VARCHAR(255) NOT NULL, -- User identifier (email or ID)
  ip_address VARCHAR(45) DEFAULT 'unknown', -- IPv4 or IPv6 address
  user_agent TEXT DEFAULT 'unknown', -- Browser/client user agent
  details JSONB DEFAULT '{}', -- Additional event details in JSON format
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for efficient querying
  INDEX idx_security_audit_action_type (action_type),
  INDEX idx_security_audit_user_id (user_id),
  INDEX idx_security_audit_ip_address (ip_address),
  INDEX idx_security_audit_timestamp (timestamp)
);

-- Create index on JSONB details column for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_security_audit_details ON security_audit_logs USING GIN (details);

-- Create a function to clean up old security audit logs (maintenance)
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

-- Create a view for recent security events (last 24 hours)
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

-- Create a view for failed login analysis
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

-- Create a view for suspicious activity monitoring
CREATE OR REPLACE VIEW suspicious_activity_monitor AS
SELECT 
  ip_address,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as affected_users,
  array_agg(DISTINCT action_type) as event_types,
  MAX(timestamp) as last_event
FROM security_audit_logs
WHERE action_type LIKE 'SUSPICIOUS_%'
AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY ip_address
ORDER BY event_count DESC;

-- Comment explaining the schema
COMMENT ON TABLE security_audit_logs IS 'Comprehensive security audit log for tracking authentication and security-related events';
COMMENT ON FUNCTION cleanup_old_security_logs IS 'Removes security audit logs older than specified retention period (default 90 days)';
COMMENT ON VIEW recent_security_events IS 'View of security events from the last 24 hours for monitoring dashboard';
COMMENT ON VIEW failed_login_analysis IS 'Analysis of failed login attempts grouped by user for security monitoring';
COMMENT ON VIEW suspicious_activity_monitor IS 'Monitor suspicious activities grouped by IP address for threat detection';

