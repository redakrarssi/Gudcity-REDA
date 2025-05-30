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
    console.log('Checking transaction type constraint...');
    
    // Get the check constraint information
    const constraintResult = await pool.query(`
      SELECT pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conname = 'loyalty_transactions_type_check'
    `);
    
    if (constraintResult.rows.length > 0) {
      console.log('Constraint definition:', constraintResult.rows[0].constraint_definition);
    } else {
      console.log('Could not find constraint definition');
      
      // Let's check if there are any transactions in the table to see examples
      const txResult = await pool.query(`
        SELECT DISTINCT type FROM loyalty_transactions LIMIT 10
      `);
      
      if (txResult.rows.length > 0) {
        console.log('Existing transaction types:');
        txResult.rows.forEach(row => {
          console.log(`- ${row.type}`);
        });
      } else {
        console.log('No existing transactions found');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main(); 