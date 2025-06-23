import { readFileSync } from 'fs';
import { connect, sql } from './src/utils/db';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('Setting up customer notifications schema...');
    
    // Connect to database
    await connect();
    
    // Read the SQL schema file
    const schema = readFileSync('./db/customer_notifications_schema.sql', 'utf8');
    
    // Execute the SQL
    await sql.unsafe(schema);
    
    console.log('Customer notifications schema setup complete!');
    
    // Test query to verify
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'customer_%'
    `;
    
    console.log('Created tables:');
    for (const table of tables) {
      console.log(`- ${table.table_name}`);
    }
    
  } catch (error) {
    console.error('Error setting up customer notifications schema:', error);
    process.exit(1);
  }
}

main(); 