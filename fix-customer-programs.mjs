import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';
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
    console.log('Checking database schema...');
    
    // Check if customer_programs table exists
    const customerProgramsExists = await checkTableExists(pool, 'customer_programs');
    
    if (customerProgramsExists) {
      console.log('✅ customer_programs table already exists.');
    } else {
      console.log('❌ customer_programs table does not exist.');
      
      // Check if program_enrollments exists (the table name from the schema files)
      const programEnrollmentsExists = await checkTableExists(pool, 'program_enrollments');
      
      if (programEnrollmentsExists) {
        console.log('✅ program_enrollments table exists.');
        console.log('Creating customer_programs as an alias to program_enrollments...');
        
        // Option 1: Create a view that maps program_enrollments to customer_programs
        await pool.query(`
          CREATE OR REPLACE VIEW customer_programs AS
          SELECT 
            id,
            customer_id,
            program_id,
            current_points,
            last_activity AS updated_at,
            enrolled_at
          FROM program_enrollments;
        `);
        
        console.log('✅ Created customer_programs view that points to program_enrollments table.');
      } else {
        console.log('❌ Neither customer_programs nor program_enrollments tables exist.');
        console.log('Creating customer_programs table from scratch...');
        
        // Create the customer_programs table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS customer_programs (
            id SERIAL PRIMARY KEY,
            customer_id VARCHAR(255) NOT NULL,
            program_id INTEGER NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
            current_points INTEGER DEFAULT 0,
            status VARCHAR(50) DEFAULT 'ACTIVE',
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Add indexes
          CREATE INDEX IF NOT EXISTS idx_customer_programs_customer ON customer_programs(customer_id);
          CREATE INDEX IF NOT EXISTS idx_customer_programs_program ON customer_programs(program_id);
          
          -- Create unique index
          CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_programs_unique 
          ON customer_programs(customer_id, program_id);
        `);
        
        console.log('✅ Created customer_programs table successfully.');
      }
    }
    
    // Verify the table or view exists now
    const nowExists = await checkTableExists(pool, 'customer_programs');
    if (nowExists) {
      console.log('✅ Verification complete: customer_programs is now available.');
    } else {
      console.log('❌ Something went wrong. customer_programs is still not available.');
    }
    
  } catch (error) {
    console.error('Error fixing customer_programs relation:', error);
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