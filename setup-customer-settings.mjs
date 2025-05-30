import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';
import { Pool } from '@neondatabase/serverless';

// Directly set the database URL
const DATABASE_URL = "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

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