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

const sql = neon(DATABASE_URL);

async function checkDatabaseSchema() {
  try {
    console.log('Checking database tables...');
    
    // Get all tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Tables in database:', tables.map(t => t.table_name).join(', '));
    
    // Check users table
    if (tables.some(t => t.table_name === 'users')) {
      const userColumns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users'
        ORDER BY ordinal_position
      `;
      console.log('\nUsers table schema:');
      userColumns.forEach(col => {
        console.log(`${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('Users table does not exist!');
    }
    
    // Check comments table
    if (tables.some(t => t.table_name === 'comments')) {
      const commentColumns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'comments'
        ORDER BY ordinal_position
      `;
      console.log('\nComments table schema:');
      commentColumns.forEach(col => {
        console.log(`${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('Comments table does not exist!');
    }
    
    console.log('\nSchema verification completed!');
  } catch (error) {
    console.error('Error checking database schema:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

checkDatabaseSchema(); 