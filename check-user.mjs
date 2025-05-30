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
    
    console.log('Fetching user...');
    const result = await pool.query('SELECT id, email, name FROM users WHERE email = $1', ['olb_chelsea@hotmail.fr']);
    
    if (result.rows.length === 0) {
      console.log('User not found. Listing all users:');
      const allUsers = await pool.query('SELECT id, email, name FROM users');
      console.log(allUsers.rows);
    } else {
      console.log('Found user:', result.rows[0]);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main(); 