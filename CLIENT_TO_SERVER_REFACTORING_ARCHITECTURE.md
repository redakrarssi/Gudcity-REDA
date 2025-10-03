# Client-to-Server Database Query Refactoring Architecture

## 🎯 Executive Summary

**Current Problem**: 580+ warnings about SQL queries running directly from the browser  
**Security Risk**: Database credentials exposed to client, potential SQL injection, no authentication layer  
**Solution**: Move all database operations to server-side API endpoints with proper authentication

## 📊 Current Architecture Analysis

### Technology Stack Detected
- **Backend**: Express.js + Socket.IO
- **Database**: Neon Database (serverless PostgreSQL via @neondatabase/serverless)
- **Frontend**: React + TypeScript + Vite
- **Current DB Access**: Client-side direct queries via `src/utils/db.ts`
- **Environment**: `VITE_DATABASE_URL` exposed to browser (❌ SECURITY RISK)

### Files with Direct Database Queries
**Total**: 41 service files importing `sql` directly

**Critical Priority** (mentioned by user):
1. `src/services/notificationService.ts` - Line 641
2. `src/services/userService.ts` - Line 116
3. `src/services/customerNotificationService.ts` - Lines 136, 149
4. `src/components/NotificationContext.tsx` - Lines 108, 124
5. `src/components/UserStatusMonitor.tsx` - Lines 24, 71 (with setInterval)

## 🏗️ Proposed New Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER (Browser)                  │
│                                                             │
│  React Components                                          │
│         │                                                  │
│         ├─> Client Service Layer (services/*.ts)          │
│         │          │                                      │
│         │          └─> API Client Wrapper (apiClient.ts)  │
│         │                     │                           │
└─────────────────────────────────│───────────────────────────┘
                                  │ HTTP/HTTPS
                                  │ (fetch + auth headers)
                                  │
┌─────────────────────────────────▼───────────────────────────┐
│                     SERVER LAYER (Node.js)                  │
│                                                             │
│  Express API Routes (/api/*)                               │
│         │                                                  │
│         ├─> Authentication Middleware                      │
│         ├─> Rate Limiting Middleware                       │
│         ├─> Validation Middleware                          │
│         │                                                  │
│         └─> Server Service Layer (serverServices/*.ts)     │
│                     │                                      │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      │ SQL Queries
                      │ (parameterized)
                      │
┌─────────────────────▼────────────────────────────────────────┐
│                  DATABASE LAYER (Neon PostgreSQL)            │
│                                                             │
│  Tables + Functions + Row Level Security                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Changes

#### 1. Database Configuration

**Before** (❌ Insecure):
```typescript
// src/utils/db.ts - Runs in browser!
const DATABASE_URL = import.meta.env.VITE_DATABASE_URL;
const sql = neon(DATABASE_URL);
export default sql;
```

**After** (✅ Secure):
```typescript
// src/utils/db.ts - Server-side ONLY
const DATABASE_URL = process.env.DATABASE_URL; // Not VITE_*
const sql = neon(DATABASE_URL);
export default sql;
```

#### 2. Client-Side Services

**Before** (❌ Direct DB access):
```typescript
// src/services/userService.ts
import sql from '../utils/db';

export async function getUserById(id: number) {
  const result = await sql`SELECT * FROM users WHERE id = ${id}`;
  return result[0];
}
```

**After** (✅ API calls):
```typescript
// src/services/userService.ts
import { apiClient } from '../utils/apiClient';

export async function getUserById(id: number) {
  return apiClient.get(`/users/${id}`);
}
```

#### 3. Server-Side API

**New** (✅ Secure backend):
```typescript
// src/api/serverServices/userServerService.ts
import sql from '../../utils/db';

export async function getUserById(id: number) {
  const result = await sql`SELECT * FROM users WHERE id = ${id}`;
  return result[0];
}

// src/api/userApiRoutes.ts
import { getUserById } from './serverServices/userServerService';

router.get('/users/:id', authMiddleware, async (req, res) => {
  const user = await getUserById(parseInt(req.params.id));
  res.json({ success: true, data: user });
});
```

## 🔐 Security Enhancements

### 1. Authentication Layer
```typescript
// All API requests require authentication
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  
  req.user = payload;
  next();
};
```

### 2. Authorization Layer
```typescript
// Check user permissions for resources
const checkUserAccess = (req, res, next) => {
  const requestedUserId = parseInt(req.params.id);
  const currentUserId = req.user.userId;
  
  // Users can only access their own data unless admin
  if (requestedUserId !== currentUserId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
};
```

### 3. Rate Limiting
```typescript
// Prevent excessive API calls
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100 // 100 requests per minute
});

const sensitiveApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10 // 10 requests per minute for sensitive operations
});
```

## 📝 File Organization

### New Directory Structure

```
src/
├── api/
│   ├── routes/
│   │   ├── userRoutes.ts          (existing, will enhance)
│   │   ├── notificationRoutes.ts  (existing, will enhance)
│   │   └── customerRoutes.ts      (existing, will enhance)
│   │
│   ├── serverServices/            (NEW - server-side only)
│   │   ├── userServerService.ts   (DB queries for users)
│   │   ├── notificationServerService.ts
│   │   └── customerServerService.ts
│   │
│   └── middleware/
│       ├── auth.ts                (authentication)
│       ├── validation.ts          (input validation)
│       └── rateLimit.ts           (rate limiting)
│
├── services/                      (REFACTORED - client-side)
│   ├── userService.ts             (now calls API)
│   ├── notificationService.ts     (now calls API)
│   └── customerNotificationService.ts
│
├── utils/
│   ├── db.ts                      (MOVED to server-only)
│   ├── apiClient.ts               (NEW - HTTP client wrapper)
│   └── cache.ts                   (NEW - client-side caching)
│
└── components/
    ├── NotificationContext.tsx    (REFACTORED)
    └── UserStatusMonitor.tsx      (REFACTORED with optimized polling)
```

## 🚀 Implementation Plan

### Phase 1: Infrastructure Setup (1-2 hours)

**Tasks**:
1. ✅ Create `apiClient.ts` - HTTP client with authentication
2. ✅ Create server-side service directory structure
3. ✅ Update `db.ts` to be server-side only
4. ✅ Create authentication middleware
5. ✅ Create validation middleware

**Files**:
- `src/utils/apiClient.ts` (NEW)
- `src/utils/cache.ts` (NEW)
- `src/api/serverServices/` (NEW directory)
- `src/middleware/apiAuth.ts` (NEW)

### Phase 2: User Service Refactoring (2-3 hours)

**Tasks**:
1. ✅ Create `userServerService.ts` with all DB queries
2. ✅ Enhance `/api/users` routes
3. ✅ Refactor `userService.ts` to use API
4. ✅ Test user authentication flow

**Files**:
- `src/api/serverServices/userServerService.ts` (NEW)
- `src/api/userRoutes.ts` (MODIFY)
- `src/services/userService.ts` (REFACTOR)

### Phase 3: Notification Service Refactoring (3-4 hours)

**Tasks**:
1. ✅ Create `notificationServerService.ts`
2. ✅ Create `/api/notifications` endpoints
3. ✅ Refactor `notificationService.ts`
4. ✅ Refactor `customerNotificationService.ts`
5. ✅ Update `NotificationContext.tsx`

**Files**:
- `src/api/serverServices/notificationServerService.ts` (NEW)
- `src/api/notificationRoutes.ts` (MODIFY)
- `src/services/notificationService.ts` (REFACTOR)
- `src/services/customerNotificationService.ts` (REFACTOR)
- `src/components/NotificationContext.tsx` (REFACTOR)

### Phase 4: Polling Optimization (1-2 hours)

**Tasks**:
1. ✅ Implement request caching in `apiClient.ts`
2. ✅ Optimize `UserStatusMonitor.tsx` polling
3. ✅ Add WebSocket support for real-time updates (optional)
4. ✅ Implement exponential backoff for failures

**Files**:
- `src/components/UserStatusMonitor.tsx` (REFACTOR)
- `src/utils/cache.ts` (ENHANCE)
- `src/server.ts` (ADD WebSocket handlers if needed)

### Phase 5: Remaining Services (4-6 hours)

**Tasks**:
1. ✅ Refactor remaining 36 service files
2. ✅ Create corresponding server services
3. ✅ Create API endpoints
4. ✅ Test each service

**Strategy**: Group similar services together (loyalty, QR codes, etc.)

### Phase 6: Testing & Cleanup (2-3 hours)

**Tasks**:
1. ✅ Integration testing
2. ✅ Remove direct DB imports from client files
3. ✅ Update environment variables
4. ✅ Performance testing
5. ✅ Security audit

## 🎯 API Endpoint Design

### RESTful Conventions

```typescript
// User endpoints
GET    /api/users/:id              // Get user by ID
GET    /api/users                  // List users (admin only)
POST   /api/users                  // Create user
PUT    /api/users/:id              // Update user
DELETE /api/users/:id              // Delete user

// Notification endpoints
GET    /api/notifications          // Get user notifications
GET    /api/notifications/:id      // Get specific notification
POST   /api/notifications          // Create notification
PUT    /api/notifications/:id      // Mark as read
DELETE /api/notifications/:id      // Delete notification

// Customer notification endpoints
GET    /api/customers/:id/notifications     // Customer-specific
GET    /api/businesses/:id/notifications    // Business-specific

// Status check endpoint (for UserStatusMonitor)
GET    /api/users/:id/status       // Lightweight status check
```

### Response Format

```typescript
// Success response
{
  success: true,
  data: { /* resource data */ },
  meta: {
    timestamp: "2024-12-03T10:00:00Z",
    cached: false
  }
}

// Error response
{
  success: false,
  error: {
    code: "USER_NOT_FOUND",
    message: "User with ID 123 not found",
    details: { /* additional context */ }
  },
  meta: {
    timestamp: "2024-12-03T10:00:00Z"
  }
}
```

## 💾 Caching Strategy

### Client-Side Cache

```typescript
// Cache configuration
const cacheConfig = {
  // User data: 5 minutes
  'users': { ttl: 5 * 60 * 1000 },
  
  // Notifications: 30 seconds (needs to be fresh)
  'notifications': { ttl: 30 * 1000 },
  
  // User status: 10 seconds (for polling optimization)
  'user-status': { ttl: 10 * 1000 },
  
  // Business data: 10 minutes (less frequently changing)
  'businesses': { ttl: 10 * 60 * 1000 }
};
```

### Cache Invalidation

```typescript
// Invalidate on mutations
apiClient.put('/users/123', data).then(() => {
  cache.invalidate('users', '123');
  cache.invalidate('users'); // Invalidate list too
});

// Invalidate on real-time events (Socket.IO)
socket.on('user-updated', (userId) => {
  cache.invalidate('users', userId);
});
```

## ⚡ Performance Optimizations

### 1. Request Batching
```typescript
// Batch multiple requests into one
apiClient.batch([
  { method: 'GET', url: '/users/1' },
  { method: 'GET', url: '/notifications' }
]).then(([user, notifications]) => {
  // Handle responses
});
```

### 2. Polling Optimization
```typescript
// Before: Poll every 5 seconds regardless
setInterval(() => fetchStatus(), 5000);

// After: Adaptive polling with exponential backoff
let pollInterval = 5000; // Start at 5 seconds
let maxInterval = 60000;  // Max 60 seconds

function poll() {
  fetchStatus()
    .then((status) => {
      if (status.hasChanges) {
        // Reset to fast polling if changes detected
        pollInterval = 5000;
      } else {
        // Slow down if no changes
        pollInterval = Math.min(pollInterval * 1.5, maxInterval);
      }
      setTimeout(poll, pollInterval);
    })
    .catch(() => {
      // Exponential backoff on errors
      pollInterval = Math.min(pollInterval * 2, maxInterval);
      setTimeout(poll, pollInterval);
    });
}
```

### 3. Server-Side Query Optimization
```typescript
// Before: N+1 queries
for (const notif of notifications) {
  notif.user = await getUserById(notif.userId); // N queries
}

// After: Batch query with JOIN
const notifications = await sql`
  SELECT n.*, u.name as user_name, u.email as user_email
  FROM notifications n
  LEFT JOIN users u ON n.user_id = u.id
  WHERE n.customer_id = ${customerId}
`;
```

## 🔒 Security Checklist

- [ ] Remove `VITE_DATABASE_URL` from environment
- [ ] Add `DATABASE_URL` as server-side only
- [ ] Implement JWT authentication on all API routes
- [ ] Add role-based authorization
- [ ] Implement rate limiting on all endpoints
- [ ] Validate and sanitize all input data
- [ ] Use parameterized queries (already done with Neon)
- [ ] Add CORS restrictions in production
- [ ] Implement request logging and monitoring
- [ ] Add SQL injection tests
- [ ] Test authentication bypass scenarios

## 📚 Migration Guide

### For Developers

#### 1. Update Environment Variables

**Before**:
```env
VITE_DATABASE_URL=postgresql://...
```

**After**:
```env
DATABASE_URL=postgresql://...  # Server-side only
VITE_API_BASE_URL=http://localhost:3000/api  # For client
```

#### 2. Update Service Imports

**Before**:
```typescript
import sql from '../utils/db';
```

**After**:
```typescript
import { apiClient } from '../utils/apiClient';
```

#### 3. Update Function Calls

**Before**:
```typescript
const users = await sql`SELECT * FROM users`;
```

**After**:
```typescript
const users = await apiClient.get('/users');
```

### Breaking Changes

1. **Database URL**: Must update environment variables
2. **Service Functions**: Signature changes (some functions now async that weren't before)
3. **Error Handling**: Errors now come from API, not direct DB
4. **Authentication**: All requests require authentication tokens

### Compatibility Layer (Temporary)

For gradual migration, we can create a compatibility shim:

```typescript
// src/utils/dbCompat.ts
export default function sql(strings, ...values) {
  console.warn('Direct DB access deprecated. Use apiClient instead.');
  // Throw error in development
  if (import.meta.env.DEV) {
    throw new Error('Direct database access not allowed from client');
  }
  // Return empty result in production (fail safe)
  return Promise.resolve([]);
}
```

## 🧪 Testing Plan

### Unit Tests
- Test each server service individually
- Test API endpoints with mocked database
- Test client services with mocked API

### Integration Tests
- Test complete user flows
- Test authentication and authorization
- Test error scenarios

### Performance Tests
- Measure API response times
- Test caching effectiveness
- Load test with multiple concurrent users

### Security Tests
- SQL injection attempts
- Authentication bypass attempts
- Authorization boundary tests
- Rate limiting effectiveness

## 📈 Success Metrics

- ✅ Zero SQL queries from browser (check browser dev tools)
- ✅ All API endpoints authenticated
- ✅ Average API response time < 200ms
- ✅ Cache hit rate > 70% for frequently accessed data
- ✅ Reduced polling frequency by 50%
- ✅ Zero security vulnerabilities in audit

## 🛠️ Tools and Libraries

- **API Client**: Native `fetch` with wrapper
- **Caching**: Custom implementation (LRU cache)
- **Authentication**: JWT (existing)
- **Validation**: Zod or Joi
- **Testing**: Jest + Supertest
- **Monitoring**: Morgan + Custom middleware

## 📅 Timeline

**Estimated Total**: 15-25 hours

- Phase 1: 2 hours
- Phase 2: 3 hours
- Phase 3: 4 hours
- Phase 4: 2 hours
- Phase 5: 6 hours
- Phase 6: 3 hours
- Buffer: 5 hours (for unexpected issues)

## 🚦 Risk Assessment

### High Risk
- **Authentication Failures**: Could lock out users
  - *Mitigation*: Implement with backward compatibility first
  
- **Performance Degradation**: API layer adds latency
  - *Mitigation*: Aggressive caching, query optimization

### Medium Risk
- **Breaking Changes**: Existing code depends on current structure
  - *Mitigation*: Gradual migration, compatibility layer

### Low Risk
- **Testing Coverage**: Not all scenarios tested
  - *Mitigation*: Comprehensive test plan, staging environment

## ✅ Next Steps

1. **Review and Approve Architecture**
2. **Set up Development Environment**
3. **Begin Phase 1 Implementation**
4. **Iterative Development and Testing**
5. **Gradual Rollout to Production**

---

**Status**: ✅ Ready for Implementation  
**Last Updated**: December 2024  
**Follows reda.md**: ✅ Security-first, file size limits, incremental changes

