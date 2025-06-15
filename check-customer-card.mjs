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
    console.log('Checking customer ID 4 loyalty card setup...');
    
    // 1. Check user ID 4
    const userExists = await pool.query(`
      SELECT id, name, email, user_type, role, status FROM users
      WHERE id = 4
    `);
    
    if (userExists.rows.length > 0) {
      console.log('✅ User ID 4 exists:');
      console.log(`  Name: ${userExists.rows[0].name}`);
      console.log(`  Email: ${userExists.rows[0].email}`);
      console.log(`  Type: ${userExists.rows[0].user_type}`);
      console.log(`  Status: ${userExists.rows[0].status}`);
    } else {
      console.log('❌ User ID 4 does not exist');
    }
    
    // 2. Check customer ID 4
    const customerExists = await pool.query(`
      SELECT id, user_id, name, email FROM customers
      WHERE id = 4
    `);
    
    if (customerExists.rows.length > 0) {
      console.log('\n✅ Customer ID 4 exists:');
      console.log(`  User ID: ${customerExists.rows[0].user_id}`);
      console.log(`  Name: ${customerExists.rows[0].name}`);
      console.log(`  Email: ${customerExists.rows[0].email}`);
    } else {
      console.log('\n❌ Customer ID 4 does not exist');
    }
    
    // 3. Check loyalty card for customer ID 4
    const cardExists = await pool.query(`
      SELECT * FROM customer_loyalty_cards
      WHERE customer_id = 4
    `);
    
    if (cardExists.rows.length > 0) {
      console.log('\n✅ Loyalty card exists for customer ID 4:');
      console.log(`  ID: ${cardExists.rows[0].id}`);
      console.log(`  Business ID: ${cardExists.rows[0].business_id}`);
      console.log(`  Business Name: ${cardExists.rows[0].business_name}`);
      console.log(`  Program ID: ${cardExists.rows[0].program_id}`);
      console.log(`  Program Name: ${cardExists.rows[0].program_name}`);
      console.log(`  Type: ${cardExists.rows[0].card_type}`);
      console.log(`  Tier: ${cardExists.rows[0].tier}`);
      console.log(`  Points: ${cardExists.rows[0].points}`);
      console.log(`  Points Multiplier: ${cardExists.rows[0].points_multiplier}`);
      console.log(`  Active: ${cardExists.rows[0].is_active}`);
      console.log(`  Available Rewards: ${JSON.stringify(cardExists.rows[0].available_rewards)}`);
    } else {
      console.log('\n❌ No loyalty card found for customer ID 4');
    }
    
    // 4. Check if customer ID 4 is enrolled in any programs
    const enrollmentExists = await pool.query(`
      SELECT * FROM program_enrollments
      WHERE customer_id = '4'
    `);
    
    if (enrollmentExists.rows.length > 0) {
      console.log('\n✅ Customer ID 4 is enrolled in programs:');
      enrollmentExists.rows.forEach((enrollment, index) => {
        console.log(`  Enrollment ${index + 1}:`);
        console.log(`    Program ID: ${enrollment.program_id}`);
        console.log(`    Status: ${enrollment.status}`);
        console.log(`    Current Points: ${enrollment.current_points}`);
        console.log(`    Enrolled At: ${enrollment.enrolled_at}`);
      });
    } else {
      console.log('\n❌ Customer ID 4 is not enrolled in any programs');
      
      // Create enrollment if missing
      console.log('Creating program enrollment for customer ID 4...');
      await pool.query(`
        INSERT INTO program_enrollments (
          customer_id,
          program_id,
          current_points,
          status,
          last_activity,
          enrolled_at
        ) VALUES (
          '4',
          1,
          100,
          'ACTIVE',
          NOW(),
          NOW()
        )
      `);
      console.log('✅ Created program enrollment for customer ID 4');
    }
    
    console.log('\nCheck completed.');
  } catch (error) {
    console.error('Error checking customer ID 4 card setup:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 