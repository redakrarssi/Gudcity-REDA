# 🔒 Production API Migration Plan

## Status: IN PROGRESS
**Date:** October 18, 2025
**Serverless Function Limit:** 12 functions (Currently using 9)

---

## 📊 Current Serverless Functions (9/12)

1. `api/auth/login.ts`
2. `api/auth/register.ts`
3. `api/auth/generate-tokens.ts`
4. `api/db/initialize.ts`
5. `api/users/by-email.ts`
6. `api/users/[id].ts`
7. `api/admin/dashboard-stats.ts`
8. `api/business/[businessId]/[[...segments]].ts`
9. `api/[[...segments]].ts` ✅ **CATCH-ALL HANDLER**

**Available:** 3 more functions

---

## ✅ Already Implemented in Catch-All Handler

The `api/[[...segments]].ts` already handles:
- ✅ `/api/promotions` - GET promotions
- ✅ `/api/pages/:slug` - GET page content
- ✅ `/api/dashboard/stats` - GET dashboard stats (admin/business/customer)
- ✅ `/api/users` - GET/POST users
- ✅ `/api/customers` - GET/POST customers + enrollment
- ✅ `/api/customers/:customerId/cards` - GET loyalty cards
- ✅ `/api/customers/:customerId/programs` - GET enrolled programs
- ✅ `/api/notifications` - GET/POST/PUT notifications
- ✅ `/api/loyalty/cards` - GET/POST loyalty cards + award points
- ✅ `/api/businesses/programs` - GET/POST/PUT/DELETE programs

---

## ❌ Services Still Making Direct Database Calls

### Critical Services (41 total):
1. ❌ `authService.ts` - Authentication, password hashing, rate limiting
2. ❌ `loyaltyCardService.ts` - Card management, points operations
3. ❌ `qrCodeService.ts` - QR generation, validation, scanning
4. ❌ `transactionService.ts` - Point transactions, awarding
5. ❌ `approvalService.ts` - Approval management
6. ❌ `verificationService.ts` - User verification
7. ❌ `businessService.ts` - Business operations
8. ❌ `loyaltyProgramService.ts` - Program management
9. ❌ `customerService.ts` - Customer operations
10. ❌ `pageService.ts` - Page content
11. ❌ `userService.ts` - User operations
12. ❌ `locationService.ts` - Location services
13. ❌ `securityAuditService.ts` - Security logging
14. ❌ `notificationService.ts` - Notifications
15. ❌ `businessSettingsService.ts` - Business settings
16. ❌ `businessAnalyticsService.ts` - Analytics
17. ❌ `userQrCodeService.ts` - User QR codes
18. ❌ `customerNotificationService.ts` - Customer notifications
19. ❌ `tokenBlacklistService.ts` - Token management
20. ❌ `userSettingsService.ts` - User settings
21. ❌ `qrCodeStorageService.ts` - QR storage
22. ❌ `qrCodeIntegrityService.ts` - QR integrity
23. ❌ `pricingService.ts` - Pricing
24. ❌ `failedLoginService.ts` - Failed login tracking
25. ❌ `qrCodeMonitoringService.ts` - QR monitoring
26. ❌ `healthService.ts` - Health checks
27. ❌ `customerSettingsService.ts` - Customer settings
28. ❌ `commentService.ts` - Comments
29. ❌ `analyticsService.ts` - Analytics
30. ❌ `analyticsDbService.ts` - Analytics DB
31. ❌ `adminSettingsService.ts` - Admin settings
32. ❌ Plus duplicate/backup files

---

## 🎯 Missing API Endpoints (To Add to Catch-All)

### 1. QR Code Operations
- POST `/api/qr/generate` - Generate QR code
- POST `/api/qr/validate` - Validate QR code
- POST `/api/qr/scan` - Log QR scan
- GET `/api/qr/stats` - QR statistics

### 2. Transaction Operations
- POST `/api/transactions/award` - Award points
- POST `/api/transactions/redeem` - Redeem points
- GET `/api/transactions` - Get transactions

### 3. Approvals Management
- GET `/api/approvals` - List approvals
- PUT `/api/approvals/:id` - Update approval status
- GET `/api/approvals/pending` - Pending approvals

### 4. Business Settings
- GET `/api/business/:id/settings` - Get settings
- PUT `/api/business/:id/settings` - Update settings

### 5. Analytics Endpoints
- GET `/api/analytics/business/:id` - Business analytics
- GET `/api/analytics/customer/:id` - Customer analytics
- GET `/api/analytics/points` - Points analytics

### 6. Security Audit
- POST `/api/security/audit` - Log security event
- GET `/api/security/logs` - Get security logs

### 7. Token Management
- POST `/api/tokens/blacklist` - Blacklist token
- GET `/api/tokens/verify` - Verify token

### 8. User Settings
- GET `/api/users/:id/settings` - Get user settings
- PUT `/api/users/:id/settings` - Update user settings

---

## 🛠️ Implementation Strategy

### Phase 1: Enhance Catch-All Handler ✅
**Goal:** Add all missing API endpoints to `api/[[...segments]].ts`
**Status:** IN PROGRESS

Routes to add:
1. QR code operations (generate, validate, scan, stats)
2. Transaction operations (award, redeem, list)
3. Approvals (list, update, pending)
4. Business settings (get, update)
5. Analytics (business, customer, points)
6. Security audit (log, get logs)
7. Token management (blacklist, verify)
8. User settings (get, update)

### Phase 2: Enhance ProductionSafeService ✅
**Goal:** Add methods for all new endpoints
**File:** `src/utils/productionApiClient.ts`

Add methods for:
- QR operations
- Transactions
- Approvals
- Settings
- Analytics
- Security
- Token management

### Phase 3: Update Critical Services 🔄
**Goal:** Make services use ProductionSafeService in production

Priority order:
1. ✅ authService.ts - Use API for validation
2. ✅ qrCodeService.ts - Use API for QR operations
3. ✅ transactionService.ts - Use API for transactions
4. ✅ loyaltyCardService.ts - Use API for card operations
5. ✅ approvalService.ts - Use API for approvals

### Phase 4: Update Remaining Services 🔄
**Goal:** Migrate all other services

Services:
- verificationService.ts
- businessSettingsService.ts
- analyticsServices (all variants)
- userSettingsService.ts
- securityAuditService.ts
- And remaining 25+ services

### Phase 5: Enforce Production Security 🔒
**Goal:** Block all direct database access in production

1. Update `src/utils/db.ts` - Strict production blocking
2. Update `src/main.tsx` - No DB init in browser
3. Update `src/utils/initDb.ts` - Server-only initialization
4. Remove `VITE_DATABASE_URL` from production environment

### Phase 6: Testing & Documentation 📝
**Goal:** Verify everything works and document

1. Test all API endpoints
2. Verify serverless function count ≤ 12
3. Test production deployment
4. Create deployment guide

---

## 🔒 Security Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Database Credentials** | Exposed in browser bundle | Hidden on server only |
| **SQL Injection Risk** | High (client can modify) | Low (server validates) |
| **Data Access Control** | None | Enforced by backend |
| **Rate Limiting** | Impossible | Enforced |
| **Audit Logging** | Impossible | Complete |
| **CVSS Score** | CRITICAL (9.8) | LOW (2.0) |

---

## 📋 Deployment Checklist

- [ ] All services use ProductionSafeService
- [ ] Catch-all handler has all endpoints
- [ ] Database access blocked in production
- [ ] No VITE_DATABASE_URL in production
- [ ] Serverless functions ≤ 12
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Production environment variables set
- [ ] Database initialized on server
- [ ] API authentication working

---

## 🚀 Next Steps

1. **Complete catch-all handler** - Add missing endpoints
2. **Enhance ProductionSafeService** - Add all methods
3. **Update services** - Use API in production
4. **Block direct DB access** - Enforce security
5. **Test & deploy** - Verify everything works

---

**Last Updated:** October 18, 2025
**Status:** Phase 1 & 2 in progress

