const dotenv = require('dotenv');
const { Pool } = require('@neondatabase/serverless');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

console.log('Database URL:', process.env.VITE_DATABASE_URL);

// Create a database connection
const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL,
  ssl: true
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT 1 as test');
    console.log('Connection successful:', result.rows);
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await pool.end();
  }
}

testConnection(); 