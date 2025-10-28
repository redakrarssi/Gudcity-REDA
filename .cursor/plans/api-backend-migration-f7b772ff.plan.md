<!-- f7b772ff-ca2b-4099-a5ad-53840c4cdc8a b1303515-4a3d-40f6-afe5-06b091a8f3b3 -->
# Complete Migration to Serverless API Backend

## Overview

Transform the application from direct database access to a secure 12-function serverless API backend following fun.md architecture. This migration removes all client-side database queries and implements proper authentication, rate limiting, and security layers.

## Phase 1: Foundation Setup

### 1.1 Create API Directory Structure

Create `/api` folder at project root for Vercel serverless functions:

```
api/
├── _lib/
│   ├── db.ts              # Server-only database connection
│   ├── auth.ts            # JWT verification middleware
│   ├── cors.ts            # CORS configuration
│   ├── validation.ts      # Input validation
│   ├── error-handler.ts   # Unified error handling
│   ├── rate-limit.ts      # Rate limiting
│   └── response.ts        # Standardized responses
└── _middleware/
    └── index.ts           # Middleware exports
```

### 1.2 Update Vercel Configuration

Modify `vercel.json` to support serverless functions:

- Change from static-build to serverless function configuration
- Add function-specific settings (memory, timeout)
- Configure proper routing for `/api/*` endpoints

### 1.3 Create Unified API Client

Build `src/utils/apiClient.ts` replacing fragmented clients:

- Centralized axios instance with base URL
- Automatic JWT token injection
- Token refresh logic
- Retry mechanisms
- Standardized error handling
- Request/response interceptors

Key features from `src/utils/apiClientFixed.js`:

- Token from localStorage
- 401 handling with refresh
- Timeout configuration (20s)

## Phase 2: Build 12 Serverless Functions

### Function 1: Authentication (`api/auth/[action].ts`)

**Endpoints:** 8 total

- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/logout
- POST /api/auth/refresh-token
- POST /api/auth/verify-token
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET /api/auth/me

**Migrate from:** `src/services/authService.ts` (611 lines)

**Key logic:** JWT generation, bcrypt hashing, rate limiting, account lockout

### Function 2: Business Management (`api/businesses/[...slug].ts`)

**Endpoints:** 16 total

- CRUD operations on businesses
- Customer enrollment
- Staff management
- Business settings

**Migrate from:**

- `src/services/businessService.ts` (1,105 lines)
- `src/api/businessRoutes.ts` (470 lines)

### Function 3: Business Analytics (`api/businesses/analytics/[...slug].ts`)

**Endpoints:** 7 total

- Revenue analytics
- Customer engagement
- Program performance
- Reports and exports

**Migrate from:**

- `src/services/businessAnalyticsService.ts`
- `src/services/analyticsService.ts`
- `src/services/dashboardService.ts`

### Function 4: Loyalty Programs (`api/loyalty/[...slug].ts`)

**Endpoints:** 10 total

- Program CRUD
- Tier management
- Reward configuration

**Migrate from:**

- `src/services/loyaltyProgramService.ts`

### Function 5: Points & Transactions (`api/points/[action].ts`)

**Endpoints:** 6 total

- Award points
- Redeem rewards
- Transaction history
- Point calculations

**Migrate from:**

- `src/services/transactionService.ts`
- Current problematic award-points logic

### Function 6: Customer Management (`api/customers/[...slug].ts`)

**Endpoints:** 8 total

- Customer CRUD
- Profile management
- Business relationships

**Migrate from:**

- `src/services/customerService.ts` (920 lines)

### Function 7: Loyalty Cards (`api/cards/[...slug].ts`)

**Endpoints:** 7 total

- Card generation
- Card status
- QR code management

**Migrate from:**

- `src/services/loyaltyCardService.ts`

### Function 8: QR Operations (`api/qr/[action].ts`)

**Endpoints:** 5 total

- QR generation
- QR validation
- Scan logging

**Migrate from:**

- `src/services/qrCodeService.ts`
- `src/services/qrCodeIntegrityService.ts`
- `src/services/qrCodeMonitoringService.ts`

### Function 9: Notifications (`api/notifications/[...route].ts`)

**Endpoints:** 9 total

- Send notifications
- Mark as read
- Preferences
- Approval requests

**Migrate from:**

- `src/services/notificationService.ts`
- `src/services/customerNotificationService.ts`
- `src/api/notificationRoutes.ts`

### Function 10: Admin Operations (`api/admin/[...slug].ts`)

**Endpoints:** 8 total

- System analytics
- Business management
- User management
- System health

**Migrate from:**

- `src/services/adminSettingsService.ts`
- `src/api/adminBusinessRoutes.ts`

### Function 11: Feedback & Support (`api/feedback/[...slug].ts`)

**Endpoints:** 6 total

- Customer feedback
- Error reporting
- Analytics logging

**Migrate from:**

- `src/api/feedbackRoutes.ts`

### Function 12: Health & Monitoring (`api/health.ts`)

**Endpoints:** 4 total

- Health checks
- System status
- Database connectivity

**Migrate from:**

- `src/services/healthService.ts`
- Current health endpoint

## Phase 3: Refactor Client Services

### 3.1 Update All 41 Service Files

Transform each service from direct SQL to API calls:

**Pattern transformation:**

```typescript
// BEFORE (Direct SQL)
import sql from '../utils/db';

export async function getUser(id: number) {
  const result = await sql`SELECT * FROM users WHERE id = ${id}`;
  return result[0];
}

// AFTER (API Call)
import { apiClient } from '../utils/apiClient';

export async function getUser(id: number) {
  const response = await apiClient.get(`/users/${id}`);
  return response.data;
}
```

**Critical files to update:**

1. `src/services/authService.ts` - Remove SQL, call /api/auth/*
2. `src/services/businessService.ts` - Call /api/businesses/*
3. `src/services/customerService.ts` - Call /api/customers/*
4. `src/services/notificationService.ts` - Call /api/notifications/*
5. `src/services/userService.ts` - Call /api/users/*
6. All remaining 36 service files

### 3.2 Update Components

Remove direct SQL imports from:

- `src/components/QRCard.tsx`
- `src/components/business/CustomerDetailsModal.tsx`
- `src/components/customer/NotificationList.tsx`
- `src/pages/business/Programs.tsx`

### 3.3 Update Context Providers

Remove polling with direct SQL:

- `src/components/UserStatusMonitor.tsx` - Use /api/users/:id/status
- `src/components/NotificationContext.tsx` - Use /api/notifications

## Phase 4: Environment & Security

### 4.1 Environment Variables

Split environment variables:

**Frontend (.env for Vite):**

```
VITE_API_URL=https://your-app.vercel.app/api
VITE_APP_NAME=GudCity
```

**Backend (Vercel Environment Variables):**

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
ENCRYPTION_KEY=...
```

Remove `VITE_DATABASE_URL` completely.

### 4.2 Security Middleware

Implement in each serverless function:

- JWT verification (`api/_lib/auth.ts`)
- Rate limiting per endpoint
- Input validation with schemas
- CORS configuration
- SQL injection prevention (parameterized queries only)

### 4.3 Update Database Connection

Modify `src/utils/db.ts`:

- Only runs server-side
- Use `process.env.DATABASE_URL` (not VITE_*)
- Connection pooling for Neon HTTP mode
- Export only for use in `/api` folder

## Phase 5: Migration & Testing

### 5.1 Parallel Running

- Keep Express server running during migration
- Deploy serverless functions alongside
- Test each function individually

### 5.2 Service-by-Service Migration

For each of 41 services:

1. Create corresponding serverless function
2. Update service to call API endpoint
3. Test frontend functionality
4. Fix any issues
5. Mark as complete

### 5.3 Remove Old Code

After all services migrated:

- Delete `src/server.ts`
- Delete `src/api/` folder (Express routes)
- Delete all Express dependencies
- Remove direct SQL imports
- Clean up unused middleware

### 5.4 Final Testing

- End-to-end testing all features
- Performance testing (cold starts, response times)
- Security audit
- Load testing

## Phase 6: Deployment

### 6.1 Vercel Configuration

- Deploy with new serverless functions
- Configure environment variables
- Set up custom domain
- Enable monitoring

### 6.2 Database Security

- Remove public database URL exposure
- Verify no client-side SQL access
- Enable connection pooling
- Set up database backups

### 6.3 Monitoring Setup

- Error tracking (Sentry/Vercel)
- Performance monitoring
- API usage analytics
- Alert configuration

## Success Criteria

- Zero direct database queries from frontend
- All 41 services using API endpoints
- 12 serverless functions deployed and working
- All tests passing
- No security vulnerabilities
- Performance within acceptable limits (< 1s response time)
- Cold starts < 3 seconds

## File Changes Summary

**New Files:** ~25 (API functions + middleware + client)

**Modified Files:** ~45 (41 services + 4 components + config)

**Deleted Files:** ~15 (Express server + old routes + unused utils)

### To-dos

- [ ] Create API directory structure and shared utilities (_lib folder with db, auth, validation, error handling)
- [ ] Build unified API client (src/utils/apiClient.ts) with auth, retry, and error handling
- [ ] Update vercel.json for serverless function support
- [ ] Create Function 1: Authentication (api/auth/[action].ts) - 8 endpoints
- [ ] Create Function 2: Business Management (api/businesses/[...slug].ts) - 16 endpoints
- [ ] Create Function 3: Business Analytics (api/businesses/analytics/[...slug].ts) - 7 endpoints
- [ ] Create Function 4: Loyalty Programs (api/loyalty/[...slug].ts) - 10 endpoints
- [ ] Create Function 5: Points & Transactions (api/points/[action].ts) - 6 endpoints
- [ ] Create Function 6: Customer Management (api/customers/[...slug].ts) - 8 endpoints
- [ ] Create Function 7: Loyalty Cards (api/cards/[...slug].ts) - 7 endpoints
- [ ] Create Function 8: QR Operations (api/qr/[action].ts) - 5 endpoints
- [ ] Create Function 9: Notifications (api/notifications/[...route].ts) - 9 endpoints
- [ ] Create Function 10: Admin Operations (api/admin/[...slug].ts) - 8 endpoints
- [ ] Create Function 11: Feedback & Support (api/feedback/[...slug].ts) - 6 endpoints
- [ ] Create Function 12: Health & Monitoring (api/health.ts) - 4 endpoints
- [ ] Refactor all 41 service files to use apiClient instead of direct SQL
- [ ] Update components and pages that directly import SQL
- [ ] Split environment variables and remove VITE_DATABASE_URL
- [ ] Remove Express server, old routes, and unused code
- [ ] Comprehensive testing of all endpoints and frontend functionality
- [ ] Deploy to Vercel with monitoring and final security audit