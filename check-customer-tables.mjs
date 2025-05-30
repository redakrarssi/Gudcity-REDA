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
    console.log('Testing connection...');
    const testResult = await pool.query('SELECT 1 as test');
    console.log('Connection successful:', testResult.rows);
    
    // Check for customer-related tables
    console.log('Checking for customer-related tables...');
    const customerTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%customer%'
    `);
    console.log('Customer-related tables:', customerTables.rows);

    // Check the tables that have already been created related to businesses and users
    console.log('Tables in database:');
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    // Print all tables that exist
    allTables.rows.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
    // Check if 'users' table exists and get its structure
    const usersTable = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
    `);
    console.log('Users table columns:', usersTable.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main(); 