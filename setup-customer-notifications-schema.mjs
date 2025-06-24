import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import { createPool } from '@neondatabase/serverless';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('Setting up customer notifications schema...');
    
    // Get database URL from environment
    const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('No DATABASE_URL environment variable found');
    }
    
    // Create a connection using Neon
    console.log('Connecting to database...');
    const sql = createPool(databaseUrl);
    
    // Read the SQL schema file
    console.log('Reading schema file...');
    const schema = readFileSync('./db/customer_notifications_schema.sql', 'utf8');
    
    // Execute the SQL
    console.log('Executing schema SQL...');
    await sql.query(schema);
    
    console.log('Customer notifications schema setup complete!');
    
    // Test query to verify
    const tables = await sql.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'customer_%'
    `);
    
    console.log('Created tables:');
    for (const table of tables.rows) {
      console.log(`- ${table.table_name}`);
    }
    
  } catch (error) {
    console.error('Error setting up customer notifications schema:', error);
    process.exit(1);
  }
}

main(); 