import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables from .env and .env.local
config();
config({ path: '.env.local' });

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

async function verifyConnection() {
  console.log('Using DATABASE_URL:', DATABASE_URL);
  
  try {
    if (!DATABASE_URL) {
      console.error('No DATABASE_URL found in environment variables!');
      return;
    }
    
    console.log('Connecting to database...');
    const sql = neon(DATABASE_URL);
    
    console.log('Executing test query...');
    const result = await sql`SELECT 1 as connected`;
    
    console.log('Query result:', result);
    console.log('Connection successful:', result && result.length > 0 && result[0].connected === 1);
  } catch (error) {
    console.error('Error connecting to database:', error);
  }
}

verifyConnection(); 