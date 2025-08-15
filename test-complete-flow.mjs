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

async function testCompleteFlow() {
  try {
    console.log('🧪 Testing complete enrollment and card display flow...');
    
    const userId = '29'; // What the frontend sends
    console.log('Testing with user ID:', userId);
    
    // Step 1: Simulate the frontend logic step by step
    console.log('\n1. 🔄 SIMULATING FRONTEND LOGIC');
    console.log('==================================');
    
    // Get customer record (what the frontend now does)
    const customerResult = await sql`SELECT id FROM customers WHERE user_id = ${userId}`;
    console.log('Customer lookup result:', customerResult);
    
    if (customerResult.length === 0) {
      console.log('❌ No customer record found');
      return;
    }
    
    const actualCustomerId = customerResult[0].id;
    console.log('✅ Actual customer ID:', actualCustomerId);
    
    // Step 2: Test syncEnrollments (what the frontend calls first)
    console.log('\n2. 🔄 TESTING syncEnrollments');
    console.log('================================');
    
    // Simulate the syncEnrollments logic
    const missingCardEnrollments = await sql`
      SELECT 
        pe.id as enrollment_id,
        pe.customer_id,
        pe.program_id,
        lp.business_id,
        lp.name as program_name,
        u.name as business_name,
        COALESCE(pe.current_points, 0) as current_points
      FROM program_enrollments pe
      JOIN loyalty_programs lp ON pe.program_id = lp.id
      JOIN users u ON lp.business_id = u.id
      LEFT JOIN loyalty_cards lc ON 
        pe.customer_id = lc.customer_id AND 
        pe.program_id = lc.program_id
      WHERE pe.customer_id = ${actualCustomerId}
      AND pe.status = 'ACTIVE'
      AND lc.id IS NULL
    `;
    
    console.log('Missing card enrollments found:', missingCardEnrollments.length);
    if (missingCardEnrollments.length > 0) {
      console.log('Enrollments without cards:', missingCardEnrollments);
    } else {
      console.log('✅ All enrollments have corresponding cards');
    }
    
    // Step 3: Test getCustomerCards (what the frontend calls second)
    console.log('\n3. 🔍 TESTING getCustomerCards');
    console.log('================================');
    
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
    
    if (result.length > 0) {
      console.log('\n4. 📊 CARD DATA ANALYSIS');
      console.log('==========================');
      
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
        console.log('  - Is Active:', card.is_active);
      });
      
      // Step 5: Test data transformation (what the frontend does)
      console.log('\n5. 🔄 TESTING DATA TRANSFORMATION');
      console.log('===================================');
      
      const transformedCards = result.map(card => {
        const pointsValue = parseFloat(card.points) || 0;
        
        return {
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
      });
      
      console.log('Transformed cards:', transformedCards);
      
      // Step 6: Final verification
      console.log('\n6. ✅ FINAL VERIFICATION');
      console.log('=========================');
      console.log('Original data count:', result.length);
      console.log('Transformed data count:', transformedCards.length);
      console.log('Cards with valid IDs:', transformedCards.filter(c => c.id && c.id !== 'undefined').length);
      console.log('Cards with valid program names:', transformedCards.filter(c => c.programName).length);
      console.log('Cards with valid business names:', transformedCards.filter(c => c.businessName).length);
      
      if (transformedCards.length > 0) {
        console.log('🎉 SUCCESS: Cards are ready for frontend display!');
        console.log('The frontend should now show these cards in the dashboard.');
      } else {
        console.log('❌ FAILURE: No cards transformed for frontend');
      }
      
    } else {
      console.log('\n❌ NO CARDS FOUND - This explains why the frontend shows nothing');
      
      // Debug why no cards are found
      console.log('\n7. 🔍 DEBUGGING WHY NO CARDS FOUND');
      console.log('=====================================');
      
      // Check if the card exists at all
      const cardExists = await sql`
        SELECT * FROM loyalty_cards WHERE customer_id = ${actualCustomerId}
      `;
      console.log('Cards with customer_id =', actualCustomerId, ':', cardExists.length);
      
      if (cardExists.length > 0) {
        console.log('Card exists but JOINs are failing');
        const card = cardExists[0];
        
        // Check each JOIN step
        const programExists = await sql`
          SELECT * FROM loyalty_programs WHERE id = ${card.program_id}
        `;
        console.log('Program exists:', programExists.length > 0);
        
        const businessExists = await sql`
          SELECT * FROM users WHERE id = ${card.business_id}
        `;
        console.log('Business exists:', businessExists.length > 0);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in complete flow test:', error);
  } finally {
    await sql.end();
  }
}

// Run the test
testCompleteFlow()
  .then(() => {
    console.log('\n🎉 Complete flow test finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Complete flow test failed:', error);
    process.exit(1);
  });