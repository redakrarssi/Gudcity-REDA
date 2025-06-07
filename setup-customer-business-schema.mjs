import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Create a database connection
const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Setting up customer-business relationship schema...');
    
    // Check if necessary tables exist
    const tables = [
      'users', 
      'customers', 
      'loyalty_programs', 
      'program_enrollments', 
      'loyalty_transactions',
      'loyalty_cards'
    ];
    
    for (const table of tables) {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [table]);
      
      const exists = tableCheck.rows[0].exists;
      console.log(`Table ${table}: ${exists ? 'EXISTS' : 'MISSING'}`);
      
      if (!exists) {
        console.log(`Creating table: ${table}`);
        
        switch (table) {
          case 'users':
            await pool.query(`
              CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'customer',
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              );
            `);
            break;
            
          case 'customers':
            await pool.query(`
              CREATE TABLE customers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                tier VARCHAR(50) DEFAULT 'Bronze',
                loyalty_points INTEGER DEFAULT 0,
                total_spent NUMERIC(10, 2) DEFAULT 0,
                visits INTEGER DEFAULT 0,
                birthday DATE,
                last_visit TIMESTAMP WITH TIME ZONE,
                joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                phone VARCHAR(50),
                address TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              );
              
              CREATE INDEX idx_customers_user_id ON customers(user_id);
              CREATE INDEX idx_customers_email ON customers(email);
              CREATE INDEX idx_customers_tier ON customers(tier);
            `);
            break;
            
          case 'loyalty_programs':
            await pool.query(`
              CREATE TABLE loyalty_programs (
                id SERIAL PRIMARY KEY,
                business_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                type VARCHAR(50) NOT NULL DEFAULT 'POINTS',
                point_value NUMERIC(10, 2) DEFAULT 1.0,
                status VARCHAR(50) DEFAULT 'ACTIVE',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              );
              
              CREATE INDEX idx_loyalty_programs_business ON loyalty_programs(business_id);
            `);
            break;
            
          case 'program_enrollments':
            await pool.query(`
              CREATE TABLE program_enrollments (
                id SERIAL PRIMARY KEY,
                customer_id VARCHAR(255) NOT NULL,
                program_id INTEGER REFERENCES loyalty_programs(id) ON DELETE CASCADE,
                current_points INTEGER DEFAULT 0,
                status VARCHAR(50) DEFAULT 'ACTIVE',
                last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              );
              
              CREATE INDEX idx_program_enrollments_customer ON program_enrollments(customer_id);
              CREATE INDEX idx_program_enrollments_program ON program_enrollments(program_id);
              CREATE UNIQUE INDEX idx_program_enrollments_unique ON program_enrollments(customer_id, program_id);
            `);
            break;
            
          case 'loyalty_transactions':
            await pool.query(`
              CREATE TABLE loyalty_transactions (
                id SERIAL PRIMARY KEY,
                customer_id VARCHAR(255) NOT NULL,
                business_id VARCHAR(255) NOT NULL,
                program_id INTEGER REFERENCES loyalty_programs(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL,
                points INTEGER NOT NULL,
                amount NUMERIC(10, 2),
                status VARCHAR(50) DEFAULT 'COMPLETED',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              );
              
              CREATE INDEX idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
              CREATE INDEX idx_loyalty_transactions_business ON loyalty_transactions(business_id);
              CREATE INDEX idx_loyalty_transactions_program ON loyalty_transactions(program_id);
              CREATE INDEX idx_loyalty_transactions_created ON loyalty_transactions(created_at);
            `);
            break;
            
          case 'loyalty_cards':
            await pool.query(`
              CREATE TABLE loyalty_cards (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER NOT NULL,
                business_id INTEGER NOT NULL,
                program_id INTEGER REFERENCES loyalty_programs(id) ON DELETE CASCADE,
                card_type VARCHAR(50) NOT NULL,
                points INTEGER NOT NULL DEFAULT 0,
                next_reward VARCHAR(255),
                points_to_next INTEGER,
                expiry_date DATE,
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
            break;
        }
        
        console.log(`✅ Created table: ${table}`);
      }
    }
    
    // Check if necessary columns exist
    console.log('\nChecking for necessary columns...');
    
    // Check for business_id in loyalty_programs
    const businessIdCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'loyalty_programs' AND column_name = 'business_id'
      );
    `);
    
    if (!businessIdCheck.rows[0].exists) {
      console.log('Adding business_id column to loyalty_programs table...');
      await pool.query(`ALTER TABLE loyalty_programs ADD COLUMN business_id VARCHAR(255) NOT NULL DEFAULT '1';`);
      console.log('✅ Added business_id column');
    }
    
    // Check for customer_id in program_enrollments
    const customerIdCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'program_enrollments' AND column_name = 'customer_id'
      );
    `);
    
    if (!customerIdCheck.rows[0].exists) {
      console.log('Adding customer_id column to program_enrollments table...');
      await pool.query(`ALTER TABLE program_enrollments ADD COLUMN customer_id VARCHAR(255) NOT NULL DEFAULT '1';`);
      console.log('✅ Added customer_id column');
    }
    
    // Check for necessary indices
    console.log('\nChecking for necessary indices...');
    
    const indices = [
      { table: 'loyalty_programs', column: 'business_id', name: 'idx_loyalty_programs_business' },
      { table: 'program_enrollments', column: 'customer_id', name: 'idx_program_enrollments_customer' },
      { table: 'loyalty_transactions', column: 'customer_id', name: 'idx_loyalty_transactions_customer' },
      { table: 'loyalty_transactions', column: 'business_id', name: 'idx_loyalty_transactions_business' }
    ];
    
    for (const index of indices) {
      const indexCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE tablename = $1 AND indexname = $2
        );
      `, [index.table, index.name]);
      
      if (!indexCheck.rows[0].exists) {
        console.log(`Creating index ${index.name} on ${index.table}(${index.column})...`);
        await pool.query(`CREATE INDEX ${index.name} ON ${index.table}(${index.column});`);
        console.log(`✅ Created index ${index.name}`);
      }
    }
    
    console.log('\n✅ Schema setup completed successfully!');
    console.log('\nNext step: Run fix-customer-business-linking.mjs to link existing customers with businesses');
    
  } catch (error) {
    console.error('Error setting up schema:', error);
  } finally {
    await pool.end();
  }
}

main(); 