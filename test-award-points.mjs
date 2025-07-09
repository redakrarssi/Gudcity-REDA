// Test script for the award points functionality
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create database connection
const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 10
});

async function testAwardPoints() {
  console.log('Starting points awarding test...');
  
  // Test parameters
  const customerId = '27';
  const businessId = 3;
  const programId = '11';
  const pointsToAward = 103;
  
  try {
    console.log(`Test parameters: Customer ID ${customerId}, Business ID ${businessId}, Program ID ${programId}, Points ${pointsToAward}`);
    
    // Step 1: Verify the customer exists
    console.log('\n1. Verifying customer exists...');
    const customerCheck = await sql`
      SELECT id, name, email FROM users 
      WHERE id = ${customerId} AND user_type = 'customer'
    `;
    
    if (!customerCheck.length) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }
    
    console.log(`✅ Customer found: ${customerCheck[0].name} (${customerCheck[0].email})`);
    
    // Step 2: Verify the business exists
    console.log('\n2. Verifying business exists...');
    const businessCheck = await sql`
      SELECT id, name FROM users 
      WHERE id = ${businessId} AND user_type = 'business'
    `;
    
    if (!businessCheck.length) {
      throw new Error(`Business with ID ${businessId} not found`);
    }
    
    console.log(`✅ Business found: ${businessCheck[0].name}`);
    
    // Step 3: Verify the program exists and belongs to the business
    console.log('\n3. Verifying program exists and belongs to the business...');
    const programCheck = await sql`
      SELECT id, name, business_id FROM loyalty_programs 
      WHERE id = ${programId}
    `;
    
    if (!programCheck.length) {
      throw new Error(`Program with ID ${programId} not found`);
    }
    
    if (programCheck[0].business_id != businessId) {
      throw new Error(`Program ${programId} does not belong to business ${businessId}`);
    }
    
    console.log(`✅ Program found: ${programCheck[0].name}`);
    
    // Step 4: Check enrollment status
    console.log('\n4. Checking enrollment status...');
    const enrollmentCheck = await sql`
      SELECT * FROM program_enrollments 
      WHERE customer_id = ${customerId} 
      AND program_id = ${programId}
    `;
    
    if (!enrollmentCheck.length) {
      console.log(`⚠️ Customer is not enrolled in program. Creating enrollment...`);
      
      // Create enrollment
      await sql`
        INSERT INTO program_enrollments (
          customer_id, program_id, status, current_points, created_at, updated_at
        ) VALUES (
          ${customerId}, ${programId}, 'ACTIVE', 0, NOW(), NOW()
        )
      `;
      
      console.log(`✅ Enrollment created successfully`);
    } else {
      console.log(`✅ Customer is already enrolled in program with ${enrollmentCheck[0].current_points} points`);
    }
    
    // Step 5: Check if loyalty card exists
    console.log('\n5. Checking if loyalty card exists...');
    const cardCheck = await sql`
      SELECT * FROM loyalty_cards 
      WHERE customer_id = ${customerId} 
      AND program_id = ${programId}
    `;
    
    let cardId;
    
    if (!cardCheck.length) {
      console.log(`⚠️ Loyalty card not found. Creating card...`);
      
      // Create card
      const cardResult = await sql`
        INSERT INTO loyalty_cards (
          customer_id, program_id, business_id, points, points_balance, card_number, 
          tier, status, created_at, updated_at
        ) VALUES (
          ${customerId}, ${programId}, ${businessId}, 0, 0, 
          ${'GC-' + Math.floor(100000 + Math.random() * 900000) + '-C'}, 
          'STANDARD', 'ACTIVE', NOW(), NOW()
        ) RETURNING id
      `;
      
      cardId = cardResult[0].id;
      console.log(`✅ Card created with ID: ${cardId}`);
    } else {
      cardId = cardCheck[0].id;
      console.log(`✅ Card found with ID: ${cardId}, current points: ${cardCheck[0].points}`);
    }
    
    // Step 6: Award points
    console.log('\n6. Awarding points...');
    
    // Get current points
    const currentPoints = cardCheck.length ? parseInt(cardCheck[0].points) || 0 : 0;
    const newPoints = currentPoints + pointsToAward;
    
    // Start a transaction
    await sql`BEGIN`;
    
    try {
      // Update card points
      await sql`
        UPDATE loyalty_cards 
        SET points = ${newPoints}, 
            points_balance = ${newPoints}, 
            updated_at = NOW() 
        WHERE id = ${cardId}
      `;
      
      // Update enrollment points
      await sql`
        UPDATE program_enrollments 
        SET current_points = ${newPoints}, 
            updated_at = NOW() 
        WHERE customer_id = ${customerId} 
        AND program_id = ${programId}
      `;
      
      // Record transaction
      await sql`
        INSERT INTO loyalty_transactions (
          customer_id, business_id, program_id, card_id, type, points, 
          description, source, transaction_date
        ) VALUES (
          ${customerId}, ${businessId}, ${programId}, ${cardId}, 'EARN', 
          ${pointsToAward}, 'Points awarded via test script', 'TEST', NOW()
        )
      `;
      
      // Create notification
      await sql`
        INSERT INTO customer_notifications (
          customer_id, business_id, type, title, message, requires_action, 
          is_read, created_at
        ) VALUES (
          ${customerId}, ${businessId}, 'POINTS_EARNED', 'Points Earned', 
          ${`You earned ${pointsToAward} points from ${businessCheck[0].name}`}, 
          FALSE, FALSE, NOW()
        )
      `;
      
      // Commit the transaction
      await sql`COMMIT`;
      
      console.log(`✅ Successfully awarded ${pointsToAward} points to customer`);
      console.log(`✅ New balance: ${newPoints} points`);
      
    } catch (error) {
      // Rollback on error
      await sql`ROLLBACK`;
      throw error;
    }
    
    // Step 7: Verify the points were awarded
    console.log('\n7. Verifying points were awarded...');
    const verifyCard = await sql`
      SELECT * FROM loyalty_cards 
      WHERE id = ${cardId}
    `;
    
    if (!verifyCard.length) {
      throw new Error('Card not found after awarding points');
    }
    
    const updatedPoints = parseInt(verifyCard[0].points) || 0;
    
    if (updatedPoints !== newPoints) {
      throw new Error(`Points verification failed. Expected ${newPoints}, got ${updatedPoints}`);
    }
    
    console.log(`✅ Points verification successful. Card has ${updatedPoints} points`);
    
    // Step 8: Check if notification was created
    console.log('\n8. Checking for notification...');
    const notificationCheck = await sql`
      SELECT * FROM customer_notifications 
      WHERE customer_id = ${customerId} 
      AND type = 'POINTS_EARNED' 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    if (!notificationCheck.length) {
      console.log(`⚠️ No notification found`);
    } else {
      console.log(`✅ Notification created: "${notificationCheck[0].message}"`);
    }
    
    console.log('\nTest completed successfully! ✅');
    
    // Return diagnostic information
    return {
      success: true,
      customerId,
      businessId,
      programId,
      pointsAwarded: pointsToAward,
      newBalance: updatedPoints,
      cardId,
      message: 'Points awarded successfully'
    };
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Return error information
    return {
      success: false,
      error: error.message,
      customerId,
      businessId,
      programId,
      pointsAwarded: false
    };
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the test
testAwardPoints()
  .then(result => {
    console.log('\nDiagnostic Information:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 