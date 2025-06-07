const { Pool } = require('@neondatabase/serverless');

// Directly set the database URL
const DATABASE_URL = "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

// Create a database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Starting business profile patch...');
    
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
    
    console.log('\nPatch complete!');
  } catch (error) {
    console.error('Error patching business profile:', error);
  } finally {
    await pool.end();
  }
}

main(); 