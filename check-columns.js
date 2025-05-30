import sql from './src/utils/db.js';

async function main() {
  try {
    console.log('Checking database columns...');
    
    // Check columns in business_profile
    const profileColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'business_profile'
    `;
    
    console.log('Business Profile Columns:');
    profileColumns.forEach(col => {
      console.log(`- ${col.column_name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 