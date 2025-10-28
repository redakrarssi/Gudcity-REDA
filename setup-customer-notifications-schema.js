// Script to set up the customer notifications schema

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a connection to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupSchema() {
  try {
    console.log('Setting up customer notifications schema...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'db', 'customer_notifications_schema.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    const client = await pool.connect();
    try {
      await client.query(sql);
      console.log('✅ Customer notifications schema set up successfully!');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error setting up customer notifications schema:', error);
  } finally {
    await pool.end();
  }
}

// Run the setup function
setupSchema(); 