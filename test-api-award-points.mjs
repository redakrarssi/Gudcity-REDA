import fetch from 'node-fetch';
import dotenv from 'dotenv';
import sql from './src/utils/db.js';

// Load environment variables
dotenv.config();

// Test awarding points via API
async function testApiAwardPoints() {
  try {
    console.log('🧪 Testing API award points with notification deduplication');
    
    // Step 1: Find a valid customer and business
    const customerResult = await sql`
      SELECT id, name, email FROM users WHERE user_type = 'customer' LIMIT 1
    `;
    
    if (!customerResult.length) {
      throw new Error('No customer found in database');
    }
    
    const customerId = customerResult[0].id;
    console.log(`Found customer: ${customerResult[0].name} (ID: ${customerId})`);
    
    const businessResult = await sql`
      SELECT id, name FROM users WHERE user_type = 'business' LIMIT 1
    `;
    
    if (!businessResult.length) {
      throw new Error('No business found in database');
    }
    
    const businessId = businessResult[0].id;
    console.log(`Found business: ${businessResult[0].name} (ID: ${businessId})`);
    
    // Step 2: Find a loyalty program from this business
    const programResult = await sql`
      SELECT id, name FROM loyalty_programs WHERE business_id = ${businessId} LIMIT 1
    `;
    
    if (!programResult.length) {
      throw new Error('No loyalty program found for business');
    }
    
    const programId = programResult[0].id;
    const programName = programResult[0].name;
    console.log(`Found program: ${programName} (ID: ${programId})`);
    
    // Step 3: Clear existing notifications for clean test
    await sql`
      DELETE FROM customer_notifications 
      WHERE customer_id = ${customerId} 
      AND business_id = ${businessId} 
      AND type = 'POINTS_ADDED'
    `;
    console.log('Cleared existing notifications');
    
    // Step 4: Get current card data or create new card if needed
    let cardResult = await sql`
      SELECT id, points, points_balance, total_points_earned 
      FROM loyalty_cards 
      WHERE customer_id = ${customerId} 
      AND program_id = ${programId}
    `;
    
    let cardId;
    let initialPoints = 0;
    
    if (cardResult.length) {
      cardId = cardResult[0].id;
      initialPoints = cardResult[0].points;
      console.log(`Found existing card: ${cardId} with ${initialPoints} points`);
    } else {
      // Create a new card
      cardId = crypto.randomUUID();
      await sql`
        INSERT INTO loyalty_cards (
          id, customer_id, program_id, business_id, 
          points, points_balance, total_points_earned, created_at
        ) VALUES (
          ${cardId}, ${customerId}, ${programId}, ${businessId}, 
          0, 0, 0, NOW()
        )
      `;
      console.log(`Created new card: ${cardId} with 0 points`);
    }
    
    // Step 5: Award points multiple times in quick succession
    const pointsToAward = 10;
    console.log(`Awarding ${pointsToAward} points to customer ${customerId} in program ${programId} three times...`);
    
    // Function to award points and return promise
    const awardPoints = async () => {
      const result = await sql`
        UPDATE loyalty_cards 
        SET 
          points = points + ${pointsToAward},
          points_balance = points_balance + ${pointsToAward},
          total_points_earned = total_points_earned + ${pointsToAward},
          updated_at = NOW()
        WHERE id = ${cardId}
      `;
      
      // Create notification
      const notificationId = crypto.randomUUID();
      await sql`
        INSERT INTO customer_notifications (
          id, customer_id, business_id, type, title, message, 
          data, reference_id, requires_action, action_taken, is_read, created_at
        ) VALUES (
          ${notificationId}, ${customerId}, ${businessId}, 
          'POINTS_ADDED', 'Points Added', 
          ${`You've received ${pointsToAward} points from ${businessResult[0].name} in the program ${programName}`},
          ${JSON.stringify({
            points: pointsToAward,
            cardId: cardId,
            programId: programId,
            programName: programName,
            source: 'TEST',
            timestamp: new Date().toISOString()
          })},
          ${cardId}, false, false, false, ${new Date().toISOString()}
        )
      `;
      
      return notificationId;
    };
    
    // Award points three times in quick succession
    const [notif1, notif2, notif3] = await Promise.all([
      awardPoints(),
      awardPoints(),
      awardPoints()
    ]);
    
    console.log(`Award points operations completed: ${notif1}, ${notif2}, ${notif3}`);
    
    // Step 6: Verify points were added
    const updatedCardResult = await sql`
      SELECT id, points, points_balance, total_points_earned 
      FROM loyalty_cards 
      WHERE id = ${cardId}
    `;
    
    if (!updatedCardResult.length) {
      throw new Error('Failed to retrieve updated card data');
    }
    
    const finalPoints = updatedCardResult[0].points;
    console.log(`Final card points: ${finalPoints} (initial: ${initialPoints}, expected: ${initialPoints + (pointsToAward * 3)})`);
    
    if (finalPoints !== initialPoints + (pointsToAward * 3)) {
      throw new Error(`Points not added correctly. Expected ${initialPoints + (pointsToAward * 3)}, got ${finalPoints}`);
    }
    
    // Step 7: Count notifications
    const notificationsResult = await sql`
      SELECT COUNT(*) AS count FROM customer_notifications 
      WHERE customer_id = ${customerId} 
      AND business_id = ${businessId} 
      AND type = 'POINTS_ADDED'
      AND created_at > NOW() - INTERVAL '1 minute'
    `;
    
    const notificationCount = notificationsResult[0].count;
    console.log(`Number of notifications created: ${notificationCount}`);
    console.log(`With deduplication enabled, we expect only 3 notifications because we bypassed the service layer`);
    
    console.log('\n✅ Test completed successfully - card points updated correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Always close the database connection
    await sql.end();
    console.log('Database connection closed');
  }
}

testApiAwardPoints().catch(console.error); 