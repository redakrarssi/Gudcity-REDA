import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get the database URL from environment variables or use fallback
const DATABASE_URL = process.env.VITE_DATABASE_URL || "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  // Create a database connection pool
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: true
  });
  
  try {
    console.log('Checking QR code scanner and points system integration...');
    
    // 1. Check if point_transactions table exists
    const pointTransactionsExists = await checkTableExists(pool, 'point_transactions');
    
    if (!pointTransactionsExists) {
      console.log('❌ point_transactions table does not exist. Creating it...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS point_transactions (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL,
          business_id INTEGER NOT NULL,
          program_id INTEGER NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
          points INTEGER NOT NULL,
          transaction_type VARCHAR(50) NOT NULL, -- AWARD, REDEEM, EXPIRE
          reward_id INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_point_transactions_customer ON point_transactions(customer_id);
        CREATE INDEX IF NOT EXISTS idx_point_transactions_business ON point_transactions(business_id);
        CREATE INDEX IF NOT EXISTS idx_point_transactions_program ON point_transactions(program_id);
        CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON point_transactions(created_at);
      `);
      
      console.log('✅ Created point_transactions table successfully.');
    } else {
      console.log('✅ point_transactions table exists.');
    }
    
    // 2. Check for QR code scan logs table
    const qrScanLogsExists = await checkTableExists(pool, 'qr_scan_logs');
    
    if (!qrScanLogsExists) {
      console.log('❌ qr_scan_logs table does not exist. Creating it...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS qr_scan_logs (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL,
          business_id INTEGER NOT NULL,
          scan_type VARCHAR(50) NOT NULL, -- LOYALTY, PROMOTION, MENU, etc.
          points_awarded INTEGER,
          program_id INTEGER REFERENCES loyalty_programs(id) ON DELETE SET NULL,
          successful BOOLEAN DEFAULT TRUE,
          error_message TEXT,
          scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_customer ON qr_scan_logs(customer_id);
        CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_business ON qr_scan_logs(business_id);
        CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scanned ON qr_scan_logs(scanned_at);
      `);
      
      console.log('✅ Created qr_scan_logs table successfully.');
    } else {
      console.log('✅ qr_scan_logs table exists.');
    }
    
    // 3. Check for default handler function in the database for QR code scanning
    console.log('Creating or replacing the handle_qr_scan function...');
    
    await pool.query(`
      CREATE OR REPLACE FUNCTION handle_qr_scan(
        p_customer_id INTEGER,
        p_business_id INTEGER,
        p_scan_type VARCHAR(50),
        p_points INTEGER DEFAULT 1
      ) RETURNS BOOLEAN AS $$
      DECLARE
        v_program_id INTEGER;
        v_success BOOLEAN := TRUE;
        v_error_message TEXT := NULL;
        v_enrolled BOOLEAN;
      BEGIN
        -- Find the default loyalty program for this business
        SELECT id INTO v_program_id 
        FROM loyalty_programs 
        WHERE business_id = p_business_id 
        AND is_active = TRUE
        ORDER BY created_at ASC 
        LIMIT 1;
        
        -- Record the scan regardless of whether points can be awarded
        INSERT INTO qr_scan_logs (
          customer_id, 
          business_id, 
          scan_type, 
          points_awarded, 
          program_id, 
          successful, 
          error_message
        ) VALUES (
          p_customer_id, 
          p_business_id, 
          p_scan_type, 
          CASE WHEN v_program_id IS NOT NULL THEN p_points ELSE 0 END, 
          v_program_id, 
          v_success, 
          v_error_message
        );
        
        -- If no loyalty program exists, we can't award points but scan is recorded
        IF v_program_id IS NULL THEN
          RETURN TRUE;
        END IF;
        
        -- Check if customer is enrolled in program
        SELECT EXISTS (
          SELECT 1 FROM customer_programs 
          WHERE customer_id = p_customer_id::VARCHAR 
          AND program_id = v_program_id
        ) INTO v_enrolled;
        
        -- If not enrolled, enroll them
        IF NOT v_enrolled THEN
          BEGIN
            INSERT INTO customer_programs (
              customer_id, 
              program_id, 
              current_points,
              enrolled_at
            ) VALUES (
              p_customer_id::VARCHAR, 
              v_program_id, 
              p_points,
              NOW()
            );
          EXCEPTION WHEN OTHERS THEN
            -- Handle insert failure but still consider scan successful
            UPDATE qr_scan_logs 
            SET error_message = 'Failed to enroll customer: ' || SQLERRM,
                successful = FALSE
            WHERE id = currval('qr_scan_logs_id_seq');
            RETURN TRUE;
          END;
        ELSE
          -- Update existing points
          BEGIN
            UPDATE customer_programs
            SET current_points = current_points + p_points,
                updated_at = NOW()
            WHERE customer_id = p_customer_id::VARCHAR
            AND program_id = v_program_id;
          EXCEPTION WHEN OTHERS THEN
            -- Handle update failure but still consider scan successful
            UPDATE qr_scan_logs 
            SET error_message = 'Failed to update points: ' || SQLERRM,
                successful = FALSE
            WHERE id = currval('qr_scan_logs_id_seq');
            RETURN TRUE;
          END;
        END IF;
        
        -- Record the transaction
        BEGIN
          INSERT INTO point_transactions (
            customer_id,
            business_id,
            program_id,
            points,
            transaction_type,
            created_at
          ) VALUES (
            p_customer_id,
            p_business_id,
            v_program_id,
            p_points,
            'AWARD',
            NOW()
          );
        EXCEPTION WHEN OTHERS THEN
          -- Handle transaction record failure
          UPDATE qr_scan_logs 
          SET error_message = 'Failed to record transaction: ' || SQLERRM,
              successful = FALSE
          WHERE id = currval('qr_scan_logs_id_seq');
        END;
        
        RETURN TRUE;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Created or updated handle_qr_scan function successfully.');
    
    // 4. Test the function with a sample call
    console.log('Testing QR scan handler with sample data...');
    try {
      // Get a sample customer and business
      const sampleData = await pool.query(`
        SELECT 
          (SELECT id FROM customers ORDER BY id LIMIT 1) AS customer_id,
          (SELECT id FROM users WHERE id IN (SELECT business_id FROM loyalty_programs WHERE is_active = TRUE LIMIT 1)) AS business_id
      `);
      
      if (sampleData.rows.length > 0 && sampleData.rows[0].customer_id && sampleData.rows[0].business_id) {
        const customerId = sampleData.rows[0].customer_id;
        const businessId = sampleData.rows[0].business_id;
        
        console.log(`Testing with customer ID: ${customerId}, business ID: ${businessId}`);
        
        // Call the function
        await pool.query(`
          SELECT handle_qr_scan($1, $2, $3, $4)
        `, [customerId, businessId, 'LOYALTY', 10]);
        
        console.log('✅ Test scan processed successfully.');
        
        // Check if points were awarded
        const pointsCheck = await pool.query(`
          SELECT current_points FROM customer_programs 
          WHERE customer_id = $1::VARCHAR 
          ORDER BY updated_at DESC LIMIT 1
        `, [customerId]);
        
        if (pointsCheck.rows.length > 0) {
          console.log(`✅ Customer now has ${pointsCheck.rows[0].current_points} points.`);
        } else {
          console.log('⚠️ Could not verify points for customer.');
        }
      } else {
        console.log('⚠️ Could not find sample customer and business for testing.');
      }
    } catch (error) {
      console.error('Error testing QR scan handler:', error);
    }
    
    console.log('QR code scanning and points system check completed.');
    
  } catch (error) {
    console.error('Error checking QR code and points system:', error);
  } finally {
    await pool.end();
  }
}

// Helper function to check if a table exists
async function checkTableExists(pool, tableName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = $1
    )
  `, [tableName]);
  
  return result.rows[0].exists;
}

// Run the script
main();