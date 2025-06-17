import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.VITE_DATABASE_URL;

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: true
  });
  
  try {
    console.log('Fixing customer_programs table...');
    
    // Check if customer_programs exists
    const { rows: tablesResult } = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'customer_programs'
      )
    `);
    
    const customerProgramsExists = tablesResult[0].exists;
    
    if (customerProgramsExists) {
      console.log('customer_programs table/view exists, checking for current_points column');
      
      // Check if current_points column exists
      const { rows: columnsResult } = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public'
          AND table_name = 'customer_programs'
          AND column_name = 'current_points'
        )
      `);
      
      const currentPointsExists = columnsResult[0].exists;
      
      if (!currentPointsExists) {
        console.log('Adding current_points column to customer_programs table');
        
        // Get table type (BASE TABLE or VIEW)
        const { rows: tableTypeResult } = await pool.query(`
          SELECT table_type 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'customer_programs'
        `);
        
        const tableType = tableTypeResult[0]?.table_type;
        
        if (tableType === 'VIEW') {
          console.log('customer_programs is a VIEW, recreating with current_points');
          
          // Recreate view from program_enrollments (assuming this is the source)
          await pool.query(`
            DROP VIEW customer_programs;
            CREATE VIEW customer_programs AS
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
        } else {
          console.log('customer_programs is a BASE TABLE, adding current_points column');
          
          // Add column to base table
          await pool.query(`
            ALTER TABLE customer_programs
            ADD COLUMN current_points INTEGER DEFAULT 0;
          `);
        }
      } else {
        console.log('current_points column already exists');
      }
    } else {
      console.log('customer_programs does not exist, creating from scratch');
      
      // Create the table from scratch
      await pool.query(`
        CREATE TABLE customer_programs (
          id SERIAL PRIMARY KEY,
          customer_id VARCHAR(255) NOT NULL,
          program_id INTEGER NOT NULL,
          current_points INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
    
    console.log('Fix completed successfully!');
  } catch (error) {
    console.error('Error fixing database:', error);
  } finally {
    await pool.end();
  }
}

main(); 