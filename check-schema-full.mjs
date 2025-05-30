import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Create a database connection
const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    // Get details of program_enrollments and loyalty_transactions tables
    console.log('Checking schema details...');
    
    const tables = ['program_enrollments', 'loyalty_transactions', 'loyalty_programs'];
    
    for (const table of tables) {
      console.log(`\nTable: ${table}`);
      const schema = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      schema.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${col.column_default ? `(default: ${col.column_default})` : ''}`);
      });
    }
    
    // Also check if loyalty_transactions has a customer_id column
    const txColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'loyalty_transactions' 
      AND column_name = 'customer_id'
    `);
    
    if (txColumns.rows.length === 0) {
      console.log('\nWARNING: loyalty_transactions table does not have a customer_id column!');
    } else {
      console.log('\nConfirmed: loyalty_transactions has a customer_id column.');
    }
    
    // Also check if program_enrollments has a customer_id column
    const enrollColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'program_enrollments' 
      AND column_name = 'customer_id'
    `);
    
    if (enrollColumns.rows.length === 0) {
      console.log('WARNING: program_enrollments table does not have a customer_id column!');
    } else {
      console.log('Confirmed: program_enrollments has a customer_id column.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main(); 