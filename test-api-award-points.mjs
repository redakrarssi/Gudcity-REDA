// Test script for award points API endpoint
import { config } from 'dotenv';

// Load environment variables
config();

// Test function
async function testAwardPointsApi() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const customerId = args[0] || '4'; // Default to customer ID 4
    const programId = args[1] || '12'; // Default to program ID 12
    const points = parseInt(args[2] || '100'); // Default to 100 points
    const token = process.env.TEST_TOKEN; // Get token from environment
    
    if (!token) {
      console.error('Error: TEST_TOKEN environment variable not set');
      console.log('Please set TEST_TOKEN in your .env file');
      process.exit(1);
    }
    
    console.log(`Testing award points API for customer ${customerId}, program ${programId} with ${points} points...`);
    
    // Call the API
    const response = await fetch('http://localhost:3000/api/businesses/award-points', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customerId,
        programId,
        points,
        description: 'Test API award points',
        source: 'TEST'
      })
    });
    
    // Parse response
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log(`✅ Successfully awarded ${points} points to customer ${customerId}`);
    } else {
      console.log(`❌ Failed to award points: ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testAwardPointsApi(); 