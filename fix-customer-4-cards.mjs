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
    console.log('Starting fix for customer ID 4 loyalty cards...');
    
    // 1. Check if customer exists
    const customerExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM customers 
        WHERE id = 4
      );
    `);
    
    if (!customerExists.rows[0].exists) {
      console.log('Customer ID 4 does not exist, creating...');
      await pool.query(`
        INSERT INTO customers (id, user_id, name, email)
        VALUES (4, 4, 'Customer 4', 'customer4@example.com')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Created customer ID 4');
    } else {
      console.log('✅ Customer ID 4 already exists');
    }
    
    // 2. Check if business exists
    const businessExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM businesses 
        WHERE id = 1
      );
    `);
    
    if (!businessExists.rows[0].exists) {
      console.log('Business ID 1 does not exist, creating...');
      await pool.query(`
        INSERT INTO businesses (id, name, status)
        VALUES (1, 'Demo Business', 'active')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Created business ID 1');
    } else {
      console.log('✅ Business ID 1 already exists');
    }
    
    // 3. Check if loyalty program exists
    const programExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM loyalty_programs 
        WHERE id = 1
      );
    `);
    
    if (!programExists.rows[0].exists) {
      console.log('Loyalty program ID 1 does not exist, creating...');
      await pool.query(`
        INSERT INTO loyalty_programs (id, business_id, name, type, status)
        VALUES (1, 1, 'Demo Program', 'POINTS', 'ACTIVE')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Created loyalty program ID 1');
    } else {
      console.log('✅ Loyalty program ID 1 already exists');
    }
    
    // 4. Check if customer already has a loyalty card
    const cardExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM loyalty_cards 
        WHERE customer_id = 4
        AND program_id = 1
      );
    `);
    
    if (!cardExists.rows[0].exists) {
      console.log('Creating loyalty card for customer ID 4...');
      await pool.query(`
        INSERT INTO loyalty_cards (
          customer_id, 
          business_id, 
          program_id, 
          card_type, 
          tier,
          points, 
          points_multiplier,
          benefits,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          4, 
          1, 
          1, 
          'STANDARD', 
          'STANDARD',
          100, 
          1.0,
          ARRAY['Basic rewards', 'Birthday gift'],
          true,
          NOW(),
          NOW()
        );
      `);
      console.log('✅ Created loyalty card for customer ID 4');
    } else {
      console.log('✅ Customer ID 4 already has a loyalty card');
      
      // Update the card to ensure it's active and has proper data
      await pool.query(`
        UPDATE loyalty_cards
        SET 
          tier = 'STANDARD',
          card_type = 'STANDARD',
          points = 100,
          points_multiplier = 1.0,
          benefits = ARRAY['Basic rewards', 'Birthday gift'],
          is_active = true,
          updated_at = NOW()
        WHERE customer_id = 4
        AND program_id = 1;
      `);
      console.log('✅ Updated loyalty card for customer ID 4');
    }
    
    console.log('Successfully fixed loyalty card for customer ID 4');
  } catch (error) {
    console.error('Error fixing customer ID 4 loyalty cards:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 