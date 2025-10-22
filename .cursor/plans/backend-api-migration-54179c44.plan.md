<!-- 54179c44-801c-4182-8f24-3f3f86430d5f cc7e6af2-e4ef-4870-8005-e05ce72539e7 -->
# Complete Database-to-API Backend Migration Plan

## Overview

Migrate 42 service files from direct client-side database access to secure backend API endpoints in phases, maintaining backward compatibility throughout the transition.

## Phase 1: Infrastructure Enhancement (4-6 hours)

### 1.1 Enhance API Client

**File: `src/services/apiClient.ts`**

- Add comprehensive error handling wrapper
- Add retry logic for failed requests
- Add request/response interceptors for logging
- Ensure all methods (get, post, put, delete) are properly typed
- Add support for query parameters and request cancellation

### 1.2 Create Server Service Base Structure

**Directory: `api/_services/` (NEW)**

- Create directory for all server-side services
- Create base types file: `api/_services/types.ts` for shared interfaces
- Create response formatter: `api/_services/responseFormatter.ts` for consistent API responses

### 1.3 Enhance Authentication Middleware

**File: `api/_lib/auth.ts`**

- Extend interface: Add `AuthenticatedRequest` interface with user property
- Add `requireRole()` helper for role-based authorization
- Improve error messages for debugging
- Add request logging for security auditing

### 1.4 Create Rate Limiting Middleware

**File: `api/_middleware/rateLimit.ts` (NEW)**

- Standard rate limit: 100 requests/minute per IP
- Sensitive endpoints: 10 requests/minute per IP
- Return 429 with retry-after header

### 1.5 Create Input Validation Middleware

**File: `api/_middleware/validation.ts` (NEW)**

- Validate request bodies against schemas
- Sanitize all string inputs
- Return 400 with detailed validation errors

**Test Phase 1:**

- API client can make requests to existing endpoints
- Authentication middleware properly extracts user info
- Rate limiting works correctly

## Phase 2: Authentication Service Migration (6-8 hours)

### 2.1 Create Auth Server Service

**File: `api/_services/authServerService.ts` (NEW)**

```typescript
- validateUserCredentials(email, password): Promise<{user, token}>
- registerUser(userData): Promise<{user, token}>
- refreshAuthToken(userId): Promise<string>
- logoutUser(userId, token): Promise<void>
- changePassword(userId, oldPassword, newPassword): Promise<void>
```

Move all database queries from `src/services/authService.ts` here.

### 2.2 Enhance API Endpoints

**Files:**

- `api/auth/login.ts` - Already exists, enhance with server service
- `api/auth/register.ts` - Already exists, enhance with server service
- `api/auth/refresh.ts` (NEW) - Token refresh endpoint
- `api/auth/logout.ts` (NEW) - Logout endpoint
- `api/auth/change-password.ts` (NEW) - Password change endpoint

### 2.3 Refactor Client Auth Service

**File: `src/services/authService.ts`**

- Keep existing functions for backward compatibility
- Add new API-based functions (with "Api" suffix)
- Use feature flag to switch between old/new implementations
- Example: `login()` tries API first, falls back to direct DB if API fails
- Store JWT in localStorage after successful login

**Test Phase 2:**

- Login works via API
- Registration works via API
- Token refresh works
- Old code still functions with fallback
- All 3 dashboards can authenticate

## Phase 3: User & Customer Services Migration (8-10 hours)

### 3.1 Create User Server Service

**File: `api/_services/userServerService.ts` (NEW)**

```typescript
- getUserById(userId): Promise<User>
- getUserByEmail(email): Promise<User>
- updateUser(userId, updates): Promise<User>
- deleteUser(userId): Promise<void>
- searchUsers(query, filters): Promise<User[]>
- getUsersByType(userType): Promise<User[]>
```

### 3.2 Create Customer Server Service

**File: `api/_services/customerServerService.ts` (NEW)**

```typescript
- getBusinessCustomers(businessId): Promise<Customer[]>
- getCustomerById(customerId): Promise<Customer>
- createCustomer(customerData): Promise<Customer>
- updateCustomer(customerId, updates): Promise<Customer>
- getCustomerPrograms(customerId): Promise<CustomerProgram[]>
- enrollCustomerInProgram(customerId, programId): Promise<void>
```

### 3.3 Create/Enhance API Endpoints

**User Endpoints:**

- `api/users/[id].ts` - Already exists, enhance
- `api/users/by-email.ts` - Already exists, enhance
- `api/users/search.ts` (NEW)
- `api/users/list.ts` (NEW)

**Customer Endpoints:**

- `api/customers/[customerId]/index.ts` (NEW)
- `api/customers/[customerId]/programs.ts` (NEW)
- `api/customers/business/[businessId].ts` (NEW)
- `api/customers/enroll.ts` (NEW)

### 3.4 Refactor Client Services

**Files:**

- `src/services/userService.ts` - Add API methods with fallback
- `src/services/customerService.ts` - Add API methods with fallback

**Test Phase 3:**

- User CRUD operations work via API
- Customer management works via API
- Backward compatibility maintained
- Customer dashboard displays correct data
- Business dashboard shows customer list

## Phase 4: Business & Loyalty Services Migration (10-12 hours)

### 4.1 Create Business Server Service

**File: `api/_services/businessServerService.ts` (NEW)**

```typescript
- getBusinessById(businessId): Promise<Business>
- updateBusiness(businessId, updates): Promise<Business>
- getBusinessSettings(businessId): Promise<Settings>
- updateBusinessSettings(businessId, settings): Promise<Settings>
- getBusinessAnalytics(businessId, dateRange): Promise<Analytics>
```

### 4.2 Create Loyalty Program Server Service

**File: `api/_services/loyaltyProgramServerService.ts` (NEW)**

```typescript
- getBusinessPrograms(businessId): Promise<Program[]>
- getProgramById(programId): Promise<Program>
- createProgram(businessId, programData): Promise<Program>
- updateProgram(programId, updates): Promise<Program>
- deleteProgram(programId): Promise<void>
- getProgramCustomers(programId): Promise<Customer[]>
```

### 4.3 Create Loyalty Card Server Service

**File: `api/_services/loyaltyCardServerService.ts` (NEW)**

```typescript
- getCustomerCards(customerId): Promise<Card[]>
- getCardById(cardId): Promise<Card>
- createCard(customerId, programId): Promise<Card>
- updateCardPoints(cardId, points): Promise<Card>
- getCardActivities(cardId): Promise<Activity[]>
```

### 4.4 Create API Endpoints

**Business:**

- `api/business/[businessId]/index.ts` (NEW)
- `api/business/[businessId]/settings.ts` (NEW)
- `api/business/[businessId]/analytics.ts` (NEW)

**Loyalty Programs:**

- `api/loyalty/programs/[programId].ts` (NEW)
- `api/loyalty/programs/list.ts` (NEW)
- `api/loyalty/programs/create.ts` (NEW)

**Loyalty Cards:**

- `api/loyalty/cards/[cardId].ts` (NEW)
- `api/loyalty/cards/customer/[customerId].ts` (NEW)
- `api/loyalty/cards/activities.ts` (NEW)

### 4.5 Refactor Client Services

**Files:**

- `src/services/businessService.ts`
- `src/services/businessSettingsService.ts`
- `src/services/loyaltyProgramService.ts`
- `src/services/loyaltyCardService.ts`

**Test Phase 4:**

- Business dashboard displays correct data
- Program management works
- Card creation and updates work
- Points display correctly in customer dashboard

## Phase 5: Transaction & QR Services Migration (8-10 hours)

### 5.1 Create Transaction Server Service

**File: `api/_services/transactionServerService.ts` (NEW)**

```typescript
- awardPoints(customerId, programId, points, source): Promise<Transaction>
- getTransactions(filters): Promise<Transaction[]>
- getCustomerTransactions(customerId): Promise<Transaction[]>
- redeemReward(customerId, rewardId): Promise<Redemption>
```

### 5.2 Create QR Code Server Service

**File: `api/_services/qrCodeServerService.ts` (NEW)**

```typescript
- processCustomerQrCode(qrData, businessId): Promise<ProcessResult>
- generateCustomerQrCode(customerId): Promise<QrCodeData>
- validateQrCode(qrData): Promise<boolean>
- getQrCodeIntegrity(qrCodeId): Promise<IntegrityCheck>
```

### 5.3 Create API Endpoints

**Transactions:**

- `api/transactions/award-points.ts` (NEW)
- `api/transactions/list.ts` (NEW)
- `api/transactions/customer/[customerId].ts` (NEW)
- `api/transactions/redeem.ts` (NEW)

**QR Codes:**

- `api/qr/process.ts` (NEW)
- `api/qr/generate.ts` (NEW)
- `api/qr/validate.ts` (NEW)
- `api/qr/integrity.ts` (NEW)

### 5.4 Refactor Client Services

**Files:**

- `src/services/transactionService.ts`
- `src/services/qrCodeService.ts`
- `src/services/qrCodeStorageService.ts`
- `src/services/qrCodeIntegrityService.ts`
- `src/services/qrCodeMonitoringService.ts`
- `src/services/userQrCodeService.ts`

**Test Phase 5:**

- QR scanning works in business dashboard
- Points awarded correctly
- Transactions recorded properly
- QR codes generate correctly in customer dashboard

## Phase 6: Notification Services Migration (6-8 hours)

### 6.1 Create Notification Server Service

**File: `api/_services/notificationServerService.ts` (NEW)**

```typescript
- getUserNotifications(userId, filters): Promise<Notification[]>
- createNotification(notificationData): Promise<Notification>
- markAsRead(notificationId): Promise<void>
- deleteNotification(notificationId): Promise<void>
- getUnreadCount(userId): Promise<number>
```

### 6.2 Create Customer Notification Server Service

**File: `api/_services/customerNotificationServerService.ts` (NEW)**

```typescript
- getCustomerNotifications(customerId): Promise<Notification[]>
- sendEnrollmentRequest(customerId, programId): Promise<void>
- respondToEnrollment(notificationId, accept): Promise<void>
- sendPointsNotification(customerId, points, source): Promise<void>
```

### 6.3 Create API Endpoints

- `api/notifications/list.ts` (NEW)
- `api/notifications/[id]/read.ts` (NEW)
- `api/notifications/[id]/delete.ts` (NEW)
- `api/notifications/unread-count.ts` (NEW)
- `api/notifications/customer/[customerId].ts` (NEW)
- `api/notifications/enrollment/request.ts` (NEW)
- `api/notifications/enrollment/respond.ts` (NEW)

### 6.4 Refactor Client Services

**Files:**

- `src/services/notificationService.ts`
- `src/services/customerNotificationService.ts`

**Test Phase 6:**

- Notifications display correctly in all dashboards
- Enrollment requests work
- Real-time notification updates work
- Unread counts accurate

## Phase 7: Remaining Services Migration (10-12 hours)

### 7.1 Create Remaining Server Services

**Files to create:**

- `api/_services/analyticsServerService.ts`
- `api/_services/approvalServerService.ts`
- `api/_services/commentServerService.ts`
- `api/_services/dashboardServerService.ts`
- `api/_services/feedbackServerService.ts`
- `api/_services/locationServerService.ts`
- `api/_services/pageServerService.ts`
- `api/_services/pricingServerService.ts`
- `api/_services/promoServerService.ts`
- `api/_services/securityAuditServerService.ts`
- `api/_services/verificationServerService.ts`
- `api/_services/settingsServerService.ts` (admin, user, customer)
- `api/_services/healthServerService.ts`
- `api/_services/tokenBlacklistServerService.ts`

### 7.2 Create API Endpoints

Create corresponding API endpoints for each server service following the pattern from previous phases.

### 7.3 Refactor Client Services

**Files:**

- `src/services/analyticsService.ts`
- `src/services/analyticsDbService.ts`
- `src/services/businessAnalyticsService.ts`
- `src/services/approvalService.ts`
- `src/services/commentService.ts`
- `src/services/dashboardService.ts`
- `src/services/feedbackService.ts`
- `src/services/locationService.ts`
- `src/services/pageService.ts`
- `src/services/pricingService.ts`
- `src/services/promoService.ts`
- `src/services/securityAuditService.ts`
- `src/services/verificationService.ts`
- `src/services/adminSettingsService.ts`
- `src/services/userSettingsService.ts`
- `src/services/customerSettingsService.ts`
- `src/services/healthService.ts`
- `src/services/tokenBlacklistService.ts`
- `src/services/failedLoginService.ts`

**Test Phase 7:**

- Analytics dashboards work
- Settings pages functional
- All minor features operational

## Phase 8: Dashboard Components Update (6-8 hours)

### 8.1 Update Customer Dashboard Pages

**Files:**

- `src/pages/customer/Dashboard.tsx`
- `src/pages/customer/Cards.tsx`
- `src/pages/customer/LoyaltyCards.tsx`
- `src/pages/customer/QrCard.tsx`
- `src/pages/customer/QrCardPage.tsx`
- `src/pages/customer/Promotions.tsx`
- `src/pages/customer/Settings.tsx`

**Changes:**

- Remove any direct database imports
- Ensure all data fetching uses service layer (which now uses APIs)
- Update error handling for API errors

### 8.2 Update Business Dashboard Pages

**Files:**

- `src/pages/business/Dashboard.tsx`
- `src/pages/business/Customers.tsx`
- `src/pages/business/Programs.tsx`
- `src/pages/business/Promotions.tsx`
- `src/pages/business/QrScanner.tsx`
- `src/pages/business/Analytics.tsx`
- `src/pages/business/Settings.tsx`
- `src/pages/business/Staff.tsx`

**Changes:**

- Remove direct database calls
- Ensure service layer usage
- Update loading and error states

### 8.3 Update Admin Dashboard Pages

**Files:**

- `src/pages/admin/*.tsx` (all admin pages)
- `src/contexts/AdminContext.tsx`

**Changes:**

- Remove database imports
- API-based data fetching
- Enhanced error handling

### 8.4 Update Context Files

**Files:**

- `src/contexts/AuthContext.tsx`
- `src/contexts/CustomerContext.tsx`
- `src/contexts/BusinessContext.tsx`
- `src/contexts/NotificationContext.tsx`

**Changes:**

- Remove database dependencies
- Use API services exclusively
- Maintain backward compatibility temporarily

**Test Phase 8:**

- All customer dashboard pages load and function
- All business dashboard pages load and function
- All admin dashboard pages load and function
- No console errors
- All features operational

## Phase 9: Security Hardening & Cleanup (4-6 hours)

### 9.1 Remove Direct Database Access

**File: `src/utils/db.ts`**

```typescript
// Block all client-side database access
export function throwSecurityError() {
  throw new Error('🚫 SECURITY: Database access from browser not allowed. Use apiClient.');
}
export const sql = throwSecurityError;
export default throwSecurityError;
```

### 9.2 Update Environment Variables

**Files: `.env`, `.env.example`**

- Keep `VITE_DATABASE_URL` with deprecation warning comment
- Ensure `DATABASE_URL` is documented as server-only
- Add all required JWT and security variables

**Vercel Configuration:**

- Update all environment variables in Vercel dashboard
- Ensure no VITE_DATABASE_URL in production (or set to empty with warning)

### 9.3 Add Security Headers

**File: `vercel.json`**

- Ensure all security headers are configured
- Add CSP without unsafe-inline or unsafe-eval
- Add HSTS, X-Frame-Options, etc.

### 9.4 Remove Service Fallbacks

**All Service Files:**

- Remove old database query code
- Remove feature flags
- Keep only API-based implementations
- Clean up imports

### 9.5 Update Dependencies

**File: `package.json`**

- Document that `@neondatabase/serverless` is server-side only
- Add comments about security-critical packages

**Test Phase 9:**

- Build succeeds: `npm run build`
- No database credentials in bundle: `grep -r "VITE_DATABASE_URL" dist/` returns nothing
- Unauthorized API requests return 401
- Authorization properly blocks cross-user access

## Phase 10: Comprehensive Testing (8-10 hours)

### 10.1 Authentication Testing

- [ ] Login with valid credentials works
- [ ] Login with invalid credentials fails properly
- [ ] Registration creates new users
- [ ] Token refresh works
- [ ] Logout clears session
- [ ] Password change works
- [ ] Rate limiting blocks excessive attempts

### 10.2 Customer Dashboard Testing

- [ ] Dashboard loads with correct data
- [ ] Loyalty cards display correctly
- [ ] QR code generates and displays
- [ ] Points balance accurate
- [ ] Transaction history shows
- [ ] Enrollment in programs works
- [ ] Notifications display and update
- [ ] Settings page functional

### 10.3 Business Dashboard Testing

- [ ] Dashboard loads with analytics
- [ ] Customer list displays correctly
- [ ] QR scanner processes codes
- [ ] Points awarding works
- [ ] Program creation/editing works
- [ ] Promotion management works
- [ ] Customer enrollment works
- [ ] Analytics charts display data
- [ ] Settings page functional
- [ ] Staff management works

### 10.4 Admin Dashboard Testing

- [ ] User management works
- [ ] Business management works
- [ ] System analytics display
- [ ] Settings management works
- [ ] All admin functions operational

### 10.5 Security Testing

- [ ] No database credentials in frontend bundle
- [ ] Unauthorized requests blocked (401)
- [ ] Cross-user access blocked (403)
- [ ] SQL injection attempts fail
- [ ] Rate limiting works
- [ ] Input validation catches bad data
- [ ] All endpoints require authentication
- [ ] Role-based access control works

### 10.6 Performance Testing

- [ ] All API endpoints < 500ms response time
- [ ] Dashboards load within 3 seconds
- [ ] No memory leaks
- [ ] WebSocket connections stable
- [ ] No excessive API calls

### 10.7 Error Handling Testing

- [ ] Network errors handled gracefully
- [ ] API errors show user-friendly messages
- [ ] Validation errors display correctly
- [ ] Loading states show properly
- [ ] Fallbacks work when needed

## Migration Completion Checklist

### Code Changes

- [ ] All 42 services migrated to API architecture
- [ ] All server services created in `api/_services/`
- [ ] All API endpoints created and secured
- [ ] All client services refactored to use APIs
- [ ] All dashboard components updated
- [ ] Direct database access blocked in client

### Security

- [ ] Authentication on all API endpoints
- [ ] Authorization checks implemented
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] No database credentials in frontend
- [ ] VITE_* database variables removed from production
- [ ] Security headers configured

### Testing

- [ ] All 3 dashboards fully functional
- [ ] All features tested and working
- [ ] Security vulnerabilities addressed
- [ ] Performance meets requirements
- [ ] Error handling comprehensive

### Documentation

- [ ] API endpoints documented
- [ ] Migration notes recorded
- [ ] Environment variable guide updated
- [ ] Deployment instructions ready

### Deployment

- [ ] Development environment working
- [ ] Staging environment tested
- [ ] Production environment ready
- [ ] Rollback plan prepared
- [ ] Monitoring configured

## Timeline

- Phase 1: 4-6 hours
- Phase 2: 6-8 hours
- Phase 3: 8-10 hours
- Phase 4: 10-12 hours
- Phase 5: 8-10 hours
- Phase 6: 6-8 hours
- Phase 7: 10-12 hours
- Phase 8: 6-8 hours
- Phase 9: 4-6 hours
- Phase 10: 8-10 hours

**Total Estimated Time: 70-90 hours (9-12 work days)**

## Key Principles

1. **Backward Compatibility**: Services work with both old and new methods during migration
2. **Phased Testing**: Test after each phase before proceeding
3. **Security First**: All API endpoints secured from day one
4. **Fail Safe**: Keep VITE_DATABASE_URL as fallback until all testing complete
5. **Comprehensive Testing**: Test all features in all 3 dashboards before declaring success

### To-dos

- [x] Phase 1: Enhance infrastructure (API client, auth middleware, rate limiting, validation)
- [x] Phase 2: Migrate authentication service with backward compatibility
- [x] Phase 3: Migrate user and customer services with testing
- [x] Phase 4: Migrate business and loyalty services with testing
- [x] Phase 5: Migrate transaction and QR code services with testing
- [x] Phase 6: Migrate notification services with testing
- [x] Phase 7: Migrate remaining 18 services (analytics, settings, etc)
- [x] Phase 8: Update all dashboard components and contexts
- [x] Phase 9: Security hardening, remove fallbacks, block client DB access
- [x] Phase 10: Comprehensive testing of all 3 dashboards and security validation
- [x] Phase 11: Implemented catch-all routing to consolidate 54 functions into 10, staying well within the 12 serverless function limit (see .cursor/plans/phase-11-completion-report.md)