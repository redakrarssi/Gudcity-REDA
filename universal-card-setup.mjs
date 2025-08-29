import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || """,
  ssl: true
});

async function main() {
  try {
    console.log('Starting universal card setup for all customers...');
    
    // 1. Get all customers
    const customersResult = await pool.query(`
      SELECT id, user_id, name, email, status FROM customers
      WHERE status = 'active'
    `);
    
    if (customersResult.rows.length === 0) {
      console.log('No active customers found!');
      return;
    }
    
    console.log(`Found ${customersResult.rows.length} active customers`);
    
    // 2. Check if business ID 1 exists (Demo Business)
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
    
    // 3. Check if standard loyalty program exists
    const standardProgramExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM loyalty_programs 
        WHERE id = 1
      );
    `);
    
    if (!standardProgramExists.rows[0].exists) {
      console.log('Standard loyalty program ID 1 does not exist, creating...');
      await pool.query(`
        INSERT INTO loyalty_programs (id, business_id, name, type, status)
        VALUES (1, 1, 'Demo Program', 'POINTS', 'ACTIVE')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Created standard loyalty program ID 1');
    } else {
      console.log('✅ Standard loyalty program ID 1 already exists');
    }
    
    // 4. Create/update fitness business if needed
    console.log('\n--- Setting up fitness business ---');
    await pool.query(`
      INSERT INTO users (id, name, email, user_type, role, status)
      VALUES (10, 'Fitness Center', 'fitness@example.com', 'business', 'business', 'active')
      ON CONFLICT (id) DO UPDATE 
      SET name = 'Fitness Center', email = 'fitness@example.com', 
          user_type = 'business', role = 'business', status = 'active';
    `);
    console.log('✅ Fitness business user created/updated');
    
    await pool.query(`
      INSERT INTO businesses (id, user_id, name, status, owner, email, created_at, updated_at)
      VALUES (10, 10, 'Fitness Center', 'active', 'John Doe', 'fitness@example.com', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE 
      SET name = 'Fitness Center', status = 'active', owner = 'John Doe', email = 'fitness@example.com', updated_at = NOW();
    `);
    console.log('✅ Fitness business record created/updated');
    
    // 5. Create/update fitness loyalty program
    console.log('\n--- Setting up fitness loyalty program ---');
    await pool.query(`
      INSERT INTO loyalty_programs (id, business_id, name, description, status, type, created_at, updated_at)
      VALUES (10, 10, 'Fitness Membership', 'Earn points with every workout', 'ACTIVE', 'POINTS', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE 
      SET name = 'Fitness Membership', description = 'Earn points with every workout', 
          status = 'ACTIVE', updated_at = NOW();
    `);
    console.log('✅ Fitness loyalty program created/updated');
    
    // 6. Process each customer
    console.log('\n--- Setting up cards for all customers ---');
    
    for (const customer of customersResult.rows) {
      console.log(`\nProcessing customer ID ${customer.id} (${customer.name || 'Unknown'})...`);
      
      // A. Set up standard loyalty card for customer
      const standardCardExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM loyalty_cards 
          WHERE customer_id = $1
          AND program_id = 1
        );
      `, [customer.id]);
      
      if (!standardCardExists.rows[0].exists) {
        console.log(`Creating standard loyalty card for customer ID ${customer.id}...`);
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
            status,
            created_at,
            updated_at
          )
          VALUES (
            $1, 
            1, 
            1, 
            'STANDARD', 
            'STANDARD',
            100, 
            1.0,
            ARRAY['Basic rewards', 'Birthday gift'],
            'active',
            NOW(),
            NOW()
          );
        `, [customer.id]);
        console.log(`✅ Created standard loyalty card for customer ID ${customer.id}`);
      } else {
        console.log(`✅ Customer ID ${customer.id} already has a standard loyalty card`);
        
        // Update the standard card to ensure it's active and has proper data
        await pool.query(`
          UPDATE loyalty_cards
          SET 
            tier = 'STANDARD',
            card_type = 'STANDARD',
            points = CASE WHEN points < 100 THEN 100 ELSE points END,
            points_multiplier = 1.0,
            benefits = ARRAY['Basic rewards', 'Birthday gift'],
            status = 'active',
            updated_at = NOW()
          WHERE customer_id = $1
          AND program_id = 1;
        `, [customer.id]);
        console.log(`✅ Updated standard loyalty card for customer ID ${customer.id}`);
      }
      
      // B. Set up program enrollment for fitness program
      const fitnessEnrollmentExists = await pool.query(`
        SELECT id FROM program_enrollments
        WHERE program_id = 10 AND customer_id = $1
      `, [customer.id]);
      
      if (fitnessEnrollmentExists.rows.length > 0) {
        // Update existing enrollment
        await pool.query(`
          UPDATE program_enrollments
          SET current_points = 150, 
              status = 'ACTIVE', 
              last_activity = NOW()
          WHERE id = $1
        `, [fitnessEnrollmentExists.rows[0].id]);
        console.log(`✅ Updated existing fitness program enrollment for customer ID ${customer.id}`);
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
        console.log(`✅ Created new fitness program enrollment for customer ID ${customer.id}`);
      }
      
      // C. Set up fitness card
      const fitnessCardExists = await pool.query(`
        SELECT id FROM loyalty_cards
        WHERE customer_id = $1 AND business_id = 10 AND program_id = 10
      `, [customer.id]);
      
      if (fitnessCardExists.rows.length > 0) {
        // Update existing card
        await pool.query(`
          UPDATE loyalty_cards
          SET points_balance = 150,
              total_points_earned = 200,
              tier = 'GOLD',
              card_type = 'FITNESS',
              points_multiplier = 1.5,
              benefits = ARRAY['Free fitness assessment', 'Monthly body composition scan', 'One free personal training session'],
              status = 'active',
              updated_at = NOW()
          WHERE id = $1
        `, [fitnessCardExists.rows[0].id]);
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
            points_balance,
            total_points_earned,
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
            200,
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
    
    // 7. Ensure views are properly created
    console.log('\n--- Setting up necessary views ---');
    
    // Create customer_programs view
    await pool.query(`
      CREATE OR REPLACE VIEW customer_programs AS
      SELECT 
        e.customer_id,
        e.program_id,
        e.current_points as points,
        e.status,
        p.business_id,
        p.name as program_name,
        b.name as business_name,
        e.enrolled_at,
        e.last_activity
      FROM 
        program_enrollments e
      JOIN 
        loyalty_programs p ON e.program_id = p.id
      JOIN 
        businesses b ON p.business_id = b.id
      WHERE 
        e.status = 'ACTIVE';
    `);
    console.log('✅ customer_programs view created/updated');
    
    // Create customer_loyalty_cards view
    await pool.query(`
      CREATE OR REPLACE VIEW customer_loyalty_cards AS
      SELECT
        lc.id,
        lc.customer_id,
        lc.business_id,
        lc.program_id,
        lc.card_number,
        lc.card_type,
        lc.tier,
        lc.points_balance AS points,
        lc.total_points_earned,
        lc.points_multiplier,
        lc.promo_code,
        lc.next_reward,
        lc.points_to_next,
        lc.expiry_date,
        lc.benefits,
        lc.last_used,
        lc.status = 'active' AS is_active,
        lc.enrollment_date,
        lc.created_at,
        lc.updated_at,
        p.name AS program_name,
        b.name AS business_name
      FROM
        loyalty_cards lc
      LEFT JOIN
        loyalty_programs p ON lc.program_id = p.id
      LEFT JOIN
        businesses b ON lc.business_id = b.id
      WHERE
        lc.status = 'active';
    `);
    console.log('✅ customer_loyalty_cards view created/updated');
    
    // 8. Run verification
    console.log('\n--- Verifying results ---');
    
    // Standard cards count
    const standardCardCount = await pool.query(`
      SELECT COUNT(*) FROM loyalty_cards
      WHERE program_id = 1 AND status = 'active'
    `);
    console.log(`✅ ${standardCardCount.rows[0].count} customers now have active standard cards`);
    
    // Fitness cards count
    const fitnessCardCount = await pool.query(`
      SELECT COUNT(*) FROM loyalty_cards
      WHERE business_id = 10 AND program_id = 10 AND status = 'active'
    `);
    console.log(`✅ ${fitnessCardCount.rows[0].count} customers now have active fitness cards`);
    
    console.log('\n✅ Universal card setup completed successfully!');
    console.log('All customers should now see their loyalty cards in the /cards route.');
    
  } catch (error) {
    console.error('Error during universal card setup:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 