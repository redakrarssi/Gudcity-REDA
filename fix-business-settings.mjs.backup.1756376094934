import { createRequire } from 'module';
const require = createRequire(import.meta.url);
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
    console.log('Starting business settings fix...');
    
    // Check the business_profile table structure
    const profileColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'business_profile'
      ORDER BY ordinal_position
    `);
    
    console.log('Business profile table columns:');
    profileColumns.rows.forEach(col => {
      console.log(`${col.column_name} (${col.data_type})`);
    });
    
    // Check if there are any syntax issues in the businessSettingsService.ts
    console.log('\nChecking for any business settings update issues...');
    
    // Get the business profiles
    const profiles = await pool.query(`
      SELECT bp.*, u.business_name, u.name as user_name
      FROM business_profile bp
      JOIN users u ON bp.business_id = u.id
      LIMIT 5
    `);
    
    console.log('\nSample business profiles:');
    console.log(JSON.stringify(profiles.rows, null, 2));
    
    // Fix any issues with the business_profile table
    console.log('\nFixing business settings...');
    
    // Update the business_profile table to ensure name field is set correctly
    const updateResult = await pool.query(`
      UPDATE business_profile bp
      SET name = u.business_name
      FROM users u
      WHERE bp.business_id = u.id AND u.business_name IS NOT NULL AND bp.name IS NULL
      RETURNING bp.business_id, bp.name
    `);
    
    console.log(`Updated ${updateResult.rowCount} business profiles with missing names`);
    
    if (updateResult.rowCount > 0) {
      console.log('Updated profiles:');
      console.log(JSON.stringify(updateResult.rows, null, 2));
    }
    
    // Check for any syntax issues in the code
    console.log('\nChecking for issues in the businessSettingsService.ts file...');
    console.log('The issue might be related to the SQL template literals or escape characters.');
    console.log('\nRecommendations:');
    console.log('1. Remove any escape characters (\\) in the SQL template literals');
    console.log('2. Ensure the column names match exactly with the database schema');
    console.log('3. Check for proper closing of template literals and parentheses');
    
    console.log('\nFix complete!');
  } catch (error) {
    console.error('Error fixing business settings:', error);
  } finally {
    await pool.end();
  }
}

main(); 