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
    console.log('Starting fix to apply fitness program cards to all customers...');
    
    // 1. Get all customers
    console.log('\n--- Finding all customers ---');
    const customersResult = await pool.query(`
      SELECT id, user_id, name, email FROM customers
    `);
    
    if (customersResult.rows.length === 0) {
      console.log('No customers found!');
      return;
    }
    
    console.log(`Found ${customersResult.rows.length} customers`);
    
    // 2. Create/update fitness business if needed
    console.log('\n--- Setting up fitness business ---');
    await pool.query(`
      INSERT INTO users (id, name, email, user_type, role, status)
      VALUES (10, 'Fitness Center', 'fitness@example.com', 'business', 'business', 'active')
      ON CONFLICT (id) DO UPDATE 
      SET name = 'Fitness Center', email = 'fitness@example.com', 
          user_type = 'business', role = 'business', status = 'active';
    `);
    console.log('✅ Fitness business user created/updated');
    
    // Create or update fitness business
    await pool.query(`
      INSERT INTO businesses (id, user_id, name, owner, email, status, created_at, updated_at)
      VALUES (10, 10, 'Fitness Center', 'John Doe', 'fitness@example.com', 'active', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE 
      SET name = 'Fitness Center', owner = 'John Doe', email = 'fitness@example.com', 
          status = 'active', updated_at = NOW();
    `);
    console.log('✅ Fitness business record created/updated');
    
    // 3. Create/update fitness loyalty program
    console.log('\n--- Setting up fitness loyalty program ---');
    await pool.query(`
      INSERT INTO loyalty_programs (id, business_id, name, description, type, status, created_at, updated_at)
      VALUES (10, 10, 'Fitness Membership', 'Earn points with every workout', 'POINTS', 'ACTIVE', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE 
      SET name = 'Fitness Membership', description = 'Earn points with every workout', 
          type = 'POINTS', status = 'ACTIVE', updated_at = NOW();
    `);
    console.log('✅ Fitness loyalty program created/updated');
    
    // 4. Process each customer
    console.log('\n--- Enrolling customers in fitness program ---');
    
    for (const customer of customersResult.rows) {
      console.log(`Processing customer ID ${customer.id} (${customer.name || 'Unknown'})...`);
      
      // Check if customer is already enrolled in fitness program
      const existingEnrollment = await pool.query(`
        SELECT id FROM program_enrollments
        WHERE program_id = 10 AND customer_id = $1
      `, [customer.id]);
      
      if (existingEnrollment.rows.length > 0) {
        // Update existing enrollment
        await pool.query(`
          UPDATE program_enrollments
          SET current_points = 150, 
              status = 'ACTIVE', 
              last_activity = NOW()
          WHERE id = $1
        `, [existingEnrollment.rows[0].id]);
        console.log(`✅ Updated existing program enrollment for customer ID ${customer.id}`);
      } else {
        // Create new enrollment
        await pool.query(`
          INSERT INTO program_enrollments (
            program_id,
            customer_id,
            current_points,
            status,
            enrolled_at,
            last_activity
          )
          VALUES (10, $1, 150, 'ACTIVE', NOW(), NOW())
        `, [customer.id]);
        console.log(`✅ Created new program enrollment for customer ID ${customer.id}`);
      }
      
      // Check if customer already has a fitness card
      const existingCard = await pool.query(`
        SELECT id FROM loyalty_cards
        WHERE customer_id = $1 AND business_id = 10
      `, [customer.id]);
      
      if (existingCard.rows.length > 0) {
        // Update existing card
        await pool.query(`
          UPDATE loyalty_cards
          SET program_id = 10,
              points = 150,
              tier = 'GOLD',
              card_type = 'FITNESS',
              points_multiplier = 1.5,
              benefits = ARRAY['Free fitness assessment', 'Monthly body composition scan', 'One free personal training session'],
              status = 'active',
              updated_at = NOW()
          WHERE id = $1
        `, [existingCard.rows[0].id]);
        console.log(`✅ Updated existing fitness card for customer ID ${customer.id}`);
      } else {
        // Create new card
        await pool.query(`
          INSERT INTO loyalty_cards (
            customer_id,
            business_id,
            program_id,
            card_number,
            card_type,
            tier,
            points,
            points_multiplier,
            benefits,
            status,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            10,
            10,
            'FIT-' || LPAD(FLOOR(random() * 10000)::text, 4, '0'),
            'FITNESS',
            'GOLD',
            150,
            1.5,
            ARRAY['Free fitness assessment', 'Monthly body composition scan', 'One free personal training session'],
            'active',
            NOW(),
            NOW()
          )
        `, [customer.id]);
        console.log(`✅ Created new fitness card for customer ID ${customer.id}`);
      }
    }
    
    // 5. Verify the results
    console.log('\n--- Verifying results ---');
    
    // Count how many customers have fitness cards
    const cardCount = await pool.query(`
      SELECT COUNT(*) FROM loyalty_cards
      WHERE business_id = 10 AND program_id = 10 AND status = 'active'
    `);
    
    console.log(`✅ ${cardCount.rows[0].count} customers now have active fitness cards`);
    
    console.log('\n✅ All fixes completed successfully!');
    console.log('All customers should now see their fitness program card in the /cards route.');
    
  } catch (error) {
    console.error('Error during fix process:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 