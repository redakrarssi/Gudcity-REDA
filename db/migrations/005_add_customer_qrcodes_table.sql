-- Migration: Add customer_qrcodes table
-- Purpose: Store customer QR codes for loyalty program identification
-- Date: 2025-10-07

-- Create customer_qrcodes table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_qrcodes (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qr_code_data TEXT NOT NULL,
  qr_code_image TEXT,
  digital_signature TEXT,
  encryption_key TEXT,
  card_number VARCHAR(50) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_scanned_at TIMESTAMP,
  scan_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_qrcodes_customer_id ON customer_qrcodes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_qrcodes_card_number ON customer_qrcodes(card_number);
CREATE INDEX IF NOT EXISTS idx_customer_qrcodes_is_active ON customer_qrcodes(is_active);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_qrcodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customer_qrcodes_updated_at_trigger ON customer_qrcodes;
CREATE TRIGGER customer_qrcodes_updated_at_trigger
  BEFORE UPDATE ON customer_qrcodes
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_qrcodes_updated_at();

-- Add comment
COMMENT ON TABLE customer_qrcodes IS 'Stores QR codes for customer identification and loyalty program participation';
COMMENT ON COLUMN customer_qrcodes.qr_code_data IS 'Encrypted QR code data in JSON format';
COMMENT ON COLUMN customer_qrcodes.digital_signature IS 'Digital signature for QR code verification';
COMMENT ON COLUMN customer_qrcodes.card_number IS 'Unique card number in format GC-XXXXXX-C';

