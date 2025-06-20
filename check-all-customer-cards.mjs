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
    console.log('Starting customer cards diagnostic check...');
    console.log('============================================');
    
    // 1. Get all customers
    const customersResult = await pool.query(`
      SELECT id, user_id, name, email, status FROM customers
      ORDER BY id ASC
    `);
    
    if (customersResult.rows.length === 0) {
      console.log('❌ No customers found in the database!');
      return;
    }
    
    console.log(`✅ Found ${customersResult.rows.length} customers in the database`);
    
    // 2. Check for database views needed for the cards system
    console.log('\nChecking required database views...');
    
    const viewChecks = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name IN ('customer_loyalty_cards', 'customer_programs')
    `);
    
    const views = viewChecks.rows.map(row => row.table_name);
    
    if (views.includes('customer_loyalty_cards')) {
      console.log('✅ customer_loyalty_cards view exists');
    } else {
      console.log('❌ customer_loyalty_cards view is missing!');
    }
    
    if (views.includes('customer_programs')) {
      console.log('✅ customer_programs view exists');
    } else {
      console.log('❌ customer_programs view is missing!');
    }
    
    // 3. Check loyalty programs
    console.log('\nChecking loyalty programs...');
    
    const programsCheck = await pool.query(`
      SELECT id, name, business_id, status FROM loyalty_programs
      ORDER BY id ASC
    `);
    
    if (programsCheck.rows.length === 0) {
      console.log('❌ No loyalty programs found in the database!');
    } else {
      console.log(`✅ Found ${programsCheck.rows.length} loyalty programs`);
      
      // Check for standard demo program (ID 1)
      const demoProgram = programsCheck.rows.find(p => p.id === 1);
      if (demoProgram) {
        console.log(`✅ Standard demo program exists: ${demoProgram.name} (Business ID: ${demoProgram.business_id}, Status: ${demoProgram.status})`);
      } else {
        console.log('❌ Standard demo program (ID 1) is missing!');
      }
      
      // Check for fitness program (ID 10)
      const fitnessProgram = programsCheck.rows.find(p => p.id === 10);
      if (fitnessProgram) {
        console.log(`✅ Fitness program exists: ${fitnessProgram.name} (Business ID: ${fitnessProgram.business_id}, Status: ${fitnessProgram.status})`);
      } else {
        console.log('❌ Fitness program (ID 10) is missing!');
      }
    }
    
    // 4. Process each customer
    console.log('\nChecking cards for each customer...');
    console.log('-----------------------------------');
    
    // Track overall stats
    let customersWithNoCards = 0;
    let customersWithStandardCard = 0;
    let customersWithFitnessCard = 0;
    let customersWithBothCards = 0;
    let customersWithCardErrors = 0;
    
    for (const customer of customersResult.rows) {
      console.log(`\nCustomer ID ${customer.id} (${customer.name || 'Unknown'}):`);
      
      // Check active status
      if (customer.status !== 'active') {
        console.log(`⚠️ Customer status is not active: ${customer.status}`);
      }
      
      // Check loyalty cards
      const cardsCheck = await pool.query(`
        SELECT 
          id, 
          business_id, 
          program_id, 
          card_type, 
          tier, 
          points_balance AS points,
          status
        FROM loyalty_cards
        WHERE customer_id = $1
        ORDER BY program_id ASC
      `, [customer.id]);
      
      if (cardsCheck.rows.length === 0) {
        console.log(`❌ No loyalty cards found for customer ID ${customer.id}`);
        customersWithNoCards++;
        customersWithCardErrors++;
        continue;
      }
      
      console.log(`Found ${cardsCheck.rows.length} loyalty cards for this customer:`);
      
      let hasStandardCard = false;
      let hasFitnessCard = false;
      let hasCardErrors = false;
      
      for (const card of cardsCheck.rows) {
        // Check if card has proper program association
        if (card.program_id === 1) {
          hasStandardCard = true;
          console.log(`  ✓ Standard card: ID ${card.id}, Type ${card.card_type}, Tier ${card.tier}, Points ${card.points}, Status ${card.status}`);
          
          if (card.status !== 'active') {
            console.log(`  ❌ Standard card is not active!`);
            hasCardErrors = true;
          }
          
          if (card.card_type !== 'STANDARD') {
            console.log(`  ⚠️ Standard card has incorrect type: ${card.card_type}`);
          }
          
          if (card.tier !== 'STANDARD') {
            console.log(`  ⚠️ Standard card has incorrect tier: ${card.tier}`);
          }
        } 
        else if (card.program_id === 10) {
          hasFitnessCard = true;
          console.log(`  ✓ Fitness card: ID ${card.id}, Type ${card.card_type}, Tier ${card.tier}, Points ${card.points}, Status ${card.status}`);
          
          if (card.status !== 'active') {
            console.log(`  ❌ Fitness card is not active!`);
            hasCardErrors = true;
          }
          
          if (card.card_type !== 'FITNESS') {
            console.log(`  ⚠️ Fitness card has incorrect type: ${card.card_type}`);
          }
          
          if (card.tier !== 'GOLD') {
            console.log(`  ⚠️ Fitness card has incorrect tier: ${card.tier}`);
          }
        }
        else {
          console.log(`  ✓ Other card: ID ${card.id}, Program ${card.program_id}, Type ${card.card_type}, Points ${card.points}, Status ${card.status}`);
        }
      }
      
      // Check enrollments
      const enrollmentsCheck = await pool.query(`
        SELECT 
          id,
          program_id,
          current_points,
          status
        FROM program_enrollments
        WHERE customer_id = $1
      `, [customer.id]);
      
      if (enrollmentsCheck.rows.length === 0) {
        console.log(`❌ No program enrollments found for customer ID ${customer.id}`);
        hasCardErrors = true;
      } else {
        console.log(`Found ${enrollmentsCheck.rows.length} program enrollments for this customer`);
        
        // Check fitness enrollment
        const fitnessEnrollment = enrollmentsCheck.rows.find(e => e.program_id === 10);
        if (hasFitnessCard && !fitnessEnrollment) {
          console.log(`❌ Customer has fitness card but no program enrollment`);
          hasCardErrors = true;
        }
        else if (fitnessEnrollment && fitnessEnrollment.status !== 'ACTIVE') {
          console.log(`❌ Fitness program enrollment is not active: ${fitnessEnrollment.status}`);
          hasCardErrors = true;
        }
      }
      
      // Update stats
      if (hasStandardCard) customersWithStandardCard++;
      if (hasFitnessCard) customersWithFitnessCard++;
      if (hasStandardCard && hasFitnessCard) customersWithBothCards++;
      if (hasCardErrors) customersWithCardErrors++;
      
      console.log(`Summary for customer ${customer.id}: Standard Card: ${hasStandardCard ? '✅' : '❌'}, Fitness Card: ${hasFitnessCard ? '✅' : '❌'}`);
    }
    
    // 5. Display summary
    console.log('\n============================================');
    console.log('DIAGNOSTIC SUMMARY:');
    console.log('============================================');
    console.log(`Total Customers: ${customersResult.rows.length}`);
    console.log(`Customers with NO cards: ${customersWithNoCards}`);
    console.log(`Customers with Standard card: ${customersWithStandardCard}`);
    console.log(`Customers with Fitness card: ${customersWithFitnessCard}`);
    console.log(`Customers with BOTH cards: ${customersWithBothCards}`);
    console.log(`Customers with card ERRORS: ${customersWithCardErrors}`);
    console.log('============================================');
    
    if (customersWithCardErrors > 0) {
      console.log(`\n⚠️ RECOMMENDATION: Run the universal-card-setup.mjs script to fix card issues.`);
    } else {
      console.log(`\n✅ All customers appear to have properly configured cards.`);
    }
    
  } catch (error) {
    console.error('Error during diagnostic check:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 