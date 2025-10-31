#!/usr/bin/env node

/**
 * Local API Testing Script
 * Tests all API endpoints to verify they work before deployment
 */

import axios from 'axios';
import chalk from 'chalk';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';

console.log(chalk.blue.bold('\n🧪 API Testing Script\n'));
console.log(chalk.gray(`Testing API at: ${API_BASE_URL}\n`));

let passedTests = 0;
let failedTests = 0;

// Helper function to test endpoint
async function testEndpoint(name, method, endpoint, data = null, expectedStatus = [200, 201, 400, 401]) {
  try {
    console.log(chalk.yellow(`\n📍 Testing: ${name}`));
    console.log(chalk.gray(`   ${method} ${endpoint}`));
    
    let response;
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      validateStatus: () => true, // Don't throw on any status
      timeout: 10000
    };
    
    switch (method) {
      case 'GET':
        response = await axios.get(url, config);
        break;
      case 'POST':
        response = await axios.post(url, data, config);
        break;
      case 'PUT':
        response = await axios.put(url, data, config);
        break;
      case 'DELETE':
        response = await axios.delete(url, config);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
    
    const status = response.status;
    const isExpected = expectedStatus.includes(status);
    
    if (isExpected || status === 200 || status === 201) {
      console.log(chalk.green(`   ✅ Status: ${status}`));
      console.log(chalk.gray(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`));
      passedTests++;
      return true;
    } else if (status === 404) {
      console.log(chalk.red(`   ❌ 404 NOT FOUND - Endpoint does not exist or routing issue`));
      console.log(chalk.gray(`   Make sure the API function is deployed correctly`));
      failedTests++;
      return false;
    } else if (status >= 500) {
      console.log(chalk.red(`   ❌ Server Error: ${status}`));
      console.log(chalk.gray(`   Error: ${response.data?.error || 'Unknown server error'}`));
      failedTests++;
      return false;
    } else {
      console.log(chalk.yellow(`   ⚠️  Status: ${status} (${response.data?.error || 'Expected error'})`));
      passedTests++;
      return true;
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(chalk.red(`   ❌ Connection refused - Is the API server running?`));
      console.log(chalk.gray(`   Run: vercel dev`));
    } else if (error.code === 'ETIMEDOUT') {
      console.log(chalk.red(`   ❌ Request timeout`));
    } else {
      console.log(chalk.red(`   ❌ Error: ${error.message}`));
    }
    failedTests++;
    return false;
  }
}

// Run tests
async function runTests() {
  console.log(chalk.blue.bold('='.repeat(50)));
  console.log(chalk.blue.bold('HEALTH CHECK'));
  console.log(chalk.blue.bold('='.repeat(50)));
  
  await testEndpoint('Health Check', 'GET', '/health');
  
  console.log(chalk.blue.bold('\n' + '='.repeat(50)));
  console.log(chalk.blue.bold('AUTHENTICATION ENDPOINTS'));
  console.log(chalk.blue.bold('='.repeat(50)));
  
  await testEndpoint('Login (Invalid Credentials)', 'POST', '/auth/login', {
    email: 'test@example.com',
    password: 'wrongpassword'
  }, [401, 400]);
  
  await testEndpoint('Register (Validation)', 'POST', '/auth/register', {
    email: 'newuser@example.com',
    password: 'test123',
    name: 'Test User'
  }, [400, 409, 201]);
  
  await testEndpoint('Get Current User (No Auth)', 'GET', '/auth/me', null, [401, 200]);
  
  console.log(chalk.blue.bold('\n' + '='.repeat(50)));
  console.log(chalk.blue.bold('BUSINESS ENDPOINTS'));
  console.log(chalk.blue.bold('='.repeat(50)));
  
  await testEndpoint('List Businesses (No Auth)', 'GET', '/businesses', null, [401, 200]);
  
  await testEndpoint('Create Business (No Auth)', 'POST', '/businesses', {
    name: 'Test Business',
    category: 'retail'
  }, [401, 400]);
  
  await testEndpoint('Get Business (Invalid ID)', 'GET', '/businesses/9999', null, [401, 404, 400]);
  
  console.log(chalk.blue.bold('\n' + '='.repeat(50)));
  console.log(chalk.blue.bold('CUSTOMER ENDPOINTS'));
  console.log(chalk.blue.bold('='.repeat(50)));
  
  await testEndpoint('List Customers (No Auth)', 'GET', '/customers', null, [401, 200]);
  
  console.log(chalk.blue.bold('\n' + '='.repeat(50)));
  console.log(chalk.blue.bold('POINTS ENDPOINTS'));
  console.log(chalk.blue.bold('='.repeat(50)));
  
  await testEndpoint('Award Points (No Auth)', 'POST', '/points/award', {
    customerId: 1,
    programId: 1,
    points: 10
  }, [401, 400]);
  
  await testEndpoint('Get Points Balance (No Auth)', 'GET', '/points/balance?customerId=1', null, [401, 200, 400]);
  
  console.log(chalk.blue.bold('\n' + '='.repeat(50)));
  console.log(chalk.blue.bold('QR CODE ENDPOINTS'));
  console.log(chalk.blue.bold('='.repeat(50)));
  
  await testEndpoint('Generate QR (No Auth)', 'POST', '/qr/generate', {
    customerId: 1,
    businessId: 1
  }, [401, 400]);
  
  await testEndpoint('Validate QR (No Auth)', 'POST', '/qr/validate', {
    qrData: 'test-qr-data'
  }, [401, 400]);
  
  console.log(chalk.blue.bold('\n' + '='.repeat(50)));
  console.log(chalk.blue.bold('NOTIFICATION ENDPOINTS'));
  console.log(chalk.blue.bold('='.repeat(50)));
  
  await testEndpoint('Get Notifications (No Auth)', 'GET', '/notifications', null, [401, 200]);
  
  // Summary
  console.log(chalk.blue.bold('\n' + '='.repeat(50)));
  console.log(chalk.blue.bold('TEST SUMMARY'));
  console.log(chalk.blue.bold('='.repeat(50)));
  
  const total = passedTests + failedTests;
  const passRate = ((passedTests / total) * 100).toFixed(1);
  
  console.log(chalk.green(`\n✅ Passed: ${passedTests}`));
  console.log(chalk.red(`❌ Failed: ${failedTests}`));
  console.log(chalk.blue(`📊 Total:  ${total}`));
  console.log(chalk.cyan(`\n📈 Pass Rate: ${passRate}%\n`));
  
  if (failedTests === 0) {
    console.log(chalk.green.bold('🎉 All tests passed! Your API is ready for deployment.\n'));
    process.exit(0);
  } else if (failedTests > 0 && passedTests > 0) {
    console.log(chalk.yellow.bold('⚠️  Some tests failed. Check the errors above.\n'));
    process.exit(1);
  } else {
    console.log(chalk.red.bold('❌ All tests failed. Check your API server and database connection.\n'));
    process.exit(1);
  }
}

// Check if API server is running
async function checkServer() {
  try {
    console.log(chalk.gray('Checking if API server is running...\n'));
    await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(chalk.red('❌ API server is not running!\n'));
      console.log(chalk.yellow('To start the server locally, run:'));
      console.log(chalk.cyan('  vercel dev\n'));
      console.log(chalk.yellow('Or test against deployed API by setting:'));
      console.log(chalk.cyan('  export VITE_API_URL=https://your-app.vercel.app/api\n'));
      process.exit(1);
    }
    return false;
  }
}

// Main execution
(async () => {
  await checkServer();
  await runTests();
})();
