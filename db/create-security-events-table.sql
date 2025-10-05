-- Create security events table for SSRF monitoring and alerting
-- This table stores all security-related events for audit and monitoring

CREATE TABLE IF NOT EXISTS security_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id INTEGER,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for efficient querying
  INDEX idx_security_events_type (event_type),
  INDEX idx_security_events_user (user_id),
  INDEX idx_security_events_ip (ip_address),
  INDEX idx_security_events_created (created_at),
  INDEX idx_security_events_type_created (event_type, created_at)
);

-- Create blocked IPs table for temporary IP blocking
CREATE TABLE IF NOT EXISTS blocked_ips (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) UNIQUE NOT NULL,
  blocked_until TIMESTAMP NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for efficient querying
  INDEX idx_blocked_ips_address (ip_address),
  INDEX idx_blocked_ips_until (blocked_until),
  INDEX idx_blocked_ips_active (ip_address, blocked_until)
);

-- Create view for SSRF attack statistics
CREATE OR REPLACE VIEW ssrf_attack_stats AS
SELECT 
  DATE(created_at) as attack_date,
  ip_address,
  COUNT(*) as attempt_count,
  MAX(created_at) as last_attempt
FROM security_events
WHERE event_type = 'ssrf_attempt'
AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), ip_address
ORDER BY attack_date DESC, attempt_count DESC;

-- Create view for recent security alerts
CREATE OR REPLACE VIEW recent_security_alerts AS
SELECT 
  se.ip_address,
  se.details,
  se.created_at,
  COUNT(*) as event_count
FROM security_events se
WHERE se.event_type IN ('ssrf_attempt', 'security_alert')
AND se.created_at > NOW() - INTERVAL '24 hours'
GROUP BY se.ip_address, se.details, se.created_at
ORDER BY se.created_at DESC;

-- Create view for blocked IPs status
CREATE OR REPLACE VIEW active_blocked_ips AS
SELECT 
  ip_address,
  blocked_until,
  reason,
  created_at,
  CASE 
    WHEN blocked_until > NOW() THEN 'active'
    ELSE 'expired'
  END as status
FROM blocked_ips
ORDER BY created_at DESC;

-- Create function to automatically expire blocked IPs
CREATE OR REPLACE FUNCTION expire_blocked_ips()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  DELETE FROM blocked_ips 
  WHERE blocked_until < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get security event summary
CREATE OR REPLACE FUNCTION get_security_summary(hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
  event_type VARCHAR(50),
  event_count BIGINT,
  unique_ips BIGINT,
  latest_event TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    se.event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT se.ip_address) as unique_ips,
    MAX(se.created_at) as latest_event
  FROM security_events se
  WHERE se.created_at > NOW() - INTERVAL '1 hour' * hours_back
  GROUP BY se.event_type
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, DELETE ON security_events TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON blocked_ips TO your_app_user;
-- GRANT SELECT ON ssrf_attack_stats TO your_app_user;
-- GRANT SELECT ON recent_security_alerts TO your_app_user;
-- GRANT SELECT ON active_blocked_ips TO your_app_user;
-- GRANT EXECUTE ON FUNCTION expire_blocked_ips() TO your_app_user;
-- GRANT EXECUTE ON FUNCTION get_security_summary(INTEGER) TO your_app_user;
