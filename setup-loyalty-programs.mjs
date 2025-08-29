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
    console.log('Setting up loyalty programs for nearby feature...');

    // Read the schema SQL file
    const sql = fs.readFileSync('./db/setup-loyalty-programs.sql', 'utf8');
    
    // Execute the schema SQL
    await pool.query(sql);
    console.log('Loyalty programs schema applied successfully!');
    
    // Check if tables were created
    const tableResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'loyalty_programs'
    `);
    
    if (tableResult.rows.length > 0) {
      console.log('Loyalty programs table verified!');
      
      // Count the number of programs
      const countResult = await pool.query(`
        SELECT COUNT(*) FROM loyalty_programs
      `);
      
      console.log(`Found ${countResult.rows[0].count} loyalty programs in the database`);
      
      // Verify by fetching a sample
      const programsResult = await pool.query(`
        SELECT 
          lp.id, 
          lp.name, 
          lp.category, 
          bl.name as business_name
        FROM 
          loyalty_programs lp
        JOIN 
          business_locations bl ON lp.business_id = bl.business_id
        GROUP BY
          lp.id, lp.name, lp.category, bl.name
        LIMIT 5
      `);
      
      console.log('Sample loyalty programs:');
      if (programsResult.rows.length > 0) {
        programsResult.rows.forEach(row => {
          console.log(`- ${row.id}: ${row.name} (${row.category || 'no category'}) at ${row.business_name}`);
        });
      } else {
        console.log('No programs found. This could be because they already exist.');
      }
    } else {
      console.error('Failed to verify loyalty_programs table!');
    }
    
    console.log('Loyalty programs setup complete! ✅');
  } catch (error) {
    console.error('Error setting up loyalty programs:', error);
  } finally {
    await pool.end();
  }
}

main(); 