import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const pool = new Pool({
  connectionString: "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require",
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