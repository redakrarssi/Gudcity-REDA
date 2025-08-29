import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';
import { Pool } from '@neondatabase/serverless';

// Directly set the database URL
const DATABASE_URL = "process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || """;

// Create a database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Setting up business locations schema...');

    // Read the schema SQL file
    const sql = fs.readFileSync('./db/business_locations_schema.sql', 'utf8');
    
    // Execute the schema SQL
    await pool.query(sql);
    console.log('Schema created successfully!');
    
    // Check if tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'business_locations'
    `);
    
    if (result.rows.length > 0) {
      console.log('Business locations table created successfully!');
      
      // Count the number of locations
      const countResult = await pool.query(`
        SELECT COUNT(*) FROM business_locations
      `);
      
      console.log(`Inserted ${countResult.rows[0].count} business locations`);
      
      // Verify by fetching a sample
      const locationsResult = await pool.query(`
        SELECT id, name, latitude, longitude FROM business_locations LIMIT 3
      `);
      
      console.log('Sample locations:');
      locationsResult.rows.forEach(row => {
        console.log(`- ${row.id}: ${row.name} (${row.latitude}, ${row.longitude})`);
      });
    } else {
      console.error('Failed to create business_locations table!');
    }
    
    console.log('Business locations setup complete! ✅');
  } catch (error) {
    console.error('Error setting up business locations schema:', error);
  } finally {
    await pool.end();
  }
}

main(); 