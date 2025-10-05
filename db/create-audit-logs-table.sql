-- Create audit logs table for security monitoring
-- This table tracks all authorization attempts and security events

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'denied', 'error')),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_result ON audit_logs(result);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- Add foreign key constraint (optional, may cause issues if users table doesn't exist)
-- ALTER TABLE audit_logs
-- ADD CONSTRAINT fk_audit_user
-- FOREIGN KEY (user_id) REFERENCES users(id)
-- ON DELETE CASCADE;

-- Create view for security monitoring
CREATE OR REPLACE VIEW security_alerts AS
SELECT 
  u.email,
  al.action,
  al.resource_type,
  al.resource_id,
  al.result,
  al.ip_address,
  al.created_at
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.result = 'denied'
AND al.created_at > NOW() - INTERVAL '24 hours'
ORDER BY al.created_at DESC;

-- Create view for successful access patterns
CREATE OR REPLACE VIEW access_patterns AS
SELECT 
  u.email,
  al.action,
  al.resource_type,
  COUNT(*) as access_count,
  MAX(al.created_at) as last_access
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.result = 'success'
AND al.created_at > NOW() - INTERVAL '7 days'
GROUP BY u.email, al.action, al.resource_type
ORDER BY access_count DESC;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT ON audit_logs TO your_app_user;
-- GRANT SELECT ON security_alerts TO your_app_user;
-- GRANT SELECT ON access_patterns TO your_app_user;
