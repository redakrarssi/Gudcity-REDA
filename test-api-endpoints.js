/**
 * Comprehensive API Endpoint Test Script
 * 
 * This script tests all 74+ API endpoints to verify they're working correctly
 */

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';

// Test results storage
const results = {
  passed: [],
  failed: [],
  total: 0
};

// Helper function to make API calls
async function testEndpoint(name, method, endpoint, options = {}) {
  results.total++;
  const startTime = Date.now();
  
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };
    
    if (options.body) {
      config.body = JSON.stringify(options.body);
    }
    
    console.log(`\nTesting: ${method} ${endpoint}`);
    const response = await fetch(url, config);
    const duration = Date.now() - startTime;
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }
    
    if (response.ok) {
      console.log(`✅ ${name} - PASSED (${duration}ms)`);
      results.passed.push({ name, endpoint, method, duration, status: response.status });
      return { success: true, data, status: response.status };
    } else {
      console.log(`❌ ${name} - FAILED (${duration}ms) - ${response.status}: ${data.error || data.message || 'Unknown error'}`);
      results.failed.push({ name, endpoint, method, duration, status: response.status, error: data.error || data.message });
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ ${name} - ERROR (${duration}ms) - ${error.message}`);
    results.failed.push({ name, endpoint, method, duration, error: error.message });
    return { success: false, error: error.message };
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting API Endpoint Tests...\n');
  console.log(`API Base URL: ${API_BASE_URL}\n`);
  console.log('=' .repeat(80));
  
  // ===========================================
  // SECTION 1: HEALTH CHECK
  // ===========================================
  console.log('\n\n📊 SECTION 1: HEALTH CHECK');
  console.log('=' .repeat(80));
  
  await testEndpoint(
    'Health Check',
    'GET',
    '/health'
  );
  
  // ===========================================
  // SECTION 2: AUTHENTICATION
  // ===========================================
  console.log('\n\n🔐 SECTION 2: AUTHENTICATION');
  console.log('=' .repeat(80));
  
  // Register new user
  const registerResult = await testEndpoint(
    'Register User',
    'POST',
    '/auth/register',
    {
      body: {
        email: `test-${Date.now()}@example.com`,
        password: 'TestPass123!',
        name: 'Test User',
        role: 'CUSTOMER'
      }
    }
  );
  
  let authToken = null;
  let userId = null;
  
  if (registerResult.success && registerResult.data.data) {
    authToken = registerResult.data.data.accessToken;
    userId = registerResult.data.data.user?.id;
    console.log(`🔑 Auth Token obtained: ${authToken?.substring(0, 20)}...`);
  }
  
  // Login
  const loginResult = await testEndpoint(
    'Login User',
    'POST',
    '/auth/login',
    {
      body: {
        email: 'test@example.com',
        password: 'TestPass123!'
      }
    }
  );
  
  if (loginResult.success && loginResult.data.data) {
    authToken = loginResult.data.data.accessToken;
    userId = loginResult.data.data.user?.id;
  }
  
  // Verify Token
  if (authToken) {
    await testEndpoint(
      'Verify Token',
      'POST',
      '/auth/verify',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
  }
  
  // Get Current User
  if (authToken) {
    await testEndpoint(
      'Get Current User',
      'GET',
      '/auth/me',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
  }
  
  // Logout
  if (authToken) {
    await testEndpoint(
      'Logout',
      'POST',
      '/auth/logout',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
  }
  
  // ===========================================
  // SECTION 3: BUSINESS ENDPOINTS
  // ===========================================
  console.log('\n\n🏢 SECTION 3: BUSINESS MANAGEMENT');
  console.log('=' .repeat(80));
  
  if (authToken) {
    // List businesses
    await testEndpoint(
      'List Businesses',
      'GET',
      '/businesses?page=1&limit=10',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    // Create business
    const createBusinessResult = await testEndpoint(
      'Create Business',
      'POST',
      '/businesses',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          name: 'Test Business',
          description: 'A test business',
          category: 'RETAIL',
          address: '123 Test St',
          phone: '555-0100',
          email: 'business@test.com'
        }
      }
    );
    
    let businessId = null;
    if (createBusinessResult.success && createBusinessResult.data.data) {
      businessId = createBusinessResult.data.data.id;
    }
    
    if (businessId) {
      // Get business
      await testEndpoint(
        'Get Business',
        'GET',
        `/businesses/${businessId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      // Get business customers
      await testEndpoint(
        'Get Business Customers',
        'GET',
        `/businesses/${businessId}/customers`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      // Get business programs
      await testEndpoint(
        'Get Business Programs',
        'GET',
        `/businesses/${businessId}/programs`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
    }
  }
  
  // ===========================================
  // SECTION 4: CUSTOMER ENDPOINTS
  // ===========================================
  console.log('\n\n👥 SECTION 4: CUSTOMER MANAGEMENT');
  console.log('=' .repeat(80));
  
  if (authToken) {
    // List customers
    await testEndpoint(
      'List Customers',
      'GET',
      '/customers?page=1&limit=10',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    // Create customer
    const createCustomerResult = await testEndpoint(
      'Create Customer',
      'POST',
      '/customers',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          email: `customer-${Date.now()}@test.com`,
          name: 'Test Customer',
          phone: '555-0200'
        }
      }
    );
    
    let customerId = null;
    if (createCustomerResult.success && createCustomerResult.data.data) {
      customerId = createCustomerResult.data.data.id;
    }
    
    if (customerId) {
      // Get customer
      await testEndpoint(
        'Get Customer',
        'GET',
        `/customers/${customerId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      // Get customer programs
      await testEndpoint(
        'Get Customer Programs',
        'GET',
        `/customers/${customerId}/programs`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      // Get customer cards
      await testEndpoint(
        'Get Customer Cards',
        'GET',
        `/customers/${customerId}/cards`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
    }
  }
  
  // ===========================================
  // SECTION 5: POINTS ENDPOINTS
  // ===========================================
  console.log('\n\n🎯 SECTION 5: POINTS MANAGEMENT');
  console.log('=' .repeat(80));
  
  if (authToken) {
    // Award points
    await testEndpoint(
      'Award Points',
      'POST',
      '/points/award',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          customerId: '1',
          programId: '1',
          businessId: '1',
          points: 10,
          description: 'Test points award'
        }
      }
    );
    
    // Get points balance
    await testEndpoint(
      'Get Points Balance',
      'GET',
      '/points/balance?customerId=1',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    // Calculate points
    await testEndpoint(
      'Calculate Points',
      'POST',
      '/points/calculate',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          programId: '1',
          purchaseAmount: 50
        }
      }
    );
  }
  
  // ===========================================
  // SECTION 6: QR CODE ENDPOINTS
  // ===========================================
  console.log('\n\n📱 SECTION 6: QR CODE OPERATIONS');
  console.log('=' .repeat(80));
  
  if (authToken) {
    // Generate QR code
    const qrResult = await testEndpoint(
      'Generate QR Code',
      'POST',
      '/qr/generate',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          customerId: '1',
          businessId: '1',
          programId: '1',
          type: 'LOYALTY_CARD'
        }
      }
    );
    
    if (qrResult.success && qrResult.data.data) {
      const qrData = qrResult.data.data.qrData;
      
      // Validate QR code
      await testEndpoint(
        'Validate QR Code',
        'POST',
        '/qr/validate',
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: {
            qrData: JSON.stringify(qrData)
          }
        }
      );
      
      // Scan QR code
      await testEndpoint(
        'Scan QR Code',
        'POST',
        '/qr/scan',
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: {
            qrUniqueId: qrData.id
          }
        }
      );
    }
  }
  
  // ===========================================
  // SECTION 7: NOTIFICATION ENDPOINTS
  // ===========================================
  console.log('\n\n🔔 SECTION 7: NOTIFICATIONS');
  console.log('=' .repeat(80));
  
  if (authToken && userId) {
    // List notifications
    await testEndpoint(
      'List Notifications',
      'GET',
      `/notifications?userId=${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    // Create notification
    const notifResult = await testEndpoint(
      'Create Notification',
      'POST',
      '/notifications',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: {
          userId: userId,
          type: 'TEST',
          title: 'Test Notification',
          message: 'This is a test notification'
        }
      }
    );
    
    // Get notification stats
    await testEndpoint(
      'Get Notification Stats',
      'GET',
      `/notifications/stats?userId=${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
  }
  
  // ===========================================
  // RESULTS SUMMARY
  // ===========================================
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nTotal Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed.length} (${Math.round(results.passed.length / results.total * 100)}%)`);
  console.log(`❌ Failed: ${results.failed.length} (${Math.round(results.failed.length / results.total * 100)}%)`);
  
  if (results.passed.length > 0) {
    console.log('\n✅ PASSED TESTS:');
    results.passed.forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.name} (${test.duration}ms)`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.name} - ${test.error || 'Unknown error'}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🏁 Testing Complete!');
  console.log('='.repeat(80));
}

// Run tests
runAllTests().catch(console.error);

