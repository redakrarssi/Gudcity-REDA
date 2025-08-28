import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const DATABASE_URL = "process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || """;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Setting up QR code scanning logs schema...');
    
    // Create the qr_scan_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS qr_scan_logs (
        id SERIAL PRIMARY KEY,
        scan_type VARCHAR(20) NOT NULL,
        scanned_by INTEGER NOT NULL,
        scanned_data TEXT NOT NULL,
        customer_id INTEGER,
        program_id INTEGER,
        promo_code_id INTEGER,
        points_awarded INTEGER,
        success BOOLEAN NOT NULL DEFAULT FALSE,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add indexes to improve query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scanned_by ON qr_scan_logs(scanned_by);
      CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_customer_id ON qr_scan_logs(customer_id);
      CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scan_type ON qr_scan_logs(scan_type);
      CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_created_at ON qr_scan_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_success ON qr_scan_logs(success);
    `);
    
    console.log('QR code scanning logs schema created successfully!');
    
    // Check if the table exists
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'qr_scan_logs'
    `);
    
    if (result.rows.length > 0) {
      console.log('Confirmed table creation: qr_scan_logs');
      
      // Add sample data for testing
      const testUserResult = await pool.query(`
        SELECT id FROM users WHERE email = 'olb_chelsea@hotmail.fr' LIMIT 1
      `);
      
      if (testUserResult.rows.length > 0) {
        const userId = testUserResult.rows[0].id;
        
        // Check if we already have sample data
        const existingData = await pool.query(`
          SELECT COUNT(*) FROM qr_scan_logs WHERE scanned_by = $1
        `, [userId]);
        
        if (parseInt(existingData.rows[0].count) === 0) {
          // Insert sample data
          await pool.query(`
            INSERT INTO qr_scan_logs (
              scan_type, 
              scanned_by, 
              scanned_data, 
              customer_id, 
              points_awarded, 
              success
            ) VALUES 
            (
              'CUSTOMER_CARD', 
              $1, 
              '{"type":"customer_card","customerId":"1","name":"John Smith","timestamp":"2023-10-15T08:30:00Z"}', 
              1, 
              10, 
              TRUE
            ),
            (
              'PROMO_CODE', 
              $1, 
              '{"type":"promo_code","code":"WELCOME50","businessId":"' || $1 || '"}', 
              2, 
              NULL, 
              TRUE
            ),
            (
              'CUSTOMER_CARD', 
              $1, 
              '{"type":"customer_card","customerId":"3","name":"Emily Jones","timestamp":"2023-10-15T14:45:00Z"}', 
              3, 
              10, 
              FALSE
            )
          `, [userId]);
          
          console.log('Added sample QR scan logs');
        } else {
          console.log(`Found ${existingData.rows[0].count} existing QR scan logs, skipping sample data`);
        }
      }
    }
    
    console.log('QR code setup complete! ✅');
  } catch (error) {
    console.error('Error setting up QR code schema:', error);
  } finally {
    await pool.end();
  }
}

main(); 