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

async function debugEnrollment() {
  try {
    console.log('🔍 Debugging enrollment logic...');
    
    const customerId = 29; // User ID
    const programId = 11;
    
    // 1. Check if customer record exists
    console.log('\n1. Checking customer record...');
    const customerResult = await sql`SELECT id FROM customers WHERE user_id = ${customerId}`;
    console.log('Customer record:', customerResult);
    
    if (customerResult.length === 0) {
      console.log('❌ No customer record found for user ID:', customerId);
      return;
    }
    
    const actualCustomerId = customerResult[0].id;
    console.log('✅ Actual customer ID:', actualCustomerId);
    
    // 2. Check if enrollment exists
    console.log('\n2. Checking existing enrollment...');
    const enrollmentResult = await sql`
      SELECT * FROM program_enrollments 
      WHERE customer_id = ${actualCustomerId} 
      AND program_id = ${programId}
    `;
    console.log('Enrollment result:', enrollmentResult);
    
    // 3. Check if card exists
    console.log('\n3. Checking existing card...');
    const cardResult = await sql`
      SELECT * FROM loyalty_cards
      WHERE customer_id = ${actualCustomerId}
      AND program_id = ${programId}
    `;
    console.log('Card result:', cardResult);
    
    // 4. Test the enrollment creation logic
    console.log('\n4. Testing enrollment creation logic...');
    
    // Check if already enrolled
    const enrollmentExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM program_enrollments 
        WHERE customer_id = ${actualCustomerId} 
        AND program_id = ${programId}
      )
    `;
    console.log('Enrollment exists:', enrollmentExists[0].exists);
    
    if (enrollmentExists[0].exists) {
      console.log('✅ Enrollment already exists, updating status...');
      
      // Update existing enrollment
      const updateResult = await sql`
        UPDATE program_enrollments
        SET status = 'ACTIVE'
        WHERE customer_id = ${actualCustomerId} 
        AND program_id = ${programId} 
        AND status != 'ACTIVE'
        RETURNING id
      `;
      console.log('Update result:', updateResult);
      
      if (updateResult.length > 0) {
        console.log('✅ Enrollment updated successfully, ID:', updateResult[0].id);
      } else {
        console.log('ℹ️ No update needed, enrollment already active');
      }
    } else {
      console.log('❌ No enrollment found, creating new one...');
      
      // Create new enrollment
      const insertResult = await sql`
        INSERT INTO program_enrollments (
          customer_id,
          program_id,
          current_points,
          last_activity,
          enrolled_at,
          status
        ) VALUES (
          ${actualCustomerId},
          ${programId},
          0,
          NOW(),
          NOW(),
          'ACTIVE'
        ) RETURNING id
      `;
      console.log('Insert result:', insertResult);
      
      if (insertResult.length > 0) {
        console.log('✅ New enrollment created, ID:', insertResult[0].id);
      }
    }
    
    // 5. Final check
    console.log('\n5. Final enrollment check...');
    const finalEnrollment = await sql`
      SELECT * FROM program_enrollments 
      WHERE customer_id = ${actualCustomerId} 
      AND program_id = ${programId}
    `;
    console.log('Final enrollment:', finalEnrollment);
    
  } catch (error) {
    console.error('❌ Error debugging enrollment:', error);
  } finally {
    await sql.end();
  }
}

// Run the debug
debugEnrollment()
  .then(() => {
    console.log('\n🎉 Debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Debug failed:', error);
    process.exit(1);
  });