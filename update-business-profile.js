const { Pool } = require('@neondatabase/serverless');

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
    // Get a test business ID
    const businessResult = await pool.query("SELECT id FROM users WHERE user_type = 'business' LIMIT 1");
    if (businessResult.rows.length === 0) {
      console.log('No business users found');
      return;
    }
    
    const businessId = businessResult.rows[0].id;
    console.log(`Found business ID: ${businessId}`);
    
    // Get current profile data
    const profileBefore = await pool.query(
      "SELECT * FROM business_profile WHERE business_id = $1", 
      [businessId]
    );
    
    if (profileBefore.rows.length === 0) {
      console.log('No profile found for this business');
      return;
    }
    
    console.log('Current profile data:');
    console.log(JSON.stringify(profileBefore.rows[0], null, 2));
    
    // Update the name directly
    const newName = 'Updated Test Business ' + new Date().toISOString();
    console.log(`Updating name to: ${newName}`);
    
    const updateResult = await pool.query(
      "UPDATE business_profile SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE business_id = $2 RETURNING id, business_id, name", 
      [newName, businessId]
    );
    
    console.log('Update result:');
    console.log(JSON.stringify(updateResult.rows[0], null, 2));
    
    // Get updated profile data
    const profileAfter = await pool.query(
      "SELECT * FROM business_profile WHERE business_id = $1", 
      [businessId]
    );
    
    console.log('Updated profile data:');
    console.log(JSON.stringify(profileAfter.rows[0], null, 2));
    
    console.log('\nUpdate complete!');
  } catch (error) {
    console.error('Error updating business profile:', error);
  } finally {
    await pool.end();
  }
}

main(); 