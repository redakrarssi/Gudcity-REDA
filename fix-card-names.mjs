import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const pool = new Pool({
  connectionString: "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  ssl: true
});

async function main() {
  try {
    console.log('Starting fix for card names...');
    
    // 1. Check if the users table has the business
    const businessExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE id = 1
        AND user_type = 'business'
      );
    `);
    
    if (!businessExists.rows[0].exists) {
      console.log('Business user does not exist, creating...');
      await pool.query(`
        INSERT INTO users (id, name, email, user_type, role, status)
        VALUES (1, 'Demo Business', 'business@example.com', 'business', 'business', 'active')
        ON CONFLICT (id) DO UPDATE
        SET name = 'Demo Business', user_type = 'business', role = 'business', status = 'active';
      `);
      console.log('✅ Created business user');
    } else {
      console.log('✅ Business user already exists');
    }
    
    // 2. Make sure the loyalty program has a name
    const programExists = await pool.query(`
      SELECT name FROM loyalty_programs
      WHERE id = 1
    `);
    
    if (programExists.rows.length === 0) {
      console.log('Loyalty program does not exist, creating...');
      await pool.query(`
        INSERT INTO loyalty_programs (id, business_id, name, type, status)
        VALUES (1, 1, 'Demo Loyalty Program', 'POINTS', 'ACTIVE')
        ON CONFLICT (id) DO UPDATE
        SET name = 'Demo Loyalty Program', business_id = '1', type = 'POINTS', status = 'ACTIVE';
      `);
      console.log('✅ Created loyalty program');
    } else {
      console.log('✅ Loyalty program already exists with name:', programExists.rows[0].name);
    }
    
    // 3. Create a view to join loyalty cards with business names and program names
    console.log('Creating or replacing customer_loyalty_cards view...');
    await pool.query(`
      CREATE OR REPLACE VIEW customer_loyalty_cards AS
      SELECT 
        lc.*,
        lp.name as program_name,
        u.name as business_name
      FROM loyalty_cards lc
      LEFT JOIN loyalty_programs lp ON lc.program_id = lp.id
      LEFT JOIN users u ON CAST(lp.business_id AS INTEGER) = u.id
    `);
    console.log('✅ Created customer_loyalty_cards view');
    
    // 4. Check if the view works correctly
    const cardView = await pool.query(`
      SELECT * FROM customer_loyalty_cards
      WHERE customer_id = 4
    `);
    
    if (cardView.rows.length > 0) {
      console.log('\n✅ Customer ID 4 loyalty card with names:');
      console.log(`  ID: ${cardView.rows[0].id}`);
      console.log(`  Business ID: ${cardView.rows[0].business_id}`);
      console.log(`  Business Name: ${cardView.rows[0].business_name || 'Not set'}`);
      console.log(`  Program ID: ${cardView.rows[0].program_id}`);
      console.log(`  Program Name: ${cardView.rows[0].program_name || 'Not set'}`);
      console.log(`  Type: ${cardView.rows[0].card_type}`);
      console.log(`  Tier: ${cardView.rows[0].tier}`);
      console.log(`  Points: ${cardView.rows[0].points}`);
    } else {
      console.log('\n❌ Customer ID 4 has no loyalty cards in the view');
    }
    
    console.log('\nSuccessfully fixed card names');
  } catch (error) {
    console.error('Error fixing card names:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 