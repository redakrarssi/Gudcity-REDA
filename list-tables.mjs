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
    console.log('Checking database tables...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in the database:');
    tables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Check if program_enrollments and loyalty_transactions exist
    const checkTables = ['program_enrollments', 'loyalty_transactions'];
    for (const tableName of checkTables) {
      const exists = tables.rows.some(row => row.table_name === tableName);
      console.log(`Table ${tableName}: ${exists ? 'Exists' : 'Does NOT exist'}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main(); 