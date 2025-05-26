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
const sql = neon(DATABASE_URL || '');

async function fixDatabase() {
  try {
    console.log('Dropping and recreating comments table...');
    // Drop the existing table
    await sql`DROP TABLE IF EXISTS comments`;
    
    // Create the table with correct schema
    await sql`
      CREATE TABLE comments (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        author VARCHAR(100) DEFAULT 'Anonymous',
        email VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Verify the table schema
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'comments'
    `;
    console.log('Comments table created with columns:', columns);
    console.log('Schema fix completed successfully!');
  } catch (error) {
    console.error('Error fixing schema:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

fixDatabase(); 