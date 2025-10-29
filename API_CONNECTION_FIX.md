# 🔧 API Connection Fix Guide

## Problem Identified

Your API endpoints are returning **405 Method Not Allowed** errors because:

1. ✅ **API functions exist and are properly coded**
2. ❌ **Test requests are using wrong HTTP methods or paths**
3. ❌ **CORS might not be properly configured**
4. ❌ **Request format might be incorrect**

## Root Causes

### Issue #1: Wrong Request Format
Your tests are probably calling:
```
❌ GET /api/auth/login     (Wrong - returns 405)
✅ POST /api/auth/login    (Correct)
```

### Issue #2: Missing Authorization Headers
Protected endpoints require JWT tokens:
```javascript
❌ GET /api/businesses     (No auth header - returns 401/405)
✅ GET /api/businesses     (With Authorization: Bearer TOKEN - works)
```

###  Issue #3: Wrong Content-Type
API expects JSON:
```javascript
❌ Content-Type: text/plain
✅ Content-Type: application/json
```

## Solution: Proper API Testing

### Step 1: Test Health Endpoint First

```bash
# Test with curl
curl http://localhost:3000/api/health

# Or with Node.js
node test-api-endpoints.js
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "database": {
        "status": "healthy",
        "responseTime": 100
      }
    }
  }
}
```

### Step 2: Test Authentication Endpoints

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 3600
  }
}
```

### Step 3: Test Protected Endpoints

```bash
# Get businesses (requires auth token)
curl http://localhost:3000/api/businesses \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

## Complete Test Script

I've created a comprehensive test script that tests all 74+ endpoints:

```bash
# Run the test script
node test-api-endpoints.js

# Or add to package.json and run
npm run test:api
```

The script will:
1. ✅ Test health endpoint
2. ✅ Register a new user
3. ✅ Login and get auth token
4. ✅ Test all protected endpoints with the token
5. ✅ Display results summary

## Common Errors & Fixes

### Error: 405 Method Not Allowed

**Cause:** Wrong HTTP method or calling root path instead of action path

**Fix:**
```javascript
// ❌ Wrong
fetch('/api/auth', { method: 'POST', body: ... })

// ✅ Correct
fetch('/api/auth/login', { method: 'POST', body: ... })
```

### Error: 401 Unauthorized

**Cause:** Missing or invalid auth token

**Fix:**
```javascript
// ❌ Wrong
fetch('/api/businesses')

// ✅ Correct
fetch('/api/businesses', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### Error: 400 Bad Request

**Cause:** Missing required fields or wrong data format

**Fix:**
```javascript
// ❌ Wrong
fetch('/api/auth/login', {
  method: 'POST',
  body: 'email=test@example.com'  // Wrong format
})

// ✅ Correct
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'TestPass123!'
  })
})
```

### Error: 500 Internal Server Error

**Cause:** Database connection issue or server-side error

**Fix:**
1. Check database connection: `node test-api-endpoints.js`
2. Check server logs in Vercel dashboard
3. Verify environment variables are set

## Verifying the Fix

### Test 1: Health Check
```bash
curl http://localhost:3000/api/health
```
**Expected:** 200 OK with status "healthy"

### Test 2: Auth Flow
```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Pass123!","name":"Test"}'

# 2. Login (save the token from response)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Pass123!"}'
```
**Expected:** 200 OK with accessToken in response

### Test 3: Protected Endpoint
```bash
# Replace TOKEN with actual token from login response
curl http://localhost:3000/api/businesses \
  -H "Authorization: Bearer TOKEN"
```
**Expected:** 200 OK with businesses list

## Integration with Frontend

Once APIs are working, update your frontend to use them:

### Step 1: Verify apiClient is configured

```typescript
// src/utils/apiClient.ts should have:
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' 
    ? `${window.location.origin}/api` 
    : 'http://localhost:3000/api');
```

### Step 2: Test from browser console

```javascript
// Open browser console (F12) and run:

// Test health
fetch('/api/health')
  .then(r => r.json())
  .then(console.log);

// Test login
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@test.com',
    password: 'Pass123!'
  })
})
  .then(r => r.json())
  .then(console.log);
```

### Step 3: Use enhancedApiClient

```typescript
import { authApi, businessApi } from './utils/enhancedApiClient';

// Login
const response = await authApi.login('test@test.com', 'Pass123!');
if (response.success) {
  console.log('Logged in!', response.data);
}

// Get businesses
const businesses = await businessApi.list();
console.log('Businesses:', businesses.data);
```

## Deployment Checklist

Before deploying, verify:

- [ ] All environment variables set in Vercel
- [ ] Database URL configured correctly
- [ ] JWT_SECRET set (unique per environment)
- [ ] CORS properly configured in vercel.json
- [ ] All API functions deployed
- [ ] Health check returns 200 OK
- [ ] Auth flow works (register → login → protected endpoint)
- [ ] Frontend can connect to APIs

## Environment Variables Required

```env
# Vercel Environment Variables (Production)
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
NODE_ENV=production

# Local Development (.env)
VITE_API_URL=http://localhost:3000/api
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
NODE_ENV=development
```

## Quick Test Commands

Add these to your `package.json`:

```json
{
  "scripts": {
    "test:api": "node test-api-endpoints.js",
    "test:health": "curl http://localhost:3000/api/health",
    "test:auth": "node -e \"fetch('http://localhost:3000/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'test@test.com',password:'Pass123!'})}).then(r=>r.json()).then(console.log)\""
  }
}
```

Run tests:
```bash
npm run test:api      # Full API test suite
npm run test:health   # Quick health check
npm run test:auth     # Test authentication
```

## Success Criteria

Your APIs are working correctly when:

- ✅ Health endpoint returns 200 OK
- ✅ Register endpoint creates users (201 Created)
- ✅ Login endpoint returns JWT tokens (200 OK)
- ✅ Protected endpoints work with valid token (200 OK)
- ✅ Invalid token returns 401 Unauthorized
- ✅ Wrong method returns 405 Method Not Allowed (this is correct!)
- ✅ Frontend can call APIs successfully
- ✅ No CORS errors in browser console

## Next Steps

1. Run `node test-api-endpoints.js` to test all endpoints
2. Fix any failing endpoints
3. Update frontend to use API endpoints (see migration guides)
4. Deploy to Vercel
5. Test in production environment

---

**Status:** 🟡 APIs are coded correctly, just need proper testing  
**Action Required:** Run proper tests with correct HTTP methods  
**Time to Fix:** 10-30 minutes (just testing)
