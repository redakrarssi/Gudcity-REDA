-- QR Code Integrity and Archiving Schema
-- This schema defines tables for QR code integrity checks and archiving expired/revoked codes

-- Create the archive table for expired, revoked, or replaced QR codes
CREATE TABLE IF NOT EXISTS qr_codes_archive (
  id SERIAL PRIMARY KEY,
  original_id INTEGER NOT NULL,
  qr_unique_id VARCHAR(36) NOT NULL,
  customer_id INTEGER NOT NULL,
  qr_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  qr_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create indexes on the archive table
CREATE INDEX IF NOT EXISTS idx_qr_codes_archive_original_id ON qr_codes_archive(original_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_archive_qr_unique_id ON qr_codes_archive(qr_unique_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_archive_customer_id ON qr_codes_archive(customer_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_archive_archived_at ON qr_codes_archive(archived_at);

-- Create a table to log integrity check results
CREATE TABLE IF NOT EXISTS qr_code_integrity_logs (
  id SERIAL PRIMARY KEY,
  check_type VARCHAR(50) NOT NULL,
  total_checked INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  orphaned INTEGER NOT NULL,
  repaired INTEGER NOT NULL,
  error_details JSONB,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on the integrity logs
CREATE INDEX IF NOT EXISTS idx_qr_code_integrity_logs_check_type ON qr_code_integrity_logs(check_type);
CREATE INDEX IF NOT EXISTS idx_qr_code_integrity_logs_created_at ON qr_code_integrity_logs(created_at);

-- Create a table to track scheduled integrity checks
CREATE TABLE IF NOT EXISTS qr_code_integrity_schedule (
  id SERIAL PRIMARY KEY,
  check_type VARCHAR(50) NOT NULL,
  frequency_hours INTEGER NOT NULL,
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  configuration JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on the schedule table
CREATE INDEX IF NOT EXISTS idx_qr_code_integrity_schedule_next_run ON qr_code_integrity_schedule(next_run);
CREATE INDEX IF NOT EXISTS idx_qr_code_integrity_schedule_is_active ON qr_code_integrity_schedule(is_active);

-- Update trigger function for the schedule table
CREATE OR REPLACE FUNCTION update_qr_integrity_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_qr_integrity_schedule_timestamp
BEFORE UPDATE ON qr_code_integrity_schedule
FOR EACH ROW
EXECUTE FUNCTION update_qr_integrity_schedule_timestamp();

-- Insert default schedule for integrity checks (daily) if not exists
INSERT INTO qr_code_integrity_schedule 
  (check_type, frequency_hours, next_run, configuration)
SELECT 
  'user-qrcode-relationship', 
  24, 
  (CURRENT_TIMESTAMP + INTERVAL '1 day'), 
  '{"repairMode": true, "batchSize": 500, "logLevel": "detailed"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM qr_code_integrity_schedule WHERE check_type = 'user-qrcode-relationship'
);

-- Insert default schedule for QR code cleanup (weekly) if not exists
INSERT INTO qr_code_integrity_schedule 
  (check_type, frequency_hours, next_run, configuration)
SELECT 
  'expired-qrcode-cleanup', 
  168, 
  (CURRENT_TIMESTAMP + INTERVAL '7 days'), 
  '{"olderThan": 90, "archiveMode": true, "limit": 1000}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM qr_code_integrity_schedule WHERE check_type = 'expired-qrcode-cleanup'
); 