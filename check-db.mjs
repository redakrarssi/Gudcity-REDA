import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ SECURITY ERROR: DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your environment');
  console.error('Copy env.example to .env and configure with your database credentials');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    // Check business_locations
    console.log('Checking business_locations table...');
    const locationsCount = await pool.query('SELECT COUNT(*) FROM business_locations');
    console.log(`Found ${locationsCount.rows[0].count} business locations`);
    
    // Check if is_active exists in business_locations
    const isActiveExistsInLocations = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'business_locations' 
        AND column_name = 'is_active'
      );
    `);
    console.log(`is_active column exists in business_locations: ${isActiveExistsInLocations.rows[0].exists}`);
    
    // Get all columns in business_locations
    const locationColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'business_locations'
    `);
    
    console.log('\nColumns in business_locations table:');
    locationColumns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Check loyalty_programs
    console.log('\nChecking loyalty_programs table...');
    const programsCount = await pool.query('SELECT COUNT(*) FROM loyalty_programs');
    console.log(`Found ${programsCount.rows[0].count} loyalty programs`);
    
    // Check if is_active exists in loyalty_programs
    const isActiveExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_programs' 
        AND column_name = 'is_active'
      );
    `);
    console.log(`is_active column exists in loyalty_programs: ${isActiveExists.rows[0].exists}`);
    
    // Get all columns in loyalty_programs
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'loyalty_programs'
    `);
    
    console.log('\nColumns in loyalty_programs table:');
    columns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Check sample data
    console.log('\nSample data:');
    const sampleData = await pool.query(`
      SELECT 
        bl.id as location_id, 
        bl.name as location_name,
        bl.latitude,
        bl.longitude,
        lp.id as program_id,
        lp.name as program_name,
        lp.category
      FROM 
        business_locations bl
      JOIN 
        loyalty_programs lp ON bl.business_id = lp.business_id
      LIMIT 3
    `);
    
    sampleData.rows.forEach(row => {
      console.log(`- Location: ${row.location_name} (${row.latitude}, ${row.longitude})`);
      console.log(`  Program: ${row.program_name} (${row.category || 'no category'})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main(); 