import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Manually load the .env.local file
try {
  const envFile = readFileSync('.env.local', 'utf8');
  const envVars = envFile.split('\n').filter(line => line.trim() !== '');
  
  for (const line of envVars) {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  }
} catch (error) {
  console.error('Error loading .env.local file:', error.message);
}

const DATABASE_URL = process.env.VITE_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not defined');
  process.exit(1);
}

console.log('Database URL being used:', DATABASE_URL.substring(0, 30) + '...');

const sql = neon(DATABASE_URL);

async function testDatabaseConnection() {
  try {
    console.log('Testing basic database connection...');
    const result = await sql`SELECT 1 as test`;
    console.log('Connection successful:', result);
    
    // Test specific tables access
    console.log('\nTesting access to the users table...');
    try {
      const canSelect = await sql`SELECT count(*) FROM users`;
      console.log('SELECT permission OK:', canSelect);
    } catch (error) {
      console.error('Error during SELECT on users table:', error);
    }
    
    try {
      const canInsert = await sql`
        INSERT INTO users (name, email, password) 
        VALUES ('Test User Temp', 'temp_user_${Date.now()}@test.com', 'temp_password')
        RETURNING id
      `;
      console.log('INSERT permission OK:', canInsert);
      
      // Clean up
      if (canInsert && canInsert[0] && canInsert[0].id) {
        await sql`DELETE FROM users WHERE id = ${canInsert[0].id}`;
      }
    } catch (error) {
      console.error('Error during INSERT on users table:', error);
    }
    
    // List tables
    console.log('\nListing tables in database:');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    tables.forEach(t => console.log(`- ${t.table_name}`));
    
    // Check table structure
    console.log('\nChecking users table structure:');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
    `;
    columns.forEach(c => console.log(`- ${c.column_name}: ${c.data_type} (${c.is_nullable === 'YES' ? 'nullable' : 'not null'})`));
    
  } catch (error) {
    console.error('General database error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

testDatabaseConnection(); 