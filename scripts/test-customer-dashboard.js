#!/usr/bin/env node

/**
 * Customer Dashboard API Test Script
 * 
 * This script tests all the customer dashboard endpoints to ensure they work correctly.
 * 
 * Usage:
 *   node scripts/test-customer-dashboard.js
 *   
 * Or with specific base URL:
 *   BASE_URL=https://your-domain.vercel.app node scripts/test-customer-dashboard.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CUSTOMER_ID = 4;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await response.json();
    
    return {
      ok: response.ok,
      status: response.status,
      data,
      url
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message,
      url
    };
  }
}

function logResult(testName, result) {
  const status = result.ok ? 
    `${colors.green}✅ PASS${colors.reset}` : 
    `${colors.red}❌ FAIL${colors.reset}`;
  
  console.log(`${status} ${colors.bold}${testName}${colors.reset} (${result.status})`);
  
  if (!result.ok) {
    console.log(`   ${colors.red}Error:${colors.reset} ${result.error || result.data?.error || 'Unknown error'}`);
    if (result.data?.details) {
      console.log(`   ${colors.yellow}Details:${colors.reset} ${result.data.details}`);
    }
  } else {
    // Show data summary for successful requests
    if (result.data?.count !== undefined) {
      console.log(`   ${colors.blue}Count:${colors.reset} ${result.data.count}`);
    }
    if (result.data?.cards?.length) {
      console.log(`   ${colors.blue}Cards:${colors.reset} ${result.data.cards.length} loyalty cards found`);
    }
    if (result.data?.programs?.length) {
      console.log(`   ${colors.blue}Programs:${colors.reset} ${result.data.programs.length} enrolled programs`);
    }
    if (result.data?.notifications?.length) {
      console.log(`   ${colors.blue}Notifications:${colors.reset} ${result.data.notifications.length} notifications`);
    }
    if (result.data?.promotions?.length) {
      console.log(`   ${colors.blue}Promotions:${colors.reset} ${result.data.promotions.length} active promotions`);
    }
  }
  console.log('');
}

async function testCustomerDashboard() {
  console.log(`${colors.bold}🧪 Testing Customer Dashboard APIs${colors.reset}`);
  console.log(`${colors.blue}Base URL:${colors.reset} ${BASE_URL}`);
  console.log(`${colors.blue}Customer ID:${colors.reset} ${CUSTOMER_ID}`);
  console.log('');

  const tests = [
    {
      name: 'User Data (/api/users/4)',
      url: `${BASE_URL}/api/users/${CUSTOMER_ID}`,
      method: 'GET'
    },
    {
      name: 'Loyalty Cards (/api/loyalty/cards/customer/4)', 
      url: `${BASE_URL}/api/loyalty/cards/customer/${CUSTOMER_ID}`,
      method: 'GET'
    },
    {
      name: 'Enrolled Programs (/api/customers/4/programs)',
      url: `${BASE_URL}/api/customers/${CUSTOMER_ID}/programs`, 
      method: 'GET'
    },
    {
      name: 'All Notifications (/api/notifications?customerId=4)',
      url: `${BASE_URL}/api/notifications?customerId=${CUSTOMER_ID}`,
      method: 'GET'
    },
    {
      name: 'Unread Notifications (/api/notifications?customerId=4&unread=true)',
      url: `${BASE_URL}/api/notifications?customerId=${CUSTOMER_ID}&unread=true`,
      method: 'GET'
    },
    {
      name: 'All Promotions (/api/promotions)',
      url: `${BASE_URL}/api/promotions`,
      method: 'GET'
    },
    {
      name: 'Business Promotions (/api/promotions?businessId=1)',
      url: `${BASE_URL}/api/promotions?businessId=1`,
      method: 'GET'
    },
    {
      name: 'Security Audit Log (/api/security/audit)',
      url: `${BASE_URL}/api/security/audit?userId=${CUSTOMER_ID}`,
      method: 'GET'
    }
  ];

  let passCount = 0;
  let failCount = 0;

  for (const test of tests) {
    const result = await makeRequest(test.url, { method: test.method });
    logResult(test.name, result);
    
    if (result.ok) {
      passCount++;
    } else {
      failCount++;
    }
  }

  console.log(`${colors.bold}📊 Test Summary${colors.reset}`);
  console.log(`${colors.green}✅ Passed:${colors.reset} ${passCount}/${tests.length}`);
  console.log(`${colors.red}❌ Failed:${colors.reset} ${failCount}/${tests.length}`);
  
  if (failCount === 0) {
    console.log(`\n${colors.green}🎉 All tests passed! Customer dashboard should work correctly.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️ Some tests failed. Check the API endpoints and database.${colors.reset}`);
  }

  // Additional connectivity test
  console.log(`\n${colors.bold}🔗 Testing Basic Connectivity${colors.reset}`);
  const healthCheck = await makeRequest(`${BASE_URL}/api/health`, { method: 'GET' });
  if (!healthCheck.ok) {
    console.log(`${colors.yellow}⚠️ No health endpoint found, testing root endpoint...${colors.reset}`);
    const rootCheck = await makeRequest(BASE_URL, { method: 'GET' });
    console.log(`Root endpoint: ${rootCheck.ok ? '✅ Reachable' : '❌ Not reachable'}`);
  } else {
    console.log('✅ Health endpoint working');
  }
}

async function testSecurityAuditPost() {
  console.log(`\n${colors.bold}🔒 Testing Security Audit POST${colors.reset}`);
  
  const testData = {
    userId: CUSTOMER_ID,
    eventType: 'dashboard_view',
    ipAddress: '192.168.1.100',
    userAgent: 'Customer Dashboard Test Script',
    metadata: {
      test: true,
      timestamp: new Date().toISOString()
    }
  };

  const result = await makeRequest(`${BASE_URL}/api/security/audit`, {
    method: 'POST',
    body: JSON.stringify(testData)
  });

  logResult('Security Audit POST (/api/security/audit)', result);
}

// Main execution
(async () => {
  try {
    await testCustomerDashboard();
    await testSecurityAuditPost();
  } catch (error) {
    console.error(`${colors.red}❌ Test execution failed:${colors.reset}`, error.message);
    process.exit(1);
  }
})();
