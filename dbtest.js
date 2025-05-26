import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.VITE_DATABASE_URL;

console.log('Database URL available:', !!DATABASE_URL);
if (DATABASE_URL) {
  console.log('DB URL starts with:', DATABASE_URL.substring(0, 30) + '...');
}

const sql = neon(DATABASE_URL || '');

async function testDatabase() {
  try {
    console.log('Testing connection...');
    const connectionTest = await sql`SELECT 1 as test`;
    console.log('Connection successful:', connectionTest);
    
    console.log('Checking tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Available tables:', tables);
    
    if (tables.some(t => t.table_name === 'comments')) {
      console.log('Comments table exists, checking schema...');
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'comments'
      `;
      console.log('Comments table columns:', columns);
    } else {
      console.log('Comments table does not exist! Need to create it.');
    }
  } catch (error) {
    console.error('Error during database test:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

testDatabase(); 