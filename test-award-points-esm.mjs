// Simple test script for award points functionality (ESM version)
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

// Configure dotenv
config();

// Create require function
const require = createRequire(import.meta.url);

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamically import the LoyaltyCardService
async function runTest() {
  try {
    // Import the service
    const { LoyaltyCardService } = await import('./src/services/loyaltyCardService.js');
    
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
runTest(); 