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

async function debugFrontendDeep() {
  try {
    console.log('🔍 Deep debugging frontend card fetching...');
    
    const userId = '29'; // What the frontend sends
    console.log('Frontend sends user ID:', userId);
    
    // Step 1: Simulate the exact frontend logic
    console.log('\n1. 🔄 SIMULATING FRONTEND LOGIC STEP BY STEP');
    console.log('=============================================');
    
    // Get customer record (what the frontend now does)
    const customerResult = await sql`SELECT id FROM customers WHERE user_id = ${userId}`;
    console.log('Customer lookup result:', customerResult);
    
    if (customerResult.length === 0) {
      console.log('❌ No customer record found - this would cause the issue');
      return;
    }
    
    const actualCustomerId = customerResult[0].id;
    console.log('✅ Actual customer ID:', actualCustomerId);
    
    // Step 2: Test the exact query from getCustomerCards
    console.log('\n2. 🔍 TESTING EXACT getCustomerCards QUERY');
    console.log('===========================================');
    
    // Check if reward_tiers column exists
    const columnExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='loyalty_programs' AND column_name='reward_tiers'
      );
    `;
    console.log('reward_tiers column exists:', columnExists[0].exists);
    
    // Execute the exact query from getCustomerCards
    let result;
    const customerIdInt = parseInt(actualCustomerId.toString(), 10);
    const customerIdStr = actualCustomerId.toString();
    
    console.log('Query parameters:');
    console.log('  - customerIdInt:', customerIdInt, 'Type:', typeof customerIdInt);
    console.log('  - customerIdStr:', customerIdStr, 'Type:', typeof customerIdStr);
    
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
    
    if (result.length === 0) {
      console.log('\n❌ NO CARDS FOUND - This is the problem!');
      
      // Let's debug why the JOINs are failing
      console.log('\n3. 🔍 DEBUGGING JOIN FAILURES');
      console.log('===============================');
      
      // Check if the card exists at all
      const cardExists = await sql`
        SELECT * FROM loyalty_cards WHERE customer_id = ${actualCustomerId}
      `;
      console.log('Cards with customer_id =', actualCustomerId, ':', cardExists);
      
      if (cardExists.length > 0) {
        const card = cardExists[0];
        console.log('Card found:', card);
        
        // Check if loyalty_programs JOIN works
        const programExists = await sql`
          SELECT * FROM loyalty_programs WHERE id = ${card.program_id}
        `;
        console.log('Program exists:', programExists.length > 0);
        if (programExists.length > 0) {
          console.log('Program:', programExists[0]);
        }
        
        // Check if users JOIN works
        const businessExists = await sql`
          SELECT * FROM users WHERE id = ${card.business_id}
        `;
        console.log('Business exists:', businessExists.length > 0);
        if (businessExists.length > 0) {
          console.log('Business:', businessExists[0]);
        }
        
        // Test the JOIN step by step
        console.log('\n4. 🔍 TESTING JOINS STEP BY STEP');
        console.log('==================================');
        
        // Step 1: loyalty_cards JOIN loyalty_programs
        const step1 = await sql`
          SELECT lc.*, lp.name as program_name
          FROM loyalty_cards lc
          JOIN loyalty_programs lp ON lc.program_id = lp.id
          WHERE lc.customer_id = ${actualCustomerId}
        `;
        console.log('Step 1 (cards + programs):', step1.length);
        
        // Step 2: Add users JOIN
        const step2 = await sql`
          SELECT lc.*, lp.name as program_name, u.name as business_name
          FROM loyalty_cards lc
          JOIN loyalty_programs lp ON lc.program_id = lp.id
          JOIN users u ON lp.business_id = u.id
          WHERE lc.customer_id = ${actualCustomerId}
        `;
        console.log('Step 2 (cards + programs + users):', step2.length);
        
        if (step2.length > 0) {
          console.log('✅ All JOINs working, final result:', step2[0]);
        } else {
          console.log('❌ JOINs failing somewhere');
        }
      }
    } else {
      console.log('\n✅ CARDS FOUND - The query is working');
      console.log('First card:', result[0]);
      
      // Test the data transformation
      console.log('\n4. 🔍 TESTING DATA TRANSFORMATION');
      console.log('===================================');
      
      const card = result[0];
      const pointsValue = parseFloat(card.points) || 0;
      console.log('Points value:', pointsValue, 'Type:', typeof pointsValue);
      
      // Simulate the card mapping
      const mappedCard = {
        id: card.id.toString(),
        customerId: card.customer_id.toString(),
        businessId: card.business_id.toString(),
        programId: card.program_id.toString(),
        programName: card.program_name,
        cardNumber: card.card_number,
        points: pointsValue,
        tier: card.tier || 'STANDARD',
        status: card.status || 'ACTIVE',
        cardType: card.card_type || 'STANDARD',
        businessName: card.business_name,
        pointsMultiplier: parseFloat(card.points_multiplier) || 1,
        isActive: (card.status || 'ACTIVE') === 'ACTIVE'
      };
      
      console.log('Mapped card:', mappedCard);
    }
    
  } catch (error) {
    console.error('❌ Error in deep debug:', error);
  } finally {
    await sql.end();
  }
}

// Run the debug
debugFrontendDeep()
  .then(() => {
    console.log('\n🎉 Deep debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Deep debug failed:', error);
    process.exit(1);
  });