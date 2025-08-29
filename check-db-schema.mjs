import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || """,
  ssl: true
});

async function checkTable(tableName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `, [tableName]);
  
  return result.rows[0].exists;
}

async function checkColumn(tableName, columnName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
      AND column_name = $2
    );
  `, [tableName, columnName]);
  
  return result.rows[0].exists;
}

async function main() {
  try {
    console.log('Checking database schema for loyalty cards feature...');
    
    // Check required tables
    const requiredTables = [
      'customers',
      'businesses',
      'loyalty_programs',
      'loyalty_cards',
      'card_activities',
      'program_enrollments'
    ];
    
    for (const table of requiredTables) {
      const exists = await checkTable(table);
      console.log(`Table ${table}: ${exists ? '✅ Exists' : '❌ Missing'}`);
    }
    
    // Check required columns in loyalty_cards
    if (await checkTable('loyalty_cards')) {
      const requiredColumns = [
        'id',
        'customer_id',
        'business_id',
        'program_id',
        'card_type',
        'tier',
        'points',
        'points_multiplier',
        'promo_code',
        'next_reward',
        'points_to_next',
        'expiry_date',
        'benefits',
        'last_used',
        'is_active',
        'available_rewards'
      ];
      
      console.log('\nChecking columns in loyalty_cards:');
      for (const column of requiredColumns) {
        const exists = await checkColumn('loyalty_cards', column);
        console.log(`Column ${column}: ${exists ? '✅ Exists' : '❌ Missing'}`);
      }
    }
    
    // Check required columns in program_enrollments
    if (await checkTable('program_enrollments')) {
      const requiredColumns = [
        'id',
        'customer_id',
        'program_id',
        'current_points',
        'status',
        'last_activity',
        'enrolled_at'
      ];
      
      console.log('\nChecking columns in program_enrollments:');
      for (const column of requiredColumns) {
        const exists = await checkColumn('program_enrollments', column);
        console.log(`Column ${column}: ${exists ? '✅ Exists' : '❌ Missing'}`);
      }
    }
    
    // Check for customer ID 4 loyalty cards
    if (await checkTable('loyalty_cards')) {
      const cardResult = await pool.query(`
        SELECT * FROM loyalty_cards
        WHERE customer_id = 4
      `);
      
      if (cardResult.rows.length > 0) {
        console.log('\n✅ Customer ID 4 has loyalty cards:');
        cardResult.rows.forEach((card, index) => {
          console.log(`Card ${index + 1}:`);
          console.log(`  ID: ${card.id}`);
          console.log(`  Business ID: ${card.business_id}`);
          console.log(`  Program ID: ${card.program_id}`);
          console.log(`  Type: ${card.card_type}`);
          console.log(`  Tier: ${card.tier}`);
          console.log(`  Points: ${card.points}`);
          console.log(`  Active: ${card.is_active}`);
        });
      } else {
        console.log('\n❌ Customer ID 4 has no loyalty cards');
      }
    }
    
  } catch (error) {
    console.error('Error checking database schema:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 