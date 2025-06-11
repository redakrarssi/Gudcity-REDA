import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import dotenv from 'dotenv';

console.log('Testing Neon Database Connection...');

// Load environment variables
try {
  if (fs.existsSync('.env.local')) {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const envVars = envFile.split('\n').filter(line => line.trim() !== '');
    
    for (const line of envVars) {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
    console.log('Loaded environment variables from .env.local');
  } else {
    console.log('No .env.local file found');
  }
} catch (error) {
  console.error('Error loading .env.local file:', error.message);
}

// Get the database URL
const DATABASE_URL = process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: No DATABASE_URL found in environment variables!');
  process.exit(1);
}

console.log('Database URL found:', DATABASE_URL.substring(0, 20) + '...');

async function testConnection() {
  try {
    console.log('Creating SQL client...');
    const sql = neon(DATABASE_URL);
    
    console.log('Executing test query...');
    const result = await sql`SELECT 1 as connected`;
    
    console.log('Result:', result);
    
    if (result && result.length > 0 && result[0].connected === 1) {
      console.log('✅ CONNECTION SUCCESSFUL!');
      
      // Try to list tables
      try {
        console.log('\nListing tables in database:');
        const tables = await sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `;
        
        if (tables.length === 0) {
          console.log('No tables found in the database');
        } else {
          console.log(`Found ${tables.length} tables:`);
          tables.forEach((t, i) => console.log(`${i+1}. ${t.table_name}`));
        }
      } catch (tableError) {
        console.error('Error listing tables:', tableError.message);
      }
    } else {
      console.error('❌ CONNECTION FAILED: Invalid response');
    }
  } catch (error) {
    console.error('❌ CONNECTION FAILED:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testConnection(); 