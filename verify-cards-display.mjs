import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ SECURITY ERROR: DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your environment');
  console.error('Copy env.example to .env and configure with your database credentials');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Verifying Cards Display for Customer ID 4');

    // 1. Check if customer exists and has proper user_id
    console.log('\n--- Checking Customer Data ---');
    const customerResult = await pool.query(`
      SELECT * FROM customers WHERE id = 4
    `);
    
    if (customerResult.rows.length === 0) {
      console.error('❌ Customer ID 4 does not exist!');
      return;
    }
    
    const customer = customerResult.rows[0];
    console.log(`✅ Customer exists: ID=${customer.id}, Name=${customer.name}, UserID=${customer.user_id}`);
    
    if (customer.user_id !== 4) {
      console.log(`⚠️ Warning: Customer's user_id (${customer.user_id}) does not match expected value (4)`);
      console.log('This may cause issues with card display in the UI!');
    }
    
    // 2. Check customer_programs view to verify program enrollments
    console.log('\n--- Checking Program Enrollments ---');
    try {
      const programsResult = await pool.query(`
        SELECT * FROM customer_programs WHERE customer_id = 4
      `);
      
      if (programsResult.rows.length === 0) {
        console.log('❌ No program enrollments found for customer ID 4');
      } else {
        console.log(`✅ Found ${programsResult.rows.length} program enrollments:`);
        programsResult.rows.forEach((program, index) => {
          console.log(`  [${index + 1}] Program ID: ${program.program_id}, Name: ${program.program_name}, Business: ${program.business_name}, Points: ${program.points}`);
        });
      }
    } catch (error) {
      console.log('❌ Error checking customer_programs view:', error.message);
      
      // Check if the view exists
      const viewExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.views 
          WHERE table_schema = 'public' AND table_name = 'customer_programs'
        );
      `);
      
      if (!viewExists.rows[0].exists) {
        console.log('❌ customer_programs view does not exist!');
      }
    }
    
    // 3. Check customer_loyalty_cards view to verify cards
    console.log('\n--- Checking Loyalty Cards ---');
    try {
      const cardsResult = await pool.query(`
        SELECT * FROM customer_loyalty_cards WHERE customer_id = 4
      `);
      
      if (cardsResult.rows.length === 0) {
        console.log('❌ No loyalty cards found for customer ID 4');
      } else {
        console.log(`✅ Found ${cardsResult.rows.length} loyalty cards:`);
        cardsResult.rows.forEach((card, index) => {
          console.log(`  [${index + 1}] Card ID: ${card.id}, Business: ${card.business_name}, Program: ${card.program_name}`);
          console.log(`      Type: ${card.card_type}, Tier: ${card.tier}, Points: ${card.points}`);
          console.log(`      Is Active: ${card.is_active}`);
        });
      }
    } catch (error) {
      console.log('❌ Error checking customer_loyalty_cards view:', error.message);
      
      // Check if the view exists
      const viewExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.views 
          WHERE table_schema = 'public' AND table_name = 'customer_loyalty_cards'
        );
      `);
      
      if (!viewExists.rows[0].exists) {
        console.log('❌ customer_loyalty_cards view does not exist!');
      }
    }
    
    // 4. Check raw tables to verify underlying data
    console.log('\n--- Checking Raw Table Data ---');
    
    // Check loyalty_cards table
    const rawCardsResult = await pool.query(`
      SELECT * FROM loyalty_cards WHERE customer_id = 4
    `);
    
    if (rawCardsResult.rows.length === 0) {
      console.log('❌ No records in loyalty_cards table for customer ID 4');
    } else {
      console.log(`✅ Found ${rawCardsResult.rows.length} records in loyalty_cards table`);
      rawCardsResult.rows.forEach(card => {
        console.log(`  ID: ${card.id}, Business ID: ${card.business_id}, Program ID: ${card.program_id}`);
        console.log(`  Card Type: ${card.card_type}, Points: ${card.points}`);
      });
    }
    
    // Check program_enrollments table
    const rawEnrollmentsResult = await pool.query(`
      SELECT * FROM program_enrollments WHERE customer_id = 4
    `);
    
    if (rawEnrollmentsResult.rows.length === 0) {
      console.log('❌ No records in program_enrollments table for customer ID 4');
    } else {
      console.log(`✅ Found ${rawEnrollmentsResult.rows.length} records in program_enrollments table`);
      rawEnrollmentsResult.rows.forEach(enrollment => {
        console.log(`  Program ID: ${enrollment.program_id}, Points: ${enrollment.current_points}`);
        console.log(`  Status: ${enrollment.status}, Last Activity: ${enrollment.last_activity}`);
      });
    }
    
    // 5. Verify loyalty_cards table schema
    console.log('\n--- Verifying Table Schema ---');
    const tableColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'loyalty_cards'
    `);
    
    console.log('Loyalty Cards table columns:');
    tableColumns.rows.forEach(column => {
      console.log(`  ${column.column_name} (${column.data_type})`);
    });
    
    // 6. Check LoyaltyCardService implementation
    console.log('\n--- Simulating LoyaltyCardService.getCustomerCards() ---');
    
    // This query simulates what LoyaltyCardService.getCustomerCards() would do
    const simulatedCards = await pool.query(`
      SELECT * 
      FROM customer_loyalty_cards
      WHERE customer_id = 4
      AND is_active = true
      ORDER BY updated_at DESC
    `);
    
    if (simulatedCards.rows.length > 0) {
      console.log(`✅ LoyaltyCardService would return ${simulatedCards.rows.length} cards:`);
      simulatedCards.rows.forEach((card, index) => {
        console.log(`  [${index + 1}] ID: ${card.id}, Business: ${card.business_name}, Program: ${card.program_name}`);
        console.log(`      Type: ${card.card_type}, Tier: ${card.tier}, Points: ${card.points}`);
        console.log(`      Benefits: ${Array.isArray(card.benefits) ? card.benefits.join(', ') : 'None'}`);
      });
    } else {
      console.log('❌ LoyaltyCardService would return empty array - no cards found!');
    }
    
    console.log('\n✅ Verification completed!');
    console.log('If all checks show data for customer ID 4 with an active fitness card, it should appear in the /cards route.');
    
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 