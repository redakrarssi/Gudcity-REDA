import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Create a database connection
const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Checking business_settings table structure and data...');

    // Get table structure
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'business_settings'
      ORDER BY ordinal_position
    `);
    
    console.log('Table structure:');
    console.table(tableStructure.rows);
    
    // Get all records in the table
    const records = await pool.query(`
      SELECT * FROM business_settings
    `);
    
    console.log(`\nFound ${records.rows.length} records in business_settings table:`);
    console.log(JSON.stringify(records.rows, null, 2));
    
    // Get connected users for these business settings
    if (records.rows.length > 0) {
      const businessIds = records.rows.map(row => row.business_id);
      
      const users = await pool.query(`
        SELECT id, name, email, business_name, business_phone
        FROM users
        WHERE id IN (${businessIds.join(',')})
      `);
      
      console.log('\nConnected users:');
      console.table(users.rows);
    }
    
  } catch (error) {
    console.error('Error checking business settings:', error);
  } finally {
    await pool.end();
  }
}

main(); 