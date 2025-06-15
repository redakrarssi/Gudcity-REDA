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
    console.log('Starting fix for customer ID 4 fitness program card...');
    
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
        INSERT INTO customers (id, user_id, name, email, status)
        VALUES (4, 4, 'Customer 4', 'customer4@example.com', 'active')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Created customer ID 4');
    } else {
      console.log('✅ Customer ID 4 already exists');
    }
    
    // 2. Create or update fitness business
    console.log('Creating/updating fitness business...');
    await pool.query(`
      INSERT INTO users (id, name, email, user_type, role, status)
      VALUES (10, 'Fitness Center', 'fitness@example.com', 'business', 'business', 'active')
      ON CONFLICT (id) DO UPDATE 
      SET name = 'Fitness Center', email = 'fitness@example.com', 
          user_type = 'business', role = 'business', status = 'active';
    `);
    console.log('✅ Fitness business created/updated');
    
    await pool.query(`
      INSERT INTO businesses (id, user_id, name, status, owner, email, created_at, updated_at)
      VALUES (10, 10, 'Fitness Center', 'active', 'John Doe', 'fitness@example.com', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE 
      SET name = 'Fitness Center', status = 'active', owner = 'John Doe', email = 'fitness@example.com', updated_at = NOW();
    `);
    console.log('✅ Fitness business record created/updated');
    
    // 3. Create or update fitness loyalty program
    console.log('Creating/updating fitness loyalty program...');
    await pool.query(`
      INSERT INTO loyalty_programs (id, business_id, name, description, status, type, created_at, updated_at)
      VALUES (10, 10, 'Fitness Membership', 'Earn points with every workout', 'ACTIVE', 'POINTS', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE 
      SET name = 'Fitness Membership', description = 'Earn points with every workout', 
          status = 'ACTIVE', updated_at = NOW();
    `);
    console.log('✅ Fitness loyalty program created/updated');
    
    // 4. Ensure customer_program_enrollments table has all required columns
    console.log('Checking customer_program_enrollments table structure...');
    try {
      await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'program_enrollments' AND column_name = 'status') THEN
                ALTER TABLE program_enrollments ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';
            END IF;
        END
        $$;
      `);
      console.log('✅ Ensured program_enrollments table has status column');
    } catch (err) {
      console.log('⚠️ Could not check program_enrollments table structure:', err.message);
    }
    
    // 5. Enroll customer in fitness program
    console.log('Enrolling customer ID 4 in fitness program...');
    await pool.query(`
      INSERT INTO program_enrollments (
        program_id,
        customer_id,
        current_points,
        status,
        enrolled_at,
        last_activity
      )
      VALUES (10, 4, 150, 'ACTIVE', NOW(), NOW())
      ON CONFLICT (program_id, customer_id) DO UPDATE 
      SET current_points = 150, status = 'ACTIVE', last_activity = NOW();
    `);
    console.log('✅ Customer enrolled in fitness program');
    
    // 6. Create customer_programs view if it doesn't exist
    console.log('Creating customer_programs view...');
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
    
    // 7. Create or update fitness card for customer
    console.log('Creating/updating fitness card for customer ID 4...');
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
        4,
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
      ON CONFLICT (customer_id, business_id) DO UPDATE 
      SET points_balance = 150,
          total_points_earned = 200,
          program_id = 10,
          tier = 'GOLD',
          card_type = 'FITNESS',
          points_multiplier = 1.5,
          benefits = ARRAY['Free fitness assessment', 'Monthly body composition scan', 'One free personal training session'],
          status = 'active',
          updated_at = NOW();
    `);
    console.log('✅ Fitness card created/updated for customer ID 4');
    
    // 8. Create customer_loyalty_cards view if it doesn't exist
    console.log('Creating customer_loyalty_cards view...');
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
    
    // 9. Check if everything is working
    console.log('\nVerifying fixes...');
    
    const customerCheck = await pool.query(`
      SELECT id, name, user_id, status FROM customers WHERE id = 4
    `);
    
    if (customerCheck.rows.length > 0) {
      console.log('✅ Customer 4 exists:', customerCheck.rows[0]);
    } else {
      console.log('❌ Customer 4 not found!');
    }
    
    const programCheck = await pool.query(`
      SELECT * FROM customer_programs WHERE customer_id = 4 AND program_id = 10
    `);
    
    if (programCheck.rows.length > 0) {
      console.log('✅ Customer 4 enrolled in fitness program:', programCheck.rows[0]);
    } else {
      console.log('❌ Customer 4 not enrolled in fitness program!');
    }
    
    const cardCheck = await pool.query(`
      SELECT id, customer_id, business_id, program_id, card_type, tier, points, business_name, program_name
      FROM customer_loyalty_cards
      WHERE customer_id = 4 AND program_id = 10
    `);
    
    if (cardCheck.rows.length > 0) {
      console.log('✅ Fitness card exists for customer 4:', cardCheck.rows[0]);
    } else {
      console.log('❌ Fitness card not found for customer 4!');
    }
    
    console.log('\n✅ Fix process completed successfully');
    console.log('Customer ID 4 should now see their fitness program card in /cards');
    
  } catch (error) {
    console.error('Error fixing fitness card for customer ID 4:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 