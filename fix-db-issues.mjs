import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const pool = new Pool({
  connectionString: "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  ssl: true
});

async function main() {
  try {
    console.log('Starting database fixes...');
    
    // 1. Fix promo_codes table - rename end_date to expiry_date
    console.log('\n=== 1. Fixing promo_codes table ===');
    
    // Check if expiry_date column exists in promo_codes
    const expiryDateExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'promo_codes' AND column_name = 'expiry_date'
      );
    `);
    
    if (!expiryDateExists.rows[0].exists) {
      console.log('Adding expiry_date column to promo_codes table...');
      
      // Check if end_date column exists
      const endDateExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'promo_codes' AND column_name = 'end_date'
        );
      `);
      
      if (endDateExists.rows[0].exists) {
        // Rename end_date to expiry_date
        await pool.query(`
          ALTER TABLE promo_codes 
          RENAME COLUMN end_date TO expiry_date;
        `);
        console.log('✅ Renamed end_date to expiry_date in promo_codes table');
      } else {
        // Add expiry_date column if neither exists
        await pool.query(`
          ALTER TABLE promo_codes 
          ADD COLUMN expiry_date TIMESTAMP;
        `);
        console.log('✅ Added expiry_date column to promo_codes table');
      }
    } else {
      console.log('✅ expiry_date column already exists in promo_codes table');
    }
    
    // 2. Fix customer_programs view
    console.log('\n=== 2. Fixing customer_programs view ===');
    
    // Check if customer_programs view exists
    const customerProgramsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'customer_programs' AND table_type = 'VIEW'
      );
    `);
    
    // Check if program_enrollments table exists
    const programEnrollmentsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'program_enrollments' AND table_type = 'BASE TABLE'
      );
    `);
    
    if (!programEnrollmentsExists.rows[0].exists) {
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
    } else {
      console.log('✅ program_enrollments table already exists');
      
      // Check if status column exists in program_enrollments
      const statusExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'program_enrollments' AND column_name = 'status'
        );
      `);
      
      if (!statusExists.rows[0].exists) {
        console.log('Adding status column to program_enrollments table...');
        await pool.query(`
          ALTER TABLE program_enrollments 
          ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVE';
        `);
        console.log('✅ Added status column to program_enrollments table');
      }
    }
    
    // Create or update the customer_programs view
    console.log('Creating/updating customer_programs view...');
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
    console.log('✅ Created/updated customer_programs view');
    
    // 3. Fix loyalty_cards table
    console.log('\n=== 3. Fixing loyalty_cards table ===');
    
    // Check if loyalty_cards table exists
    const loyaltyCardsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'loyalty_cards' AND table_type = 'BASE TABLE'
      );
    `);
    
    if (!loyaltyCardsExists.rows[0].exists) {
      console.log('Creating loyalty_cards table...');
      await pool.query(`
        CREATE TABLE loyalty_cards (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL,
          business_id INTEGER NOT NULL,
          program_id INTEGER NOT NULL,
          card_type VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
          card_number VARCHAR(50),
          tier VARCHAR(50) DEFAULT 'STANDARD',
          points INTEGER NOT NULL DEFAULT 0,
          points_multiplier NUMERIC(3, 2) DEFAULT 1.0,
          promo_code VARCHAR(50),
          next_reward VARCHAR(255),
          points_to_next INTEGER,
          expiry_date DATE,
          benefits TEXT[],
          last_used TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT TRUE,
          available_rewards JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_loyalty_cards_customer_id ON loyalty_cards(customer_id);
        CREATE INDEX idx_loyalty_cards_business_id ON loyalty_cards(business_id);
        CREATE INDEX idx_loyalty_cards_program_id ON loyalty_cards(program_id);
        CREATE INDEX idx_loyalty_cards_is_active ON loyalty_cards(is_active);
      `);
      console.log('✅ Created loyalty_cards table');
      
      // Create card_activities table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS card_activities (
          id SERIAL PRIMARY KEY,
          card_id INTEGER NOT NULL,
          activity_type VARCHAR(50) NOT NULL,
          points INTEGER,
          description TEXT,
          transaction_reference VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_card_activities_card_id ON card_activities(card_id);
      `);
      console.log('✅ Created card_activities table');
    } else {
      console.log('✅ loyalty_cards table already exists');
      
      // Check and add missing columns to loyalty_cards
      const columns = [
        { name: 'card_number', type: 'VARCHAR(50)' },
        { name: 'tier', type: 'VARCHAR(50) DEFAULT \'STANDARD\'' },
        { name: 'points_multiplier', type: 'NUMERIC(3, 2) DEFAULT 1.0' },
        { name: 'promo_code', type: 'VARCHAR(50)' },
        { name: 'available_rewards', type: 'JSONB' }
      ];
      
      for (const column of columns) {
        const columnExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'loyalty_cards' AND column_name = '${column.name}'
          );
        `);
        
        if (!columnExists.rows[0].exists) {
          console.log(`Adding ${column.name} column to loyalty_cards table...`);
          await pool.query(`
            ALTER TABLE loyalty_cards 
            ADD COLUMN ${column.name} ${column.type};
          `);
          console.log(`✅ Added ${column.name} column to loyalty_cards table`);
        }
      }
    }
    
    // 4. Fix QR scanning functionality
    console.log('\n=== 4. Fixing QR scanning functionality ===');
    
    // Check if the customer_qrcodes table exists
    const qrCodesExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'customer_qrcodes' AND table_type = 'BASE TABLE'
      );
    `);
    
    if (!qrCodesExists.rows[0].exists) {
      console.log('Creating customer_qrcodes table...');
      await pool.query(`
        CREATE TABLE customer_qrcodes (
          id SERIAL PRIMARY KEY,
          qr_unique_id VARCHAR(36) NOT NULL UNIQUE,
          customer_id INTEGER NOT NULL,
          business_id INTEGER,
          qr_data JSONB NOT NULL,
          qr_image_url TEXT,
          qr_type VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
          verification_code VARCHAR(10) NOT NULL,
          is_primary BOOLEAN DEFAULT FALSE,
          uses_count INTEGER DEFAULT 0,
          last_used_at TIMESTAMP WITH TIME ZONE,
          expiry_date TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_customer_qrcodes_customer_id ON customer_qrcodes(customer_id);
        CREATE INDEX idx_customer_qrcodes_business_id ON customer_qrcodes(business_id);
      `);
      console.log('✅ Created customer_qrcodes table');
    }
    
    console.log('\nAll database fixes completed successfully!');
    
  } catch (error) {
    console.error('Error fixing database:', error);
  } finally {
    await pool.end();
  }
}

// Run the main function
main().catch(console.error);
