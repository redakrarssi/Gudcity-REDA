#!/usr/bin/env node
/**
 * Test script to verify the award points fix is working correctly
 * This script will test both the direct API and the patched original endpoint
 */

import fetch from 'node-fetch';
import readline from 'readline';

// Create readline interface for interactive testing
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const SERVER_URL = 'http://localhost:3000';
const TEST_CUSTOMER_ID = '4';  // Default test customer
const TEST_PROGRAM_ID = '9';   // Default test program

// Function to prompt for input
const prompt = (question) => new Promise((resolve) => {
  rl.question(question, (answer) => resolve(answer));
});

// Function to get a JWT token for authentication
async function getAuthToken() {
  console.log('🔐 Getting authentication token...');
  
  try {
    const response = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'business@example.com',
        password: 'password123'
      })
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Failed to authenticate:', response.status, text);
      return null;
    }
    
    const data = await response.json();
    const token = data.token;
    
    if (!token) {
      console.error('❌ No token in response:', data);
      return null;
    }
    
    console.log('✅ Authentication successful');
    return token;
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    return null;
  }
}

// Test the direct award points endpoint
async function testDirectAwardPoints(token, customerId, programId, points) {
  console.log(`\n🧪 TESTING DIRECT API: Awarding ${points} points to customer ${customerId} in program ${programId}`);
  
  try {
    const response = await fetch(`${SERVER_URL}/api/direct/direct-award-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customerId,
        programId,
        points,
        description: 'Test from direct API endpoint',
        source: 'TEST_SCRIPT'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Direct API test succeeded!');
      console.log('Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.error('❌ Direct API test failed!');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Direct API test error:', error.message);
    return false;
  }
}

// Test the original award points endpoint (which should now be fixed or redirected)
async function testOriginalAwardPoints(token, customerId, programId, points) {
  console.log(`\n🧪 TESTING ORIGINAL API: Awarding ${points} points to customer ${customerId} in program ${programId}`);
  
  try {
    const response = await fetch(`${SERVER_URL}/api/businesses/award-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customerId,
        programId,
        points,
        description: 'Test from original API endpoint',
        source: 'TEST_SCRIPT'
      })
    });
    
    // Try to parse the response as JSON
    let data;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text();
      console.error('❌ Invalid JSON response:', text);
      return false;
    }
    
    if (response.ok) {
      console.log('✅ Original API test succeeded!');
      console.log('Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.error('❌ Original API test failed!');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Original API test error:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting award points fix test script...');
  
  // Get authentication token
  const token = await getAuthToken();
  if (!token) {
    console.error('❌ Cannot proceed without authentication token');
    rl.close();
    return;
  }
  
  // Ask for test parameters
  const customerId = await prompt(`Enter customer ID [${TEST_CUSTOMER_ID}]: `) || TEST_CUSTOMER_ID;
  const programId = await prompt(`Enter program ID [${TEST_PROGRAM_ID}]: `) || TEST_PROGRAM_ID;
  const points = parseInt(await prompt('Enter points to award [10]: ') || '10');
  
  // Run the direct API test
  const directResult = await testDirectAwardPoints(token, customerId, programId, points);
  
  // Run the original API test
  const originalResult = await testOriginalAwardPoints(token, customerId, programId, points);
  
  // Show summary
  console.log('\n📊 TEST SUMMARY:');
  console.log(`Direct API Test: ${directResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Original API Test: ${originalResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (directResult && originalResult) {
    console.log('\n🎉 Both tests passed! The fix is working correctly!');
  } else if (directResult) {
    console.log('\n⚠️ Direct API works but original endpoint still has issues.');
    console.log('Check that the fix-405-error.js script is properly redirecting requests.');
  } else {
    console.log('\n❌ Tests failed. The award points system needs further fixes.');
  }
  
  rl.close();
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error:', error);
  rl.close();
  process.exit(1);
}); 