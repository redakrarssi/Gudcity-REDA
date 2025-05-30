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
    console.log('Checking schema for program_enrollments table...');
    const schema = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'program_enrollments'
      ORDER BY ordinal_position
    `);
    
    console.log('Program_enrollments schema:');
    schema.rows.forEach(column => {
      console.log(`- ${column.column_name}: ${column.data_type} ${column.column_default ? `(default: ${column.column_default})` : ''}`);
    });
    
    console.log('\nChecking schema for loyalty_transactions table...');
    const txSchema = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'loyalty_transactions'
      ORDER BY ordinal_position
    `);
    
    console.log('Loyalty_transactions schema:');
    txSchema.rows.forEach(column => {
      console.log(`- ${column.column_name}: ${column.data_type} ${column.column_default ? `(default: ${column.column_default})` : ''}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main(); 