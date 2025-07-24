import sql from './src/utils/db.js';

/**
 * This script checks the schema of the loyalty_cards table to understand its structure
 */
async function checkLoyaltyCardsSchema() {
  try {
    console.log('Connecting to database...');
    
    // Check the columns in loyalty_cards table
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'loyalty_cards'
      ORDER BY ordinal_position
    `;
    
    console.log('Loyalty Cards Table Schema:');
    console.table(columns);
    
    // Check the number of rows in the loyalty_cards table
    const count = await sql`
      SELECT COUNT(*) FROM loyalty_cards
    `;
    
    console.log(`Total loyalty cards: ${count[0].count}`);
    
    // Get a sample of data to understand the table content
    const sample = await sql`
      SELECT id, customer_id, business_id, program_id, points, created_at, updated_at
      FROM loyalty_cards
      LIMIT 5
    `;
    
    console.log('Sample loyalty card data:');
    console.table(sample);
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking loyalty_cards schema:', error);
    process.exit(1);
  }
}

checkLoyaltyCardsSchema(); 