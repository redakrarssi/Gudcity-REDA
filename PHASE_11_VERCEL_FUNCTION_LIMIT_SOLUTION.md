# Phase 11: Vercel Serverless Function Limit Solution

## Problem Statement

Vercel Free tier has a limit of **12 serverless functions**. Our current architecture has **60+ API endpoint files**, which exceeds this limit.

**Current Issue:**
- Too many individual API route files
- Each file becomes a separate serverless function
- Deployment will fail or be throttled on free tier

---

## Solution Options

### ✅ Option 1: Catch-All API Routes (RECOMMENDED)

Consolidate multiple endpoints into catch-all routes using dynamic segments.

**Implementation:**

#### 1.1 Main API Gateway
**File:** `api/[[...segments]].ts`

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from './_lib/auth';
import { rateLimit } from './_middleware/rateLimit';

// Import all server services
import AuthServerService from './_services/authServerService';
import UserServerService from './_services/userServerService';
import CustomerServerService from './_services/customerServerService';
// ... import all other services

/**
 * Main API Gateway - Handles all API routes
 * Route pattern: /api/[resource]/[id]/[action]
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Apply rate limiting
    await rateLimit(req, res);
    
    // Get route segments
    const segments = (req.query.segments as string[]) || [];
    const [resource, id, action] = segments;
    
    // Route to appropriate handler
    switch (resource) {
      case 'users':
        return await handleUsers(req, res, id, action);
      case 'customers':
        return await handleCustomers(req, res, id, action);
      case 'business':
        return await handleBusiness(req, res, id, action);
      case 'loyalty':
        return await handleLoyalty(req, res, id, action);
      case 'transactions':
        return await handleTransactions(req, res, id, action);
      case 'qr':
        return await handleQR(req, res, id, action);
      case 'notifications':
        return await handleNotifications(req, res, id, action);
      case 'admin':
        return await handleAdmin(req, res, id, action);
      default:
        return res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('API Gateway Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Handler for users endpoints
async function handleUsers(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  action: string
) {
  // Require authentication
  const user = await requireAuth(req, res);
  if (!user) return;
  
  const method = req.method;
  
  // GET /api/users/[id]
  if (method === 'GET' && id && !action) {
    const userData = await UserServerService.getUserById(parseInt(id));
    return res.json({ success: true, user: userData });
  }
  
  // GET /api/users/by-email?email=...
  if (method === 'GET' && id === 'by-email') {
    const email = req.query.email as string;
    const userData = await UserServerService.getUserByEmail(email);
    return res.json({ success: true, user: userData });
  }
  
  // PUT /api/users/[id]
  if (method === 'PUT' && id && !action) {
    const userData = await UserServerService.updateUser(
      parseInt(id),
      req.body
    );
    return res.json({ success: true, user: userData });
  }
  
  // GET /api/users/search?q=...
  if (method === 'GET' && id === 'search') {
    const query = req.query.q as string;
    const users = await UserServerService.searchUsers(query);
    return res.json({ success: true, users });
  }
  
  return res.status(404).json({ error: 'Endpoint not found' });
}

// Handler for customers endpoints
async function handleCustomers(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  action: string
) {
  const user = await requireAuth(req, res);
  if (!user) return;
  
  const method = req.method;
  
  // GET /api/customers/[id]
  if (method === 'GET' && id && !action) {
    const customer = await CustomerServerService.getCustomerById(id);
    return res.json({ success: true, customer });
  }
  
  // GET /api/customers/[id]/programs
  if (method === 'GET' && id && action === 'programs') {
    const programs = await CustomerServerService.getCustomerPrograms(id);
    return res.json({ success: true, programs });
  }
  
  // POST /api/customers/[id]/enroll
  if (method === 'POST' && id && action === 'enroll') {
    const { programId } = req.body;
    await CustomerServerService.enrollCustomerInProgram(id, programId);
    return res.json({ success: true });
  }
  
  // GET /api/customers/business/[businessId]
  if (method === 'GET' && id === 'business' && action) {
    const customers = await CustomerServerService.getBusinessCustomers(action);
    return res.json({ success: true, customers });
  }
  
  return res.status(404).json({ error: 'Endpoint not found' });
}

// ... implement other handlers (handleBusiness, handleLoyalty, etc.)
```

#### 1.2 Separate Auth Routes (Public Access)
**File:** `api/auth/[[...action]].ts`

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import AuthServerService from '../_services/authServerService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const action = (req.query.action as string[])?.[0] || 'login';
  const method = req.method;
  
  try {
    switch (action) {
      case 'login':
        if (method === 'POST') {
          const { email, password } = req.body;
          const result = await AuthServerService.validateUserCredentials(
            email,
            password
          );
          return res.json({ success: true, ...result });
        }
        break;
        
      case 'register':
        if (method === 'POST') {
          const result = await AuthServerService.registerUser(req.body);
          return res.json({ success: true, ...result });
        }
        break;
        
      case 'refresh':
        if (method === 'POST') {
          const { userId } = req.body;
          const token = await AuthServerService.refreshAuthToken(userId);
          return res.json({ success: true, token });
        }
        break;
        
      case 'logout':
        if (method === 'POST') {
          const { userId, token } = req.body;
          await AuthServerService.logoutUser(userId, token);
          return res.json({ success: true });
        }
        break;
        
      case 'change-password':
        if (method === 'POST') {
          const { userId, oldPassword, newPassword } = req.body;
          await AuthServerService.changePassword(
            userId,
            oldPassword,
            newPassword
          );
          return res.json({ success: true });
        }
        break;
        
      default:
        return res.status(404).json({ error: 'Auth endpoint not found' });
    }
  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

**Result:** Reduces 60+ functions to **3-5 functions**:
- `/api/auth/[[...action]].ts` - All auth endpoints
- `/api/[[...segments]].ts` - All main API endpoints
- `/api/db/initialize.ts` - Database initialization (keep separate)
- `/api/admin/[[...segments]].ts` - Admin-specific (optional)

**Pros:**
- ✅ Stays within free tier limits
- ✅ Easier to manage routing logic
- ✅ Centralized error handling
- ✅ Easier to add new endpoints
- ✅ Better performance (fewer cold starts)

**Cons:**
- ⚠️ Single file can become large
- ⚠️ Less granular function configuration
- ⚠️ Slightly more complex routing logic

---

### Option 2: Upgrade to Vercel Pro

**Cost:** $20/month per member

**Benefits:**
- Unlimited serverless functions
- Better performance
- More build minutes
- Priority support
- Custom domains
- Advanced analytics

**When to Choose:**
- Production application
- Team collaboration
- Need for advanced features
- Budget available

---

### Option 3: Use Edge Functions

Convert some endpoints to Edge Functions (not counted in serverless limit).

**Good for Edge Functions:**
- Authentication middleware
- Rate limiting
- Simple data transformations
- Geo-based routing
- A/B testing

**Not Good for Edge Functions:**
- Database operations (limited connection pool)
- Complex computations
- Large request/response bodies

---

### Option 4: Hybrid Approach

Combine multiple solutions:

```
/api/auth/[[...action]].ts           - Auth (Serverless)
/api/[[...segments]].ts              - Main API (Serverless)
/api/db/initialize.ts                - DB Init (Serverless)
/api/_middleware/auth.ts             - Auth Check (Edge)
/api/_middleware/rateLimit.ts        - Rate Limit (Edge)
```

---

## Implementation Plan

### Step 1: Backup Current Structure
```bash
# Create backup of current API structure
cp -r api/ api-backup/
```

### Step 2: Create Main API Gateway

1. Create `api/[[...segments]].ts`
2. Import all server services
3. Implement routing logic for each resource type
4. Add error handling and logging

### Step 3: Create Auth Gateway

1. Create `api/auth/[[...action]].ts`
2. Implement all auth endpoints
3. Ensure public access (no auth middleware)

### Step 4: Update vercel.json

```json
{
  "version": 2,
  "functions": {
    "api/auth/[[...action]].ts": {
      "memory": 1024,
      "maxDuration": 30
    },
    "api/[[...segments]].ts": {
      "memory": 1024,
      "maxDuration": 30
    },
    "api/db/initialize.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

### Step 5: Test Locally

```bash
# Start development server
npm run dev

# Test all endpoints
curl http://localhost:3000/api/users/1
curl http://localhost:3000/api/auth/login
curl http://localhost:3000/api/customers/1/programs
```

### Step 6: Update Client API Calls

**Good News:** No changes needed! The URLs remain the same:
- `/api/users/1` still works
- `/api/auth/login` still works
- Client code doesn't change

### Step 7: Deploy & Verify

```bash
# Deploy to Vercel
vercel --prod

# Verify function count
# Should be 3-5 functions instead of 60+
```

---

## Migration Checklist

### Pre-Migration
- [ ] Backup current API directory
- [ ] Document all current endpoints
- [ ] Create test suite for all endpoints
- [ ] Review current routing patterns

### Implementation
- [ ] Create `api/[[...segments]].ts`
- [ ] Implement routing for all resources
- [ ] Create `api/auth/[[...action]].ts`
- [ ] Test each endpoint locally
- [ ] Update vercel.json configuration

### Testing
- [ ] Test all authentication flows
- [ ] Test all CRUD operations
- [ ] Test error handling
- [ ] Test rate limiting
- [ ] Test authorization checks
- [ ] Load testing

### Deployment
- [ ] Deploy to staging
- [ ] Run full test suite
- [ ] Monitor for errors
- [ ] Deploy to production
- [ ] Verify function count in Vercel dashboard

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify all features working
- [ ] Update documentation
- [ ] Clean up old API files (after confirmation)

---

## Code Examples

### Example: Complete API Gateway Structure

```typescript
// api/[[...segments]].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from './_lib/auth';
import { rateLimit } from './_middleware/rateLimit';
import { responseFormatter } from './_services/responseFormatter';

// Resource handlers
import { handleUsers } from './handlers/users';
import { handleCustomers } from './handlers/customers';
import { handleBusiness } from './handlers/business';
import { handleLoyalty } from './handlers/loyalty';
import { handleTransactions } from './handlers/transactions';
import { handleQR } from './handlers/qr';
import { handleNotifications } from './handlers/notifications';
import { handleAdmin } from './handlers/admin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Apply rate limiting first
    await rateLimit(req, res);
    
    // Require authentication (can be skipped for specific routes)
    const user = await requireAuth(req, res);
    if (!user) {
      return responseFormatter.unauthorized(res, 'Authentication required');
    }
    
    // Parse route segments
    const segments = (req.query.segments as string[]) || [];
    const [resource, ...rest] = segments;
    
    // Log request (for debugging and auditing)
    console.log(`API Request: ${req.method} /api/${segments.join('/')}`);
    
    // Route to appropriate handler
    const handlers: Record<string, Function> = {
      users: handleUsers,
      customers: handleCustomers,
      business: handleBusiness,
      loyalty: handleLoyalty,
      transactions: handleTransactions,
      qr: handleQR,
      notifications: handleNotifications,
      admin: handleAdmin,
    };
    
    const handler = handlers[resource];
    if (!handler) {
      return responseFormatter.notFound(res, 'Resource not found');
    }
    
    // Call handler with user context
    return await handler(req, res, user, rest);
    
  } catch (error) {
    console.error('API Gateway Error:', error);
    return responseFormatter.error(
      res,
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
```

### Example: Resource Handler

```typescript
// api/handlers/users.ts
import { NextApiRequest, NextApiResponse } from 'next';
import UserServerService from '../_services/userServerService';
import { responseFormatter } from '../_services/responseFormatter';

export async function handleUsers(
  req: NextApiRequest,
  res: NextApiResponse,
  user: any,
  segments: string[]
) {
  const method = req.method;
  const [id, action] = segments;
  
  try {
    // GET /api/users/[id]
    if (method === 'GET' && id && !action) {
      // Check authorization - users can only get their own data
      // unless they're admin
      if (user.role !== 'admin' && parseInt(id) !== user.id) {
        return responseFormatter.forbidden(
          res,
          'Unauthorized access to user data'
        );
      }
      
      const userData = await UserServerService.getUserById(parseInt(id));
      return responseFormatter.success(res, { user: userData });
    }
    
    // GET /api/users/search?q=...
    if (method === 'GET' && id === 'search') {
      // Only admins can search users
      if (user.role !== 'admin') {
        return responseFormatter.forbidden(
          res,
          'Only admins can search users'
        );
      }
      
      const query = req.query.q as string;
      const users = await UserServerService.searchUsers(query);
      return responseFormatter.success(res, { users });
    }
    
    // PUT /api/users/[id]
    if (method === 'PUT' && id && !action) {
      // Check authorization
      if (user.role !== 'admin' && parseInt(id) !== user.id) {
        return responseFormatter.forbidden(
          res,
          'Unauthorized to update user data'
        );
      }
      
      const userData = await UserServerService.updateUser(
        parseInt(id),
        req.body
      );
      return responseFormatter.success(res, { user: userData });
    }
    
    // DELETE /api/users/[id]
    if (method === 'DELETE' && id && !action) {
      // Only admins can delete users
      if (user.role !== 'admin') {
        return responseFormatter.forbidden(
          res,
          'Only admins can delete users'
        );
      }
      
      await UserServerService.deleteUser(parseInt(id));
      return responseFormatter.success(res, { message: 'User deleted' });
    }
    
    // No matching route
    return responseFormatter.notFound(res, 'User endpoint not found');
    
  } catch (error) {
    console.error('User Handler Error:', error);
    return responseFormatter.error(
      res,
      'Failed to process user request',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
```

---

## Performance Considerations

### Cold Starts
- Consolidated functions = fewer cold starts
- First request may take longer (import all services)
- Subsequent requests are fast (warm function)

**Optimization:**
```typescript
// Lazy load services only when needed
async function handleUsers(...) {
  const UserService = await import('./_services/userServerService');
  // ...
}
```

### Memory Usage
- Larger function = more memory needed
- Set appropriate memory limits in vercel.json
- Monitor memory usage in Vercel dashboard

### Response Times
- Routing overhead is minimal (<1ms)
- Business logic time dominates
- Use caching where appropriate

---

## Testing Strategy

### Unit Tests
```typescript
// Test individual handlers
describe('User Handler', () => {
  it('should get user by id', async () => {
    const req = createMockRequest('GET', ['users', '1']);
    const res = createMockResponse();
    const user = { id: 1, role: 'admin' };
    
    await handleUsers(req, res, user, ['1']);
    
    expect(res.statusCode).toBe(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      user: expect.any(Object)
    });
  });
});
```

### Integration Tests
```typescript
// Test full API gateway
describe('API Gateway', () => {
  it('should route to correct handler', async () => {
    const response = await fetch('/api/users/1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

---

## Rollback Plan

If issues occur:

### Option 1: Quick Rollback
```bash
# Restore backup
rm -rf api/
mv api-backup/ api/
vercel --prod
```

### Option 2: Feature Flag
```typescript
// In gateway file
const USE_GATEWAY = process.env.USE_API_GATEWAY === 'true';

if (!USE_GATEWAY) {
  // Fallback to individual routes
  return res.status(503).json({ 
    error: 'Gateway temporarily disabled' 
  });
}
```

---

## Monitoring & Debugging

### Vercel Dashboard
- Check function invocation count
- Monitor error rates
- Review execution duration
- Check memory usage

### Logging
```typescript
// Add comprehensive logging
console.log('[API Gateway]', {
  method: req.method,
  path: segments.join('/'),
  user: user?.id,
  timestamp: new Date().toISOString()
});
```

### Error Tracking
- Configure Sentry or similar
- Track error types and frequencies
- Set up alerts for critical errors

---

## Conclusion

**Recommended Approach:** Option 1 (Catch-All Routes)

**Benefits:**
- ✅ Stays within free tier
- ✅ Minimal code changes
- ✅ No client updates needed
- ✅ Better organized
- ✅ Easier to maintain

**Timeline:**
- Planning: 2 hours
- Implementation: 8-12 hours
- Testing: 4-6 hours
- Deployment: 2 hours
- **Total: 16-22 hours**

**Priority:** Medium  
**Complexity:** Medium  
**Risk:** Low (can easily rollback)

---

## Next Steps

1. [ ] Review this document with team
2. [ ] Choose implementation approach
3. [ ] Schedule implementation time
4. [ ] Create detailed task breakdown
5. [ ] Begin implementation
6. [ ] Test thoroughly
7. [ ] Deploy to production

---

**Status:** 📋 PLANNED  
**Phase:** 11 of 11  
**Priority:** Medium  
**Blocking:** No (can deploy with current structure on Pro tier)

