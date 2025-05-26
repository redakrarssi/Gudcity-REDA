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

async function createUsersTable() {
  try {
    console.log('Creating users table...');
    
    // Create users table with all required columns
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL DEFAULT '',
        role VARCHAR(50) NOT NULL DEFAULT 'customer',
        user_type VARCHAR(50) NOT NULL DEFAULT 'customer',
        business_name VARCHAR(255),
        business_phone VARCHAR(50),
        avatar_url VARCHAR(255),
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP WITH TIME ZONE,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Add indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    
    // Verify the table was created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `;
    
    if (tables.length > 0) {
      console.log('Users table created successfully!');
      
      // Check the table schema
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users'
        ORDER BY ordinal_position
      `;
      
      console.log('\nUsers table schema:');
      columns.forEach(col => {
        console.log(`${col.column_name} (${col.data_type})`);
      });
    } else {
      console.error('Failed to create users table!');
    }
  } catch (error) {
    console.error('Error creating users table:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
  }
}

createUsersTable(); 