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
    // Check promo_codes table
    console.log('Checking promo_codes table...');
    const codesCount = await pool.query('SELECT COUNT(*) FROM promo_codes');
    console.log(`Found ${codesCount.rows[0].count} promo codes total`);
    
    const activeCodesCount = await pool.query("SELECT COUNT(*) FROM promo_codes WHERE status = 'ACTIVE'");
    console.log(`Found ${activeCodesCount.rows[0].count} active promo codes`);
    
    // Get sample active promo codes
    const codesResult = await pool.query(`
      SELECT c.*, u.business_name
      FROM promo_codes c
      JOIN users u ON c.business_id = u.id
      WHERE c.status = 'ACTIVE'
      LIMIT 5
    `);
    
    console.log('\nSample active promo codes:');
    if (codesResult.rows.length === 0) {
      console.log('No active promo codes found.');
    } else {
      codesResult.rows.forEach(row => {
        console.log(`- ${row.code}: ${row.name} (${row.type}, ${row.value}${row.currency ? ' ' + row.currency : ''}) from ${row.business_name}`);
        console.log(`  Status: ${row.status}, Uses: ${row.used_count}${row.max_uses ? '/' + row.max_uses : ' (unlimited)'}`);
        console.log(`  Description: ${row.description || 'No description'}`);
        console.log(`  Expires: ${row.expires_at ? new Date(row.expires_at).toLocaleString() : 'Never'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main(); 