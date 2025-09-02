-- Customer QR Codes Database Schema
-- This table stores QR codes generated for customers with proper validation fields and revocation capability

-- Create the customer_qrcodes table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_qrcodes (
  id SERIAL PRIMARY KEY,
  qr_unique_id VARCHAR(36) NOT NULL UNIQUE, -- UUID for the QR code
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  qr_data JSONB NOT NULL, -- Stores the actual QR code data
  qr_image_url TEXT, -- Optional URL to stored QR code image
  qr_type VARCHAR(20) NOT NULL CHECK (qr_type IN ('CUSTOMER_CARD', 'LOYALTY_CARD', 'PROMO_CODE', 'MASTER_CARD')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED', 'REPLACED')),
  verification_code VARCHAR(10) NOT NULL, -- Short code that can be manually entered for verification
  is_primary BOOLEAN DEFAULT FALSE, -- Indicates if this is the primary QR code for the customer
  uses_count INTEGER DEFAULT 0, -- Tracks how many times this QR code has been used
  last_used_at TIMESTAMP WITH TIME ZONE,
  expiry_date TIMESTAMP WITH TIME ZONE, -- When this QR code expires (NULL means no expiration)
  revoked_reason TEXT, -- Reason why the QR code was revoked, if applicable
  revoked_at TIMESTAMP WITH TIME ZONE, -- When the QR code was revoked, if applicable
  replaced_by INTEGER REFERENCES customer_qrcodes(id) ON DELETE SET NULL, -- ID of the QR code that replaced this one
  digital_signature TEXT, -- For additional security
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_qrcodes_customer_id ON customer_qrcodes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_qrcodes_business_id ON customer_qrcodes(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_qrcodes_qr_unique_id ON customer_qrcodes(qr_unique_id);
CREATE INDEX IF NOT EXISTS idx_customer_qrcodes_verification_code ON customer_qrcodes(verification_code);
CREATE INDEX IF NOT EXISTS idx_customer_qrcodes_status ON customer_qrcodes(status);
CREATE INDEX IF NOT EXISTS idx_customer_qrcodes_last_used_at ON customer_qrcodes(last_used_at);

-- Create index on JSONB data for efficient querying
CREATE INDEX IF NOT EXISTS idx_customer_qrcodes_qr_data_type ON customer_qrcodes((qr_data->>'type'));

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_qrcodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function before each update
CREATE TRIGGER update_customer_qrcodes_updated_at
BEFORE UPDATE ON customer_qrcodes
FOR EACH ROW
EXECUTE FUNCTION update_customer_qrcodes_updated_at();

-- Create a table to track QR code scans with reference to the stored QR codes
CREATE TABLE IF NOT EXISTS customer_qrcode_scans (
  id SERIAL PRIMARY KEY,
  qrcode_id INTEGER NOT NULL REFERENCES customer_qrcodes(id) ON DELETE CASCADE,
  scanned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scan_location JSONB, -- Optional location data
  scan_device_info JSONB, -- Device information
  status VARCHAR(20) NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'INVALID', 'SUSPICIOUS')),
  points_awarded INTEGER,
  scan_result JSONB, -- Details of what happened when scanned
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for scan tracking
CREATE INDEX IF NOT EXISTS idx_customer_qrcode_scans_qrcode_id ON customer_qrcode_scans(qrcode_id);
CREATE INDEX IF NOT EXISTS idx_customer_qrcode_scans_scanned_by ON customer_qrcode_scans(scanned_by);
CREATE INDEX IF NOT EXISTS idx_customer_qrcode_scans_status ON customer_qrcode_scans(status);
CREATE INDEX IF NOT EXISTS idx_customer_qrcode_scans_created_at ON customer_qrcode_scans(created_at);

-- Create a function to generate a random verification code
CREATE OR REPLACE FUNCTION generate_verification_code() 
RETURNS VARCHAR(10) AS $$
DECLARE
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  result VARCHAR(10) := '';
  i INTEGER;
  rand INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    rand := 1 + FLOOR(RANDOM() * LENGTH(chars));
    result := result || SUBSTRING(chars, rand, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql; 