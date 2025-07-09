import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testApiAwardPoints() {
  console.log('Testing award points API endpoint...');
  
  try {
    // Test parameters
    const customerId = '27';
    const programId = '11';
    const pointsToAward = 103;
    const token = process.env.TEST_AUTH_TOKEN || 'your-auth-token-here'; // Replace with a valid token
    
    console.log(`Test parameters: Customer ID ${customerId}, Program ID ${programId}, Points ${pointsToAward}`);
    
    // Make API request
    console.log('Sending API request...');
    const response = await fetch('http://localhost:3000/api/businesses/award-points', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customerId,
        programId,
        points: pointsToAward,
        description: 'Points awarded via test script',
        source: 'TEST',
        transactionRef: `test-${Date.now()}`
      })
    });
    
    const result = await response.json();
    
    console.log('\nAPI Response:');
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('\n✅ Test completed successfully!');
      return {
        success: true,
        customerId,
        programId,
        pointsAwarded: pointsToAward,
        apiResponse: result
      };
    } else {
      console.error('\n❌ API request failed!');
      return {
        success: false,
        error: result.error || 'Unknown error',
        customerId,
        programId,
        pointsAwarded: false,
        apiResponse: result
      };
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return {
      success: false,
      error: error.message,
      pointsAwarded: false
    };
  }
}

// Run the test
testApiAwardPoints()
  .then(result => {
    console.log('\nDiagnostic Information:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 