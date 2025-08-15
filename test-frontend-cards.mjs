import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.VITE_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ VITE_DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('Database URL found: Yes');

const sql = postgres(databaseUrl);

async function testFrontendCards() {
  try {
    console.log('🧪 Testing frontend card fetching...');
    
    const customerId = '29'; // User ID as string (what frontend sends)
    console.log('Frontend sends customer ID:', customerId);
    
    // Simulate the frontend logic step by step
    
    // Step 1: Check if customer record exists
    console.log('\n1. 🔍 Checking customer record...');
    const customerResult = await sql`SELECT id FROM customers WHERE user_id = ${customerId}`;
    console.log('Customer record:', customerResult);
    
    if (customerResult.length === 0) {
      console.log('❌ No customer record found');
      return;
    }
    
    const actualCustomerId = customerResult[0].id;
    console.log('✅ Actual customer ID from database:', actualCustomerId);
    
    // Step 2: Check if reward_tiers column exists
    console.log('\n2. 🔍 Checking database schema...');
    const columnExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='loyalty_programs' AND column_name='reward_tiers'
      );
    `;
    console.log('reward_tiers column exists:', columnExists[0].exists);
    
    // Step 3: Simulate the exact query from getCustomerCards
    console.log('\n3. 🔍 Simulating getCustomerCards query...');
    
    let result;
    const customerIdInt = parseInt(customerId.toString(), 10);
    const customerIdStr = customerId.toString();
    
    console.log('Looking for cards with customer_id =', customerIdInt, 'OR customer_id =', customerIdStr);
    
    if (columnExists && columnExists[0] && columnExists[0].exists) {
      result = await sql`
        SELECT 
          lc.*,
          lp.name as program_name,
          lp.description as program_description,
          lp.type as program_type,
          lp.points_per_dollar,
          lp.reward_tiers,
          lp.points_expiry_days,
          u.name as business_name
        FROM loyalty_cards lc
        JOIN loyalty_programs lp ON lc.program_id = lp.id
        JOIN users u ON lp.business_id = u.id
        WHERE (lc.customer_id = ${customerIdInt} OR lc.customer_id = ${customerIdStr})
        ORDER BY lc.created_at DESC
      `;
    } else {
      result = await sql`
        SELECT 
          lc.*,
          lp.name as program_name,
          lp.description as program_description,
          lp.type as program_type,
          lp.points_per_dollar,
          lp.points_expiry_days,
          u.name as business_name
        FROM loyalty_cards lc
        JOIN loyalty_programs lp ON lc.program_id = lp.id
        JOIN users u ON lp.business_id = u.id
        WHERE (lc.customer_id = ${customerIdInt} OR lc.customer_id = ${customerIdStr})
        ORDER BY lc.created_at DESC
      `;
    }
    
    console.log('Query result:', result);
    console.log('Number of cards found:', result.length);
    
    if (result.length > 0) {
      console.log('\n4. 📊 Card details found:');
      result.forEach((card, index) => {
        console.log(`Card ${index + 1}:`);
        console.log('  - ID:', card.id);
        console.log('  - Customer ID:', card.customer_id, 'Type:', typeof card.customer_id);
        console.log('  - Program ID:', card.program_id);
        console.log('  - Program Name:', card.program_name);
        console.log('  - Business Name:', card.business_name);
        console.log('  - Status:', card.status);
        console.log('  - Card Number:', card.card_number);
        console.log('  - Points:', card.points);
      });
    } else {
      console.log('\n❌ No cards found! This explains why the frontend shows nothing.');
      
      // Let's debug why no cards are found
      console.log('\n5. 🔍 Debugging why no cards found...');
      
      // Check what's in loyalty_cards table
      const allCards = await sql`SELECT * FROM loyalty_cards`;
      console.log('All cards in database:', allCards.length);
      if (allCards.length > 0) {
        console.log('Sample card:', allCards[0]);
      }
      
      // Check what's in program_enrollments table
      const allEnrollments = await sql`SELECT * FROM program_enrollments`;
      console.log('All enrollments in database:', allEnrollments.length);
      if (allEnrollments.length > 0) {
        console.log('Sample enrollment:', allEnrollments[0]);
      }
      
      // Check the specific customer ID we're looking for
      console.log('\nLooking for customer_id =', actualCustomerId);
      const specificCards = await sql`SELECT * FROM loyalty_cards WHERE customer_id = ${actualCustomerId}`;
      console.log('Cards with customer_id =', actualCustomerId, ':', specificCards.length);
      
      // Check if there's a type mismatch
      console.log('\nChecking for type mismatches...');
      const stringLookup = await sql`SELECT * FROM loyalty_cards WHERE customer_id = '${actualCustomerId}'`;
      console.log('String lookup result:', stringLookup.length);
      
      const intLookup = await sql`SELECT * FROM loyalty_cards WHERE customer_id = ${actualCustomerId}`;
      console.log('Integer lookup result:', intLookup.length);
    }
    
  } catch (error) {
    console.error('❌ Error testing frontend cards:', error);
  } finally {
    await sql.end();
  }
}

// Run the test
testFrontendCards()
  .then(() => {
    console.log('\n🎉 Frontend card test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Frontend card test failed:', error);
    process.exit(1);
  });