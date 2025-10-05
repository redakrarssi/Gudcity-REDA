-- Create token blacklist table for secure token revocation
-- This table stores revoked JWT tokens to prevent their reuse

CREATE TABLE IF NOT EXISTS revoked_tokens (
  id SERIAL PRIMARY KEY,
  token_jti VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  reason VARCHAR(100) DEFAULT 'manual_revocation',
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Indexes for efficient querying
  INDEX idx_revoked_tokens_jti (token_jti),
  INDEX idx_revoked_tokens_user (user_id),
  INDEX idx_revoked_tokens_expires (expires_at),
  INDEX idx_revoked_tokens_reason (reason)
);

-- Create cleanup procedure for expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM revoked_tokens 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for security monitoring
CREATE OR REPLACE VIEW token_revocation_stats AS
SELECT 
  DATE(revoked_at) as revocation_date,
  reason,
  COUNT(*) as revocation_count,
  COUNT(DISTINCT user_id) as affected_users
FROM revoked_tokens
WHERE revoked_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(revoked_at), reason
ORDER BY revocation_date DESC;

-- Create view for recent security events
CREATE OR REPLACE VIEW recent_token_revocations AS
SELECT 
  rt.token_jti,
  rt.user_id,
  rt.revoked_at,
  rt.reason,
  rt.ip_address,
  u.email,
  u.user_type
FROM revoked_tokens rt
LEFT JOIN users u ON rt.user_id = u.id
WHERE rt.revoked_at > NOW() - INTERVAL '24 hours'
ORDER BY rt.revoked_at DESC;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, DELETE ON revoked_tokens TO your_app_user;
-- GRANT SELECT ON token_revocation_stats TO your_app_user;
-- GRANT SELECT ON recent_token_revocations TO your_app_user;
