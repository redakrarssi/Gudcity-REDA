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

async function testSyncEnrollments() {
  try {
    console.log('🧪 Testing syncEnrollmentsToCards method...');
    
    const userId = '29'; // What the frontend sends
    console.log('Testing with user ID:', userId);
    
    // Step 1: Check what the method should do
    console.log('\n1. 🔍 WHAT THE METHOD SHOULD DO');
    console.log('================================');
    
    // Find all active program enrollments without corresponding cards
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
      WHERE pe.customer_id = (SELECT id FROM customers WHERE user_id = ${userId})
      AND pe.status = 'ACTIVE'
      AND lc.id IS NULL
    `;
    
    console.log('Missing card enrollments:', missingCardEnrollments);
    console.log('Number of enrollments without cards:', missingCardEnrollments.length);
    
    // Step 2: Check what enrollments exist for this user
    console.log('\n2. 🔍 CHECKING EXISTING ENROLLMENTS');
    console.log('====================================');
    
    const customerResult = await sql`SELECT id FROM customers WHERE user_id = ${userId}`;
    if (customerResult.length === 0) {
      console.log('❌ No customer record found');
      return;
    }
    
    const actualCustomerId = customerResult[0].id;
    console.log('Actual customer ID:', actualCustomerId);
    
    const existingEnrollments = await sql`
      SELECT * FROM program_enrollments 
      WHERE customer_id = ${actualCustomerId}
      AND status = 'ACTIVE'
    `;
    console.log('Existing enrollments:', existingEnrollments);
    
    // Step 3: Check what cards exist for this customer
    console.log('\n3. 🔍 CHECKING EXISTING CARDS');
    console.log('==============================');
    
    const existingCards = await sql`
      SELECT * FROM loyalty_cards
      WHERE customer_id = ${actualCustomerId}
    `;
    console.log('Existing cards:', existingCards);
    
    // Step 4: Check the relationship between enrollments and cards
    console.log('\n4. 🔍 ENROLLMENT-CARD RELATIONSHIP');
    console.log('====================================');
    
    const enrollmentCardMap = await sql`
      SELECT 
        pe.id as enrollment_id,
        pe.program_id,
        pe.status as enrollment_status,
        lc.id as card_id,
        lc.status as card_status
      FROM program_enrollments pe
      LEFT JOIN loyalty_cards lc ON 
        pe.customer_id = lc.customer_id AND 
        pe.program_id = lc.program_id
      WHERE pe.customer_id = ${actualCustomerId}
      ORDER BY pe.program_id
    `;
    
    console.log('Enrollment-Card mapping:');
    enrollmentCardMap.forEach(item => {
      console.log(`  Program ${item.program_id}: Enrollment ${item.enrollment_id} (${item.enrollment_status}) -> Card ${item.card_id || 'MISSING'} (${item.card_status || 'N/A'})`);
    });
    
    // Step 5: Summary
    console.log('\n5. 📋 SUMMARY');
    console.log('==============');
    console.log('User ID:', userId);
    console.log('Customer ID:', actualCustomerId);
    console.log('Enrollments:', existingEnrollments.length);
    console.log('Cards:', existingCards.length);
    console.log('Missing cards:', missingCardEnrollments.length);
    
    if (existingEnrollments.length > existingCards.length) {
      console.log('❌ PROBLEM: More enrollments than cards - sync should create missing cards');
    } else if (existingEnrollments.length === existingCards.length) {
      console.log('✅ GOOD: All enrollments have corresponding cards');
    } else {
      console.log('⚠️ UNEXPECTED: More cards than enrollments');
    }
    
  } catch (error) {
    console.error('❌ Error testing sync enrollments:', error);
  } finally {
    await sql.end();
  }
}

// Run the test
testSyncEnrollments()
  .then(() => {
    console.log('\n🎉 Sync enrollments test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Sync enrollments test failed:', error);
    process.exit(1);
  });