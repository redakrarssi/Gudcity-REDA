// Simple test for award points system
const fetch = require('node-fetch');
require('dotenv').config();

// Test configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const TEST_TOKEN = process.env.TEST_TOKEN; // Set this in your .env file

// Customer and program IDs to test
// Update these values to match your actual data
const TEST_CUSTOMER_ID = '4'; // Example customer ID
const TEST_PROGRAM_ID = '1'; // Example program ID
const TEST_POINTS = 5; // Points to award

async function testAwardPoints() {
  if (!TEST_TOKEN) {
    console.error('❌ TEST_TOKEN not set in environment. Please add it to .env file.');
    process.exit(1);
  }
  
  console.log('🧪 Testing award points API...');
  console.log(`Customer ID: ${TEST_CUSTOMER_ID}`);
  console.log(`Program ID: ${TEST_PROGRAM_ID}`);
  console.log(`Points: ${TEST_POINTS}`);
  
  try {
    // Make the API request
    const response = await fetch(`${API_URL}/businesses/award-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify({
        customerId: TEST_CUSTOMER_ID,
        programId: TEST_PROGRAM_ID,
        points: TEST_POINTS,
        description: 'Test points from award-points-test',
        source: 'TEST'
      })
    });
    
    const responseBody = await response.json();
    
    console.log('\n----- API Response -----');
    console.log('Status:', response.status);
    console.log('Success:', responseBody.success);
    console.log('Message:', responseBody.message || responseBody.error);
    
    if (responseBody.success) {
      console.log('\n✅ Test succeeded! Points were awarded.');
      
      // Check if notification was sent
      if (responseBody.data?.notificationSent) {
        console.log('✅ Notification was sent to customer.');
      } else if (responseBody.data?.directNotificationCreated) {
        console.log('✅ Direct notification was created as fallback.');
      } else if (responseBody.data?.notificationError) {
        console.log('⚠️ Notification failed, but points were awarded.');
        console.log('Error:', responseBody.data.notificationError);
      }
      
      // Display additional diagnostics
      if (responseBody.data?.diagnostics) {
        console.log('\n----- Diagnostics -----');
        console.log(JSON.stringify(responseBody.data.diagnostics, null, 2));
      }
    } else {
      console.log('\n❌ Test failed!');
      console.log('Error:', responseBody.error);
      
      if (responseBody.diagnostics) {
        console.log('\n----- Diagnostics -----');
        console.log(JSON.stringify(responseBody.diagnostics, null, 2));
      }
      
      // Print error code if available
      if (responseBody.code) {
        console.log('Error code:', responseBody.code);
      }
      
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test failed with exception:', error.message);
    process.exit(1);
  }
}

// Run the test
testAwardPoints(); 