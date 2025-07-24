/**
 * Test script to award points to a user and verify the update works
 * This script directly calls the handlePointsAwarded function from notificationHandler.ts
 * 
 * To run: 
 * node test-instant-points.mjs <customerId> <businessId> <programId>
 */

// Import required modules
import { handlePointsAwarded } from './src/utils/notificationHandler.js';
import sql from './src/utils/db.js';

// Get customer, business, and program IDs from command line arguments or use defaults
const customerId = process.argv[2] || '1';
const businessId = process.argv[3] || '2';  
const programId = process.argv[4] || '1';

// Set the number of points to award
const pointsToAward = 10;

async function main() {
  try {
    console.log('🧪 Testing instant points update');
    console.log(`Customer ID: ${customerId}`);
    console.log(`Business ID: ${businessId}`);
    console.log(`Program ID: ${programId}`);
    console.log(`Points to award: ${pointsToAward}`);
    
    // Get business and program names
    const business = await sql`SELECT name FROM users WHERE id = ${businessId}`;
    const businessName = business.length > 0 ? business[0].name : 'Business';
    
    const program = await sql`SELECT name FROM loyalty_programs WHERE id = ${programId}`;
    const programName = program.length > 0 ? program[0].name : 'Loyalty Program';
    
    console.log(`Business name: ${businessName}`);
    console.log(`Program name: ${programName}`);
    
    // Get current card info
    const existingCard = await sql`
      SELECT id, points FROM loyalty_cards 
      WHERE customer_id = ${customerId}
      AND program_id = ${programId}
      AND business_id = ${businessId}
    `;
    
    const cardId = existingCard.length > 0 ? existingCard[0].id : null;
    const currentPoints = existingCard.length > 0 ? parseFloat(existingCard[0].points || '0') : 0;
    
    console.log(`Existing card: ${cardId ? `ID ${cardId} with ${currentPoints} points` : 'None found'}`);
    
    // Award points
    console.log(`\nAwarding ${pointsToAward} points...`);
    
    const result = await handlePointsAwarded(
      customerId.toString(),
      businessId.toString(),
      programId.toString(),
      programName,
      businessName,
      pointsToAward,
      cardId ? cardId.toString() : '',
      'TEST_SCRIPT'
    );
    
    console.log(`Points awarded result: ${result ? 'Success' : 'Failed'}`);
    
    // Verify points update in database
    const updatedCard = await sql`
      SELECT id, points FROM loyalty_cards 
      WHERE customer_id = ${customerId}
      AND program_id = ${programId}
      AND business_id = ${businessId}
    `;
    
    if (updatedCard.length === 0) {
      console.log('❌ No card found after update!');
      process.exit(1);
    }
    
    const newCardId = updatedCard[0].id;
    const newPoints = parseFloat(updatedCard[0].points || '0');
    const expectedPoints = currentPoints + pointsToAward;
    
    console.log(`\nVerification:`);
    console.log(`Card ID: ${newCardId}`);
    console.log(`Previous points: ${currentPoints}`);
    console.log(`Points awarded: ${pointsToAward}`);
    console.log(`Expected new total: ${expectedPoints}`);
    console.log(`Actual new total: ${newPoints}`);
    
    if (Math.abs(newPoints - expectedPoints) < 0.01) {
      console.log('\n✅ SUCCESS: Points updated correctly in database!');
      
      // Verify notification was created
      const notification = await sql`
        SELECT id FROM customer_notifications
        WHERE customer_id = ${customerId}
        AND type = 'POINTS_ADDED'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      if (notification.length > 0) {
        console.log(`✅ Notification created with ID: ${notification[0].id}`);
      } else {
        console.log('⚠️ No notification found in database');
      }
    } else {
      console.log('\n❌ FAIL: Points not updated correctly!');
    }
    
    // Exit script
    process.exit(0);
  } catch (error) {
    console.error('Error running test:', error);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error); 