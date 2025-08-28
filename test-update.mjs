import { createRequire } from 'module';
const require = createRequire(import.meta.url);
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
    console.log('Testing direct business profile update...');
    
    // Get a sample business ID
    const businessResult = await pool.query(`
      SELECT id FROM users WHERE user_type = 'business' LIMIT 1
    `);
    
    if (businessResult.rows.length === 0) {
      console.log('No business users found');
      return;
    }
    
    const businessId = businessResult.rows[0].id;
    console.log(`Found business ID: ${businessId}`);
    
    // Get current profile data
    const profileBefore = await pool.query(`
      SELECT * FROM business_profile WHERE business_id = $1
    `, [businessId]);
    
    console.log('Current profile data:');
    console.log(JSON.stringify(profileBefore.rows[0], null, 2));
    
    // Update the name directly
    const newName = 'Updated Test Business ' + new Date().toISOString();
    console.log(`Updating name to: ${newName}`);
    
    const updateResult = await pool.query(`
      UPDATE business_profile 
      SET name = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE business_id = $2 
      RETURNING id, business_id, name
    `, [newName, businessId]);
    
    console.log('Update result:');
    console.log(JSON.stringify(updateResult.rows[0], null, 2));
    
    // Get updated profile data
    const profileAfter = await pool.query(`
      SELECT * FROM business_profile WHERE business_id = $1
    `, [businessId]);
    
    console.log('Updated profile data:');
    console.log(JSON.stringify(profileAfter.rows[0], null, 2));
    
    console.log('\nTest complete!');
  } catch (error) {
    console.error('Error testing business profile update:', error);
  } finally {
    await pool.end();
  }
}

main(); 