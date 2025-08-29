import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get the database URL from environment variables or use fallback
const DATABASE_URL = process.env.VITE_DATABASE_URL || "process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || """;

async function main() {
  // Create a database connection pool
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: true
  });
  
  try {
    console.log('Starting customer_programs fix...');
    
    // Check if customer_programs table exists
    const customerProgramsExists = await checkTableExists(pool, 'customer_programs');
    console.log(`customer_programs table exists: ${customerProgramsExists}`);
    
    if (customerProgramsExists) {
      // Check if current_points column exists in customer_programs
      const currentPointsExists = await checkColumnExists(pool, 'customer_programs', 'current_points');
      console.log(`current_points column exists: ${currentPointsExists}`);
      
      if (!currentPointsExists) {
        console.log('Adding current_points column to customer_programs table...');
        
        try {
          // Add current_points column to customer_programs table
          await pool.query(`
            ALTER TABLE customer_programs 
            ADD COLUMN IF NOT EXISTS current_points INTEGER DEFAULT 0
          `);
          
          console.log('✅ Added current_points column to customer_programs table');
        } catch (error) {
          console.error('Error adding current_points column:', error);
          console.error(error.message);
          
          console.log('Attempting to create customer_programs view instead...');
          
          try {
            // Check if program_enrollments exists
            const programEnrollmentsExists = await checkTableExists(pool, 'program_enrollments');
            
            if (programEnrollmentsExists) {
              // Create a view that maps program_enrollments to customer_programs
              await pool.query(`
                DROP VIEW IF EXISTS customer_programs;
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
              console.log('❌ program_enrollments table does not exist, cannot create view.');
              throw new Error('Cannot fix customer_programs');
            }
          } catch (viewError) {
            console.error('Error creating customer_programs view:', viewError.message);
            throw viewError;
          }
        }
      } else {
        console.log('✅ current_points column already exists in customer_programs');
      }
    } else {
      console.log('❌ customer_programs table does not exist');
      
      // Check if program_enrollments exists
      const programEnrollmentsExists = await checkTableExists(pool, 'program_enrollments');
      
      if (programEnrollmentsExists) {
        console.log('✅ program_enrollments table exists.');
        console.log('Creating customer_programs as an alias to program_enrollments...');
        
        // Create a view that maps program_enrollments to customer_programs
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
            program_id INTEGER NOT NULL,
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
    
    // Final verification
    const finalCheck = await checkColumnExists(pool, 'customer_programs', 'current_points');
    if (finalCheck) {
      console.log('✅ Final verification: current_points column exists in customer_programs table/view');
    } else {
      console.log('❌ Final verification failed: current_points column still missing!');
    }
    
  } catch (error) {
    console.error('Error fixing customer_programs:', error);
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

// Helper function to check if a column exists in a table
async function checkColumnExists(pool, tableName, columnName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    )
  `, [tableName, columnName]);
  
  return result.rows[0].exists;
}

// Run the script
main(); 