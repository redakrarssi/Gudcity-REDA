import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';
import { Pool } from '@neondatabase/serverless';

// Directly set the database URL
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ SECURITY ERROR: DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your environment');
  console.error('Copy env.example to .env and configure with your database credentials');
  process.exit(1);
}

// Create a database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Setting up customer settings schema...');
    
    // Read the schema SQL file
    const sql = fs.readFileSync('./db/customer_settings_schema.sql', 'utf8');
    
    // Execute the schema SQL
    await pool.query(sql);
    console.log('Customer settings schema updated successfully!');
    
    // Check if the columns were added
    const columnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'customers' AND (
        column_name = 'notification_preferences' OR
        column_name = 'regional_settings'
      )
    `);
    
    console.log('Columns found:');
    columnsResult.rows.forEach(row => {
      console.log(`- ${row.column_name}`);
    });
    
  } catch (error) {
    console.error('Error setting up customer settings schema:', error);
  } finally {
    await pool.end();
  }
}

main(); 