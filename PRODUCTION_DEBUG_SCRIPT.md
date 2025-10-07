# 🧪 Production Debug Script - API Testing

## **Run This in Browser Console to Diagnose Issues**

Open your production website and press `F12` → Console tab, then paste and run these scripts:

---

## 🔍 **Script 1: Environment Diagnostic**

```javascript
// Environment Diagnostic Script
console.clear();
console.log('🔍 PRODUCTION ENVIRONMENT DIAGNOSTIC');
console.log('=====================================');

const isDev = window.location.hostname === 'localhost';
const isVercel = window.location.hostname.includes('.vercel.app');
const origin = window.location.origin;

console.log('🌍 Environment Info:', {
  hostname: window.location.hostname,
  origin: origin,
  isDevelopment: isDev,
  isVercel: isVercel,
  protocol: window.location.protocol,
  pathname: window.location.pathname
});

// Test API endpoint existence
const apiEndpoints = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/db/initialize',
  '/api/users/by-email'
];

console.log('🧪 Testing API Endpoints...');

Promise.all(
  apiEndpoints.map(async (endpoint) => {
    try {
      const response = await fetch(endpoint, { method: 'OPTIONS' });
      return {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        cors: response.headers.get('access-control-allow-origin'),
        available: response.status !== 404
      };
    } catch (error) {
      return {
        endpoint,
        error: error.message,
        available: false
      };
    }
  })
).then(results => {
  console.log('📊 API Endpoint Results:');
  results.forEach(result => {
    const status = result.available ? '✅' : '❌';
    console.log(`${status} ${result.endpoint}:`, result);
  });
  
  const workingEndpoints = results.filter(r => r.available).length;
  const totalEndpoints = results.length;
  
  console.log(`\n📈 Summary: ${workingEndpoints}/${totalEndpoints} endpoints working`);
  
  if (workingEndpoints === 0) {
    console.error('🚨 CRITICAL: No API endpoints are working!');
    console.log('💡 Solution: Check Vercel environment variables and deployment');
  }
});
```

---

## 🔐 **Script 2: Login API Test**

```javascript
// Login API Test Script
console.log('\n🔐 TESTING LOGIN API');
console.log('====================');

const testLogin = async () => {
  const loginUrl = `${window.location.origin}/api/auth/login`;
  
  console.log('🌐 Testing login endpoint:', loginUrl);
  
  // Test with invalid credentials (should return 401, not 404)
  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });
    
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    console.log('📡 Response Details:', {
      status: response.status,
      statusText: response.statusText,
      contentType: contentType,
      isJson: isJson,
      cors: response.headers.get('access-control-allow-origin')
    });
    
    if (response.status === 404) {
      console.error('❌ PROBLEM: API endpoint not found (404)');
      console.log('💡 Solution: Serverless function not deployed or environment variables missing');
      return;
    }
    
    if (!isJson) {
      const text = await response.text();
      console.error('❌ PROBLEM: Non-JSON response (likely HTML error page)');
      console.log('📄 Response preview:', text.substring(0, 200));
      return;
    }
    
    const data = await response.json();
    
    if (response.status === 401 || response.status === 400) {
      console.log('✅ SUCCESS: API is working (expected auth error)');
      console.log('📝 Response:', data);
    } else if (response.status === 500) {
      console.warn('⚠️  SERVER ERROR: API endpoint exists but has configuration issues');
      console.log('📝 Error details:', data);
      
      if (data.details && data.details.includes('DATABASE_URL')) {
        console.error('💾 PROBLEM: Database not configured');
        console.log('💡 Solution: Set DATABASE_URL in Vercel environment variables');
      }
      
      if (data.details && data.details.includes('JWT_SECRET')) {
        console.error('🔑 PROBLEM: JWT not configured');
        console.log('💡 Solution: Set JWT_SECRET in Vercel environment variables');
      }
    } else {
      console.log('🤔 UNEXPECTED: Unexpected response');
      console.log('📝 Response:', data);
    }
    
  } catch (error) {
    console.error('❌ NETWORK ERROR:', error.message);
    console.log('💡 This usually means the API endpoint is completely unavailable');
  }
};

testLogin();
```

---

## 🌐 **Script 3: CORS Test**

```javascript
// CORS Test Script  
console.log('\n🌐 TESTING CORS CONFIGURATION');
console.log('==============================');

const testCors = async () => {
  const apiUrl = `${window.location.origin}/api/auth/login`;
  
  // Test preflight request (OPTIONS)
  try {
    console.log('🔄 Testing preflight request...');
    
    const preflightResponse = await fetch(apiUrl, {
      method: 'OPTIONS',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      }
    });
    
    console.log('✈️ Preflight Response:', {
      status: preflightResponse.status,
      allowOrigin: preflightResponse.headers.get('access-control-allow-origin'),
      allowMethods: preflightResponse.headers.get('access-control-allow-methods'),
      allowHeaders: preflightResponse.headers.get('access-control-allow-headers'),
      allowCredentials: preflightResponse.headers.get('access-control-allow-credentials')
    });
    
    if (preflightResponse.status === 200) {
      console.log('✅ CORS preflight working');
    } else {
      console.warn('⚠️  CORS preflight issues detected');
    }
    
  } catch (error) {
    console.error('❌ CORS preflight failed:', error.message);
  }
};

testCors();
```

---

## 📊 **Script 4: Complete Health Check**

```javascript
// Complete Health Check Script
console.log('\n📊 COMPLETE API HEALTH CHECK');
console.log('=============================');

const healthCheck = async () => {
  const baseUrl = window.location.origin;
  const tests = [];
  
  // Test 1: Basic connectivity
  tests.push({
    name: 'Basic Connectivity',
    test: async () => {
      const response = await fetch(`${baseUrl}/`);
      return { success: response.ok, details: `Status: ${response.status}` };
    }
  });
  
  // Test 2: API routing
  tests.push({
    name: 'API Routing',
    test: async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, { method: 'OPTIONS' });
      return { 
        success: response.status !== 404, 
        details: `Status: ${response.status}, Available: ${response.status !== 404}` 
      };
    }
  });
  
  // Test 3: Environment check
  tests.push({
    name: 'Environment Check',
    test: async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test', password: 'test' })
      });
      
      if (response.status === 404) {
        return { success: false, details: 'API endpoint not found' };
      }
      
      if (response.status === 500) {
        try {
          const data = await response.json();
          return { success: false, details: data.details || 'Server configuration error' };
        } catch {
          return { success: false, details: 'Server error with non-JSON response' };
        }
      }
      
      return { success: true, details: 'Environment properly configured' };
    }
  });
  
  console.log('🔄 Running health checks...\n');
  
  for (const test of tests) {
    try {
      const result = await test.test();
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${test.name}: ${result.details}`);
    } catch (error) {
      console.log(`❌ ${test.name}: Error - ${error.message}`);
    }
  }
  
  console.log('\n🏁 Health check complete!');
  console.log('\nNext steps:');
  console.log('1. If API routing failed: Check Vercel deployment and vercel.json');
  console.log('2. If environment check failed: Set environment variables in Vercel');
  console.log('3. If all tests pass: Your API should work for login!');
};

healthCheck();
```

---

## 🎯 **How to Use These Scripts**

### **Step 1: Open Production Website**
Go to your live website (e.g., `https://your-app.vercel.app`)

### **Step 2: Open Browser Console**
Press `F12` → Click "Console" tab

### **Step 3: Run Scripts in Order**
1. Copy and paste **Script 1** (Environment Diagnostic)
2. Wait for results, then run **Script 2** (Login API Test)  
3. Run **Script 3** (CORS Test)
4. Finally run **Script 4** (Complete Health Check)

### **Step 4: Interpret Results**

#### **✅ Success Indicators:**
- API endpoints return status 200, 400, or 401 (NOT 404)
- Content-Type is `application/json`
- CORS headers are present
- Environment check passes

#### **❌ Problem Indicators:**
- 404 errors = Serverless functions not deployed
- HTML responses = Requests going to index.html instead of API
- 500 errors with "DATABASE_URL" = Environment variables missing
- Network errors = Complete API failure

---

## 🔧 **Common Issues and Solutions**

| Issue | Cause | Solution |
|-------|-------|----------|
| **404 on all APIs** | Serverless functions not deployed | Check Vercel deployment status |
| **HTML response** | Routing misconfiguration | Check vercel.json rewrites |
| **Database not configured** | Missing DATABASE_URL | Add to Vercel environment variables |
| **JWT not configured** | Missing JWT_SECRET | Add to Vercel environment variables |
| **CORS errors** | Origin mismatch | Check VITE_APP_URL matches domain |
| **Network errors** | Complete failure | Check Vercel deployment and functions |

---

**These scripts will pinpoint exactly what's wrong with your API configuration!** 

Run them and share the results to get targeted help.
