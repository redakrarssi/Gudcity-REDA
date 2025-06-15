import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get database connection string from environment or use default
const DATABASE_URL = process.env.DATABASE_URL || "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

// Create a database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  console.log('Starting QR Code Scanner and Points System Fix');
  console.log('Database URL:', DATABASE_URL.replace(/postgres:\/\/.*?@/, 'postgres://****@'));
  
  try {
    console.log('\n=== 1. Checking program_enrollments table ===');
    
    // Check if program_enrollments table exists
    const programEnrollmentsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'program_enrollments'
      );
    `);
    
    if (programEnrollmentsExists.rows[0].exists) {
      console.log('✅ program_enrollments table exists');
      
      // Check if status column exists in program_enrollments
      const programEnrollmentsColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'program_enrollments'
      `);
      
      const statusColumnExists = programEnrollmentsColumns.rows.some(
        col => col.column_name === 'status'
      );
      
      if (!statusColumnExists) {
        console.log('Adding status column to program_enrollments table...');
        await pool.query(`
          ALTER TABLE program_enrollments 
          ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVE'
        `);
        console.log('✅ Added status column to program_enrollments table');
      } else {
        console.log('✅ Status column already exists in program_enrollments table');
      }
      
      // Check the customer_programs view definition
      console.log('Checking customer_programs view definition...');
      
      // Drop and recreate the view to include the status column
      await pool.query(`
        DROP VIEW IF EXISTS customer_programs;
        
        CREATE OR REPLACE VIEW customer_programs AS
        SELECT 
          id,
          customer_id,
          program_id,
          current_points,
          status,
          last_activity AS updated_at,
          enrolled_at
        FROM program_enrollments;
      `);
      
      console.log('✅ Updated customer_programs view to include status column');
    } else {
      console.log('Creating program_enrollments table...');
      await pool.query(`
        CREATE TABLE program_enrollments (
          id SERIAL PRIMARY KEY,
          customer_id VARCHAR(255) NOT NULL,
          program_id INTEGER NOT NULL,
          current_points INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_program_enrollments_customer ON program_enrollments(customer_id);
        CREATE INDEX idx_program_enrollments_program ON program_enrollments(program_id);
        CREATE UNIQUE INDEX idx_program_enrollments_unique ON program_enrollments(customer_id, program_id);
      `);
      
      console.log('✅ Created program_enrollments table');
      
      // Create the customer_programs view
      await pool.query(`
        CREATE OR REPLACE VIEW customer_programs AS
        SELECT 
          id,
          customer_id,
          program_id,
          current_points,
          status,
          last_activity AS updated_at,
          enrolled_at
        FROM program_enrollments;
      `);
      
      console.log('✅ Created customer_programs view');
    }
    
    // Check loyalty_cards table structure
    console.log('\n=== 2. Checking loyalty_cards table ===');
    
    // Check if the loyalty_cards table exists
    const loyaltyCardsTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'loyalty_cards'
      );
    `);
    
    if (!loyaltyCardsTable.rows[0].exists) {
      console.log('Creating loyalty_cards table...');
      await pool.query(`
        CREATE TABLE loyalty_cards (
          id SERIAL PRIMARY KEY,
          customer_id VARCHAR(255) NOT NULL,
          business_id VARCHAR(255) NOT NULL,
          program_id INTEGER NOT NULL,
          card_type VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
          card_number VARCHAR(50),
          points INTEGER NOT NULL DEFAULT 0,
          points_multiplier NUMERIC(10, 2) DEFAULT 1.0,
          next_reward VARCHAR(255),
          points_to_next INTEGER,
          status VARCHAR(50) DEFAULT 'active',
          qr_code_url TEXT,
          expiry_date TIMESTAMP WITH TIME ZONE,
          benefits TEXT[],
          last_used TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_loyalty_cards_customer_id ON loyalty_cards(customer_id);
        CREATE INDEX idx_loyalty_cards_business_id ON loyalty_cards(business_id);
        CREATE INDEX idx_loyalty_cards_program_id ON loyalty_cards(program_id);
        CREATE INDEX idx_loyalty_cards_is_active ON loyalty_cards(is_active);
        
        CREATE UNIQUE INDEX idx_loyalty_cards_customer_program 
        ON loyalty_cards(customer_id, program_id) 
        WHERE is_active = TRUE;
      `);
      console.log('✅ Created loyalty_cards table');
    } else {
      console.log('✅ Loyalty cards table exists');
      
      // Check if card_number column exists in loyalty_cards table
      const loyaltyCardsColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'loyalty_cards'
      `);
      
      const cardNumberColumnExists = loyaltyCardsColumns.rows.some(
        col => col.column_name === 'card_number'
      );
      
      if (!cardNumberColumnExists) {
        console.log('Adding card_number column to loyalty_cards table...');
        await pool.query(`
          ALTER TABLE loyalty_cards 
          ADD COLUMN card_number VARCHAR(50)
        `);
        console.log('✅ Added card_number column to loyalty_cards table');
      } else {
        console.log('✅ Card number column exists in loyalty_cards table');
      }
      
      // Check if status column exists in loyalty_cards table
      const statusColumnInCardsExists = loyaltyCardsColumns.rows.some(
        col => col.column_name === 'status'
      );
      
      if (!statusColumnInCardsExists) {
        console.log('Adding status column to loyalty_cards table...');
        await pool.query(`
          ALTER TABLE loyalty_cards 
          ADD COLUMN status VARCHAR(50) DEFAULT 'active'
        `);
        console.log('✅ Added status column to loyalty_cards table');
      } else {
        console.log('✅ Status column exists in loyalty_cards table');
      }
    }

    // Check card_activities table
    console.log('\n=== 3. Checking card_activities table ===');
    
    // Check if the card_activities table exists
    const cardActivitiesTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'card_activities'
      );
    `);
    
    if (!cardActivitiesTable.rows[0].exists) {
      console.log('Creating card_activities table...');
      await pool.query(`
        CREATE TABLE card_activities (
          id SERIAL PRIMARY KEY,
          card_id INTEGER NOT NULL,
          activity_type VARCHAR(50) NOT NULL,
          points INTEGER,
          description TEXT,
          transaction_reference VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_card_activities_card_id ON card_activities(card_id);
        CREATE INDEX idx_card_activities_created_at ON card_activities(created_at);
      `);
      console.log('✅ Created card_activities table');
    } else {
      console.log('✅ Card activities table exists');
    }

    // Ensure customer points are updating correctly
    console.log('\n=== 4. Checking customer points system ===');
    
    // Check if customer_points table exists
    const customerPointsTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'customer_points'
      );
    `);
    
    if (!customerPointsTable.rows[0].exists) {
      console.log('Creating customer_points table...');
      await pool.query(`
        CREATE TABLE customer_points (
          id SERIAL PRIMARY KEY,
          customer_id VARCHAR(255) NOT NULL,
          business_id VARCHAR(255) NOT NULL,
          program_id INTEGER,
          points INTEGER NOT NULL,
          source VARCHAR(50) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_customer_points_customer_id ON customer_points(customer_id);
        CREATE INDEX idx_customer_points_business_id ON customer_points(business_id);
      `);
      console.log('✅ Created customer_points table');
    } else {
      console.log('✅ Customer points table exists');
    }

    // Create or update stored procedure to ensure program_enrollments are updated when points are awarded
    console.log('\n=== 5. Creating points update trigger ===');
    
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_customer_program_points()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Create the program enrollment if it doesn't exist
        INSERT INTO program_enrollments (customer_id, program_id, current_points, status, enrolled_at)
        VALUES (NEW.customer_id, NEW.program_id, NEW.points, 'ACTIVE', NOW())
        ON CONFLICT (customer_id, program_id) 
        DO UPDATE SET 
          current_points = program_enrollments.current_points + NEW.points,
          status = 'ACTIVE',
          last_activity = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Check if trigger exists
    const triggerExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'customer_points_update_trigger'
      );
    `);
    
    if (!triggerExists.rows[0].exists) {
      await pool.query(`
        DROP TRIGGER IF EXISTS customer_points_update_trigger ON customer_points;
        CREATE TRIGGER customer_points_update_trigger
        AFTER INSERT ON customer_points
        FOR EACH ROW
        EXECUTE FUNCTION update_customer_program_points();
      `);
      console.log('✅ Created points update trigger');
    } else {
      console.log('✅ Points update trigger already exists');
    }
    
    // Fix QR Scan Failures
    console.log('\n=== 6. Fixing QR scan failures ===');
    
    // Check if qr_scan_logs table exists
    const qrScanLogsTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'qr_scan_logs'
      );
    `);
    
    if (!qrScanLogsTable.rows[0].exists) {
      console.log('Creating qr_scan_logs table...');
      await pool.query(`
        CREATE TABLE qr_scan_logs (
          id SERIAL PRIMARY KEY,
          scan_type VARCHAR(50) NOT NULL,
          scanned_by VARCHAR(255) NOT NULL,
          scanned_data TEXT,
          success BOOLEAN DEFAULT TRUE,
          customer_id VARCHAR(255),
          program_id INTEGER,
          points_awarded INTEGER,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_qr_scan_logs_customer_id ON qr_scan_logs(customer_id);
        CREATE INDEX idx_qr_scan_logs_created_at ON qr_scan_logs(created_at);
      `);
      console.log('✅ Created qr_scan_logs table');
    } else {
      console.log('✅ QR scan logs table exists');
    }
    
    console.log('\n=== All QR code and points system fixes completed ===');
    
  } catch (error) {
    console.error('Error fixing QR scanner points system:', error);
  } finally {
    await pool.end();
  }
}

main();
