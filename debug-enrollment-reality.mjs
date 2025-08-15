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

async function debugEnrollmentReality() {
  try {
    console.log('🔍 Debugging enrollment reality - checking what actually happens in database...');
    
    const customerId = 29; // User ID
    const programId = 11;
    
    // 1. Check initial state
    console.log('\n1. 📊 INITIAL STATE CHECK');
    console.log('========================');
    
    // Check customer record
    const customerResult = await sql`SELECT id FROM customers WHERE user_id = ${customerId}`;
    console.log('Customer record:', customerResult);
    
    if (customerResult.length === 0) {
      console.log('❌ No customer record found for user ID:', customerId);
      return;
    }
    
    const actualCustomerId = customerResult[0].id;
    console.log('✅ Actual customer ID:', actualCustomerId);
    
    // Check existing enrollment
    const existingEnrollment = await sql`
      SELECT * FROM program_enrollments 
      WHERE customer_id = ${actualCustomerId} 
      AND program_id = ${programId}
    `;
    console.log('Existing enrollment:', existingEnrollment);
    
    // Check existing card
    const existingCard = await sql`
      SELECT * FROM loyalty_cards
      WHERE customer_id = ${actualCustomerId}
      AND program_id = ${programId}
    `;
    console.log('Existing card:', existingCard);
    
    // 2. Simulate the enrollment process step by step
    console.log('\n2. 🔄 SIMULATING ENROLLMENT PROCESS');
    console.log('===================================');
    
    // Step 1: Check if enrollment exists
    const enrollmentExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM program_enrollments 
        WHERE customer_id = ${actualCustomerId} 
        AND program_id = ${programId}
      )
    `;
    console.log('Step 1 - Enrollment exists check:', enrollmentExists[0].exists);
    
    let enrollmentId = null;
    
    if (enrollmentExists[0].exists) {
      console.log('✅ Enrollment exists, updating status...');
      
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
        enrollmentId = updateResult[0].id;
        console.log('✅ Enrollment updated, ID:', enrollmentId);
      } else {
        // Get existing enrollment ID
        const existingId = await sql`
          SELECT id FROM program_enrollments 
          WHERE customer_id = ${actualCustomerId} 
          AND program_id = ${programId}
        `;
        enrollmentId = existingId[0].id;
        console.log('ℹ️ No update needed, using existing ID:', enrollmentId);
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
        enrollmentId = insertResult[0].id;
        console.log('✅ New enrollment created, ID:', enrollmentId);
      }
    }
    
    // Step 2: Check if card exists
    console.log('\nStep 2 - Card creation check...');
    const cardExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM loyalty_cards
        WHERE customer_id = ${actualCustomerId}
        AND program_id = ${programId}
      )
    `;
    console.log('Card exists:', cardExists[0].exists);
    
    let cardId = null;
    
    if (!cardExists[0].exists) {
      console.log('❌ No card found, creating new one...');
      
      // Generate card number
      const cardNumber = 'GC-' + new Date().toISOString().slice(2,10).replace(/-/g,'') + '-' + 
                        new Date().toISOString().slice(11,17).replace(/:/g,'') + '-' + 
                        Math.floor(Math.random() * 10000);
      
      console.log('Generated card number:', cardNumber);
      
      // Create the card
      const cardInsertResult = await sql`
        INSERT INTO loyalty_cards (
          customer_id,
          program_id,
          business_id,
          card_number,
          card_type,
          status,
          points,
          tier,
          points_multiplier,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          ${actualCustomerId},
          ${programId},
          3, -- business_id from the test data
          ${cardNumber},
          'STANDARD',
          'ACTIVE',
          0,
          'STANDARD',
          1.0,
          true,
          NOW(),
          NOW()
        ) RETURNING id
      `;
      console.log('Card insert result:', cardInsertResult);
      
      if (cardInsertResult.length > 0) {
        cardId = cardInsertResult[0].id;
        console.log('✅ New card created, ID:', cardId);
      }
    } else {
      console.log('✅ Card already exists, getting ID...');
      const existingCardId = await sql`
        SELECT id FROM loyalty_cards
        WHERE customer_id = ${actualCustomerId}
        AND program_id = ${programId}
        LIMIT 1
      `;
      cardId = existingCardId[0].id;
      console.log('Existing card ID:', cardId);
    }
    
    // 3. Final verification
    console.log('\n3. ✅ FINAL VERIFICATION');
    console.log('========================');
    
    // Check final enrollment state
    const finalEnrollment = await sql`
      SELECT * FROM program_enrollments 
      WHERE customer_id = ${actualCustomerId} 
      AND program_id = ${programId}
    `;
    console.log('Final enrollment state:', finalEnrollment);
    
    // Check final card state
    const finalCard = await sql`
      SELECT * FROM loyalty_cards
      WHERE customer_id = ${actualCustomerId}
      AND program_id = ${programId}
    `;
    console.log('Final card state:', finalCard);
    
    // 4. Summary
    console.log('\n4. 📋 SUMMARY');
    console.log('==============');
    console.log('Enrollment ID:', enrollmentId);
    console.log('Card ID:', cardId);
    console.log('Enrollment exists:', finalEnrollment.length > 0);
    console.log('Card exists:', finalCard.length > 0);
    
    if (finalEnrollment.length > 0 && finalCard.length > 0) {
      console.log('🎉 SUCCESS: Both enrollment and card exist in database!');
    } else {
      console.log('❌ FAILURE: Missing enrollment or card in database!');
    }
    
  } catch (error) {
    console.error('❌ Error debugging enrollment reality:', error);
  } finally {
    await sql.end();
  }
}

// Run the debug
debugEnrollmentReality()
  .then(() => {
    console.log('\n🎉 Debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Debug failed:', error);
    process.exit(1);
  });