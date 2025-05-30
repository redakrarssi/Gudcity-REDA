import fs from 'fs';
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function main() {
  // Read the schema SQL file
  const sql = fs.readFileSync('./db/loyalty_schema.sql', 'utf8');
  
  // Create a database connection pool
  const pool = new Pool({
    connectionString: process.env.VITE_DATABASE_URL,
    ssl: true
  });
  
  try {
    console.log('Executing loyalty schema...');
    await pool.query(sql);
    console.log('Schema executed successfully!');
    
    // Check if tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('loyalty_programs', 'reward_tiers', 'program_enrollments', 'loyalty_transactions')
    `);
    
    console.log('Created tables:', result.rows.map(row => row.table_name).join(', '));
  } catch (error) {
    console.error('Error executing schema:', error);
  } finally {
    await pool.end();
  }
}

main(); 