import pg from 'pg';
const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  ssl: true
});

async function main() {
  try {
    console.log('Checking business_profile table schema...');
    
    // Get column information
    const columnResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'business_profile'
      ORDER BY ordinal_position
    `);
    
    console.log('Column information:');
    columnResult.rows.forEach(column => {
      console.log(`- ${column.column_name} (${column.data_type})`);
    });
    
    // Check a sample record
    const sampleRecord = await pool.query(`
      SELECT *
      FROM business_profile
      LIMIT 1
    `);
    
    if (sampleRecord.rows.length > 0) {
      console.log('\nSample record column names:');
      console.log(Object.keys(sampleRecord.rows[0]));
    }
    
    console.log('\nChecking complete!');
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await pool.end();
  }
}

main(); 