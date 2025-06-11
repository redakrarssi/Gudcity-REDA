import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import crypto from 'crypto';

// Load environment variables from .env.local file
try {
  const envFile = readFileSync('.env.local', 'utf8');
  const envVars = envFile.split('\n').filter(line => line.trim() !== '');
  
  for (const line of envVars) {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  }
} catch (error) {
  console.error('Error loading .env.local file:', error.message);
}

// Get DATABASE_URL from environment variables
const DATABASE_URL = process.env.VITE_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

console.log('Database URL found, connecting...');

// Create database connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function setupQrCodeTables() {
  console.log('Setting up Customer QR Code tables...');

  try {
    // Read the SQL file with the schema
    let sql;
    try {
      sql = readFileSync('./db/create_customer_qrcodes.sql', 'utf8');
    } catch (readErr) {
      console.error('Error reading SQL file:', readErr.message);
      console.log('Creating tables directly from script...');
      sql = getQrCodeSchema();
    }

    // Execute the SQL script to create tables
    console.log('Creating customer_qrcodes table and related objects...');
    await pool.query(sql);
    console.log('Database tables and objects created successfully!');

    // Verify the tables were created
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('customer_qrcodes', 'customer_qrcode_scans')
    `);

    if (tables.rows.length === 2) {
      console.log('✅ Tables verified: customer_qrcodes and customer_qrcode_scans');
    } else {
      console.warn(`⚠️ Tables not fully created. Found ${tables.rows.length}/2 tables.`);
      tables.rows.forEach(row => console.log(`- ${row.table_name} exists`));
    }

    // Create a test QR code for verification
    await createTestQrCode();
    
  } catch (error) {
    console.error('Error setting up QR code tables:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

async function createTestQrCode() {
  console.log('\nCreating test QR code to verify functionality...');
  
  try {
    // Get a test customer and business
    const userResult = await pool.query(`
      SELECT id, name, email, user_type FROM users 
      ORDER BY id 
      LIMIT 2
    `);
    
    if (userResult.rows.length < 2) {
      console.log('Not enough users found to create test QR codes');
      return;
    }

    // Find one customer and one business
    let customerId, businessId, customerName;
    
    for (const user of userResult.rows) {
      if (!customerId && user.user_type === 'customer') {
        customerId = user.id;
        customerName = user.name;
      } else if (!businessId && user.user_type === 'business') {
        businessId = user.id;
      }
    }

    if (!customerId || !businessId) {
      console.log('Could not find both a customer and a business user');
      return;
    }

    // Generate a unique QR code ID (UUID v4)
    const qrUniqueId = crypto.randomUUID();
    
    // Generate a verification code
    const verificationCode = generateVerificationCode();

    // Create QR data
    const qrData = {
      type: 'CUSTOMER_CARD',
      customerId: customerId,
      businessId: businessId,
      customerName: customerName,
      timestamp: new Date().toISOString()
    };

    // Create a digital signature for added security
    const signature = crypto
      .createHmac('sha256', 'gudcity-qr-security-key')
      .update(JSON.stringify(qrData))
      .digest('hex');

    // Insert the test QR code
    await pool.query(`
      INSERT INTO customer_qrcodes (
        qr_unique_id,
        customer_id,
        business_id,
        qr_data,
        qr_type,
        status,
        verification_code,
        is_primary,
        digital_signature
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
    `, [
      qrUniqueId,
      customerId,
      businessId,
      qrData,
      'CUSTOMER_CARD',
      'ACTIVE',
      verificationCode,
      true,
      signature
    ]);

    console.log(`✅ Test QR code created for customer ID ${customerId}:`);
    console.log(`   QR Unique ID: ${qrUniqueId}`);
    console.log(`   Verification Code: ${verificationCode}`);
    
  } catch (error) {
    console.error('Error creating test QR code:', error);
  }
}

// Generate a random verification code
function generateVerificationCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars.charAt(randomIndex);
  }
  
  return result;
}

// Fallback schema if SQL file not available
function getQrCodeSchema() {
  return `
    -- Create the customer_qrcodes table if it doesn't exist
    CREATE TABLE IF NOT EXISTS customer_qrcodes (
      id SERIAL PRIMARY KEY,
      qr_unique_id VARCHAR(36) NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      business_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      qr_data JSONB NOT NULL,
      qr_image_url TEXT,
      qr_type VARCHAR(20) NOT NULL CHECK (qr_type IN ('CUSTOMER_CARD', 'LOYALTY_CARD', 'PROMO_CODE', 'MASTER_CARD')),
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED', 'REPLACED')),
      verification_code VARCHAR(10) NOT NULL,
      is_primary BOOLEAN DEFAULT FALSE,
      uses_count INTEGER DEFAULT 0,
      last_used_at TIMESTAMP WITH TIME ZONE,
      expiry_date TIMESTAMP WITH TIME ZONE,
      revoked_reason TEXT,
      revoked_at TIMESTAMP WITH TIME ZONE,
      replaced_by INTEGER REFERENCES customer_qrcodes(id) ON DELETE SET NULL,
      digital_signature TEXT,
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
    DROP TRIGGER IF EXISTS update_customer_qrcodes_updated_at ON customer_qrcodes;
    CREATE TRIGGER update_customer_qrcodes_updated_at
    BEFORE UPDATE ON customer_qrcodes
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_qrcodes_updated_at();

    -- Create a table to track QR code scans
    CREATE TABLE IF NOT EXISTS customer_qrcode_scans (
      id SERIAL PRIMARY KEY,
      qrcode_id INTEGER NOT NULL REFERENCES customer_qrcodes(id) ON DELETE CASCADE,
      scanned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scan_location JSONB,
      scan_device_info JSONB,
      status VARCHAR(20) NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'INVALID', 'SUSPICIOUS')),
      points_awarded INTEGER,
      scan_result JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Add indexes for scan tracking
    CREATE INDEX IF NOT EXISTS idx_customer_qrcode_scans_qrcode_id ON customer_qrcode_scans(qrcode_id);
    CREATE INDEX IF NOT EXISTS idx_customer_qrcode_scans_scanned_by ON customer_qrcode_scans(scanned_by);
    CREATE INDEX IF NOT EXISTS idx_customer_qrcode_scans_status ON customer_qrcode_scans(status);
    CREATE INDEX IF NOT EXISTS idx_customer_qrcode_scans_created_at ON customer_qrcode_scans(created_at);
  `;
}

// Execute the setup
setupQrCodeTables();