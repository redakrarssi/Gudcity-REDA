import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get the database URL from environment variables or use fallback
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ SECURITY ERROR: DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your environment');
  console.error('Copy env.example to .env and configure with your database credentials');
  process.exit(1);
}

async function main() {
  // Create a database connection pool
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: true
  });
  
  try {
    console.log('Checking loyalty_programs table schema...');
    
    // Get columns from loyalty_programs table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'loyalty_programs'
      ORDER BY ordinal_position
    `);
    
    if (columnsResult.rows.length > 0) {
      console.log('Columns in loyalty_programs table:');
      columnsResult.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('No columns found for loyalty_programs table or table does not exist.');
    }
    
    // Check for is_active column which might be used instead of status
    const hasIsActive = columnsResult.rows.some(row => row.column_name === 'is_active');
    
    console.log(`\nActivity status column check: ${hasIsActive ? 'is_active column exists' : 'is_active column does not exist'}`);
    
  } catch (error) {
    console.error('Error checking loyalty_programs schema:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
main(); 