import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || """,
  ssl: true
});

async function checkCustomer4Enrollments() {
  try {
    console.log('Checking customer ID 4 loyalty program enrollments...');
    
    // Check if customer ID 4 exists
    const customerExists = await pool.query(`
      SELECT id, user_id, name, email FROM customers
      WHERE id = 4
    `);
    
    if (customerExists.rows.length === 0) {
      console.log('❌ Customer ID 4 does not exist');
      return;
    }
    
    console.log('✅ Customer ID 4 exists:');
    console.log(`  User ID: ${customerExists.rows[0].user_id}`);
    console.log(`  Name: ${customerExists.rows[0].name}`);
    console.log(`  Email: ${customerExists.rows[0].email}`);
    
    // Check loyalty cards
    const loyaltyCards = await pool.query(`
      SELECT * FROM customer_loyalty_cards
      WHERE customer_id = 4
    `);
    
    if (loyaltyCards.rows.length === 0) {
      console.log('❌ No loyalty cards found for customer ID 4');
    } else {
      console.log(`\n✅ Found ${loyaltyCards.rows.length} loyalty cards for customer ID 4:`);
      loyaltyCards.rows.forEach((card, index) => {
        console.log(`\nCard ${index + 1}:`);
        console.log(`  ID: ${card.id}`);
        console.log(`  Business ID: ${card.business_id}`);
        console.log(`  Business Name: ${card.business_name || 'Unknown'}`);
        console.log(`  Program ID: ${card.program_id}`);
        console.log(`  Program Name: ${card.program_name || 'Unknown'}`);
        console.log(`  Type: ${card.card_type}`);
        console.log(`  Tier: ${card.tier}`);
        console.log(`  Points: ${card.points}`);
        console.log(`  Active: ${card.is_active}`);
      });
    }
    
    // Check program enrollments
    const enrollments = await pool.query(`
      SELECT * FROM program_enrollments
      WHERE customer_id = '4'
    `);
    
    if (enrollments.rows.length === 0) {
      console.log('\n❌ Customer ID 4 is not enrolled in any loyalty programs');
    } else {
      console.log(`\n✅ Customer ID 4 is enrolled in ${enrollments.rows.length} loyalty programs:`);
      enrollments.rows.forEach((enrollment, index) => {
        console.log(`\nEnrollment ${index + 1}:`);
        console.log(`  Program ID: ${enrollment.program_id}`);
        console.log(`  Status: ${enrollment.status}`);
        console.log(`  Current Points: ${enrollment.current_points}`);
        console.log(`  Enrolled At: ${enrollment.enrolled_at}`);
      });
      
      // Get program details for each enrollment
      for (const enrollment of enrollments.rows) {
        const programDetails = await pool.query(`
          SELECT * FROM loyalty_programs
          WHERE id = $1
        `, [enrollment.program_id]);
        
        if (programDetails.rows.length > 0) {
          const program = programDetails.rows[0];
          console.log(`\nProgram ${enrollment.program_id} Details:`);
          console.log(`  Name: ${program.name}`);
          console.log(`  Business ID: ${program.business_id}`);
          console.log(`  Type: ${program.program_type}`);
          console.log(`  Status: ${program.status}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error checking customer enrollments:', error);
  } finally {
    await pool.end();
  }
}

checkCustomer4Enrollments().catch(console.error); 