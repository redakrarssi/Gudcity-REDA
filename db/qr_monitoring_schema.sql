-- QR Code Monitoring System Schema

-- Table for recording all QR code scan attempts
CREATE TABLE IF NOT EXISTS qr_scan_attempts (
  id SERIAL PRIMARY KEY,
  qr_code_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  scan_type VARCHAR(50) NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes for efficient querying
  INDEX idx_qr_scan_qrcode (qr_code_id),
  INDEX idx_qr_scan_ip (ip_address),
  INDEX idx_qr_scan_timestamp (timestamp),
  INDEX idx_qr_scan_user (user_id),
  INDEX idx_qr_scan_success (success)
);

-- Table for storing security audit logs
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  details JSONB,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes for efficient querying
  INDEX idx_audit_action (action_type),
  INDEX idx_audit_resource (resource_id),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_timestamp (timestamp)
);

-- Table for recording suspicious QR code activities
CREATE TABLE IF NOT EXISTS suspicious_qr_activities (
  id SERIAL PRIMARY KEY,
  qr_code_id VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  failed_attempts INTEGER NOT NULL,
  detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'DETECTED', -- DETECTED, INVESTIGATING, RESOLVED, FALSE_POSITIVE
  resolution_notes TEXT,
  
  -- Indexes
  INDEX idx_suspicious_qrcode (qr_code_id),
  INDEX idx_suspicious_ip (ip_address),
  INDEX idx_suspicious_status (status),
  INDEX idx_suspicious_detected (detected_at)
);

-- Table for system alerts
CREATE TABLE IF NOT EXISTS system_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
  message TEXT NOT NULL,
  details JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  
  -- Indexes
  INDEX idx_alerts_type (alert_type),
  INDEX idx_alerts_severity (severity),
  INDEX idx_alerts_created (created_at),
  INDEX idx_alerts_read (is_read)
);

-- Create function to automatically archive old data
CREATE OR REPLACE FUNCTION archive_old_monitoring_data()
RETURNS void AS $$
BEGIN
  -- Archive old scan attempts (older than 90 days)
  INSERT INTO qr_scan_attempts_archive
  SELECT * FROM qr_scan_attempts
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Delete archived records
  DELETE FROM qr_scan_attempts
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Archive resolved suspicious activities (older than 30 days)
  INSERT INTO suspicious_qr_activities_archive
  SELECT * FROM suspicious_qr_activities
  WHERE status IN ('RESOLVED', 'FALSE_POSITIVE')
  AND detected_at < NOW() - INTERVAL '30 days';
  
  -- Delete archived suspicious activities
  DELETE FROM suspicious_qr_activities
  WHERE status IN ('RESOLVED', 'FALSE_POSITIVE')
  AND detected_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create archive tables
CREATE TABLE IF NOT EXISTS qr_scan_attempts_archive (
  LIKE qr_scan_attempts INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS suspicious_qr_activities_archive (
  LIKE suspicious_qr_activities INCLUDING ALL
);

-- Add comment to tables
COMMENT ON TABLE qr_scan_attempts IS 'Records all QR code scan attempts for security monitoring';
COMMENT ON TABLE security_audit_logs IS 'Audit trail for security-sensitive operations';
COMMENT ON TABLE suspicious_qr_activities IS 'Detected suspicious activities related to QR codes';
COMMENT ON TABLE system_alerts IS 'System-generated security and monitoring alerts';
COMMENT ON TABLE qr_scan_attempts_archive IS 'Archive of old QR code scan attempts';
COMMENT ON TABLE suspicious_qr_activities_archive IS 'Archive of old suspicious QR code activities'; 