import { neon } from '@neondatabase/serverless';

// Use the database URL from the environment or hardcode for testing purposes
const DATABASE_URL = process.env.VITE_DATABASE_URL || "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

// Create connection
const sql = neon(DATABASE_URL);

async function checkLoyaltyCardTable() {
  try {
    console.log("🔍 Checking loyalty_cards table schema...");
    
    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'loyalty_cards'
      );
    `;
    
    if (!tableExists[0].exists) {
      console.error("❌ loyalty_cards table does not exist");
      return;
    }
    
    console.log("✅ loyalty_cards table exists");
    
    // Get column information
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'loyalty_cards'
      ORDER BY ordinal_position;
    `;
    
    console.log("\nColumns in loyalty_cards table:");
    console.log("--------------------------------");
    columns.forEach(col => {
      console.log(`${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check for specific columns
    const hasPointsBalance = columns.some(col => col.column_name === 'points_balance');
    const hasTotalPointsEarned = columns.some(col => col.column_name === 'total_points_earned');
    
    console.log("\nChecking specific columns:");
    console.log(`points_balance: ${hasPointsBalance ? '✅ Present' : '❌ Missing'}`);
    console.log(`total_points_earned: ${hasTotalPointsEarned ? '✅ Present' : '❌ Missing'}`);
    
    // Check if any rows exist
    const rowCount = await sql`
      SELECT COUNT(*) FROM loyalty_cards;
    `;
    
    console.log(`\nTotal rows in table: ${rowCount[0].count}`);
    
    // Sample row
    if (parseInt(rowCount[0].count) > 0) {
      const sampleRow = await sql`
        SELECT * FROM loyalty_cards LIMIT 1;
      `;
      
      console.log("\nSample row data:");
      console.log(JSON.stringify(sampleRow[0], null, 2));
    }
    
  } catch (error) {
    console.error("Error checking table:", error);
  }
}

checkLoyaltyCardTable(); 