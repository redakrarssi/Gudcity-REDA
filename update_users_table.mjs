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

console.log('Database URL available, starting schema update...');

// Read SQL file
try {
  const sql = readFileSync('./db/auth_schema.sql', 'utf8');
  const client = neon(DATABASE_URL);
  
  // Execute SQL in transaction
  const runSql = async () => {
    try {
      // Begin the transaction
      await client`BEGIN`;
      
      // Execute the SQL statements
      console.log('Executing SQL statements...');
      await client.unsafe(sql);
      
      // Commit the transaction
      await client`COMMIT`;
      
      console.log('Users table schema updated successfully!');
      
      // Verify the columns
      const columns = await client`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `;
      
      console.log('Users table columns:', columns);
      
    } catch (error) {
      // Rollback the transaction on error
      await client`ROLLBACK`;
      console.error('Error updating schema:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
    }
  };
  
  runSql();
  
} catch (error) {
  console.error('Error reading SQL file:', error);
} 