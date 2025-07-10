import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testBackendAwardPoints() {
  console.log('Testing backend award points API endpoint...');
  
  try {
    // Test parameters from the original error
    const customerId = '27';
    const programId = '11';
    const pointsToAward = 10;
    
    console.log(`Test parameters: Customer ID ${customerId}, Program ID ${programId}, Points ${pointsToAward}`);
    
    // Make API request to the backend server
    console.log('Sending API request to backend server...');
    const response = await fetch('http://localhost:3001/api/businesses/award-points', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerId,
        programId,
        points: pointsToAward,
        description: 'Points awarded via backend test script',
        source: 'BACKEND_TEST',
        transactionRef: `backend-test-${Date.now()}`
      })
    });
    
    const result = await response.json();
    
    console.log('\nBackend API Response:');
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('\n✅ Backend test completed successfully!');
      return {
        success: true,
        customerId,
        programId,
        pointsAwarded: pointsToAward,
        apiResponse: result
      };
    } else {
      console.error('\n❌ Backend API request failed!');
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
    console.error('\n❌ Backend test failed:', error.message);
    return {
      success: false,
      error: error.message,
      pointsAwarded: false
    };
  }
}

// Run the test
testBackendAwardPoints()
  .then(result => {
    console.log('\nDiagnostic Information:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });