// Simple test script for award points functionality
require('dotenv').config();

// Import the LoyaltyCardService
const { LoyaltyCardService } = require('./src/services/loyaltyCardService');

// Main test function
async function testAwardPoints() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const cardId = args[0] || '17'; // Default to card ID 17
    const points = parseInt(args[1] || '100'); // Default to 100 points
    
    console.log(`Testing award points for card ID ${cardId} with ${points} points...`);
    
    // Award points
    const result = await LoyaltyCardService.awardPointsToCard(
      cardId,
      points,
      'TEST',
      'Test award points script',
      `test-${Date.now()}`,
      ''
    );
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`✅ Successfully awarded ${points} points to card ${cardId}`);
    } else {
      console.log(`❌ Failed to award points: ${result.error}`);
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testAwardPoints(); 