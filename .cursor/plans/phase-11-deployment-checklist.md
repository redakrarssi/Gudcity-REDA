# Phase 11: Post-Deployment Verification Checklist

## Pre-Deployment Verification ✅

- [x] Catch-all handlers implemented with all routes
- [x] Rate limiting enabled (240 req/min)
- [x] Authentication middleware integrated
- [x] Database connection pooling configured
- [x] Error handling comprehensive
- [x] 44 redundant files deleted
- [x] vercel.json updated with 10 functions
- [x] Documentation complete
- [x] Function count verified: 10/12 ✅

## Deployment Steps

### 1. Commit Changes
```bash
git add .
git commit -m "Phase 11: Consolidate to 10 serverless functions via catch-all routing"
git push origin main
```

### 2. Deploy to Staging
```bash
# Vercel will auto-deploy on push to main
# Or manually trigger:
vercel --prod
```

### 3. Verify Deployment
- Check Vercel dashboard shows exactly 10 functions
- Verify build completed successfully
- Check no deployment errors

## Post-Deployment Testing

### Authentication Endpoints

#### 1. Login (Dedicated Function)
```bash
# ✅ Should return 200 with token
curl -X POST https://your-domain.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Expected: {"token": "...", "user": {...}}
```

#### 2. Register (Dedicated Function)
```bash
# ✅ Should return 201 with token
curl -X POST https://your-domain.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "new@example.com", "password": "password123", "name": "New User"}'

# Expected: {"token": "...", "user": {...}}
```

#### 3. Change Password (Catch-All)
```bash
# ✅ Should return 200
curl -X POST https://your-domain.vercel.app/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"oldPassword": "old", "newPassword": "new"}'

# Expected: {"success": true, "message": "Password changed"}
```

#### 4. Logout (Catch-All)
```bash
# ✅ Should return 200
curl -X POST https://your-domain.vercel.app/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: {"success": true, "message": "Logged out"}
```

#### 5. Token Refresh (Catch-All)
```bash
# ✅ Should return 200 with new token
curl -X POST https://your-domain.vercel.app/api/auth/refresh \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: {"token": "new_token"}
```

**Status**: [ ] All auth endpoints working

---

### Customer Endpoints (Catch-All)

#### 1. Get Customer Cards
```bash
curl -H "Authorization: Bearer CUSTOMER_TOKEN" \
  https://your-domain.vercel.app/api/customers/123/cards

# Expected: {"cards": [...]}
```

#### 2. Get Customer Programs
```bash
curl -H "Authorization: Bearer CUSTOMER_TOKEN" \
  https://your-domain.vercel.app/api/customers/123/programs

# Expected: {"programs": [...]}
```

#### 3. Enroll Customer
```bash
curl -X POST https://your-domain.vercel.app/api/customers?businessId=456&programId=789 \
  -H "Authorization: Bearer BUSINESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customerId": "123", "action": "enroll"}'

# Expected: {"card": {...}, "message": "Customer enrolled successfully"}
```

**Status**: [ ] Customer endpoints working

---

### Business Endpoints (Business Catch-All)

#### 1. Business Analytics
```bash
curl -H "Authorization: Bearer BUSINESS_TOKEN" \
  https://your-domain.vercel.app/api/business/456/analytics

# Expected: {"totalPoints": 1000, "totalRedemptions": 50, ...}
```

#### 2. Business Settings (GET)
```bash
curl -H "Authorization: Bearer BUSINESS_TOKEN" \
  https://your-domain.vercel.app/api/business/456/settings

# Expected: {"profile": {...}, "settings": {...}}
```

#### 3. Business Settings (PUT)
```bash
curl -X PUT https://your-domain.vercel.app/api/business/456/settings \
  -H "Authorization: Bearer BUSINESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profile": {"business_name": "New Name"}}'

# Expected: {"profile": {...}, "settings": {...}}
```

#### 4. Business Notifications
```bash
curl -H "Authorization: Bearer BUSINESS_TOKEN" \
  https://your-domain.vercel.app/api/business/456/notifications

# Expected: {"notifications": [...]}
```

**Status**: [ ] Business endpoints working

---

### Loyalty Endpoints (Main Catch-All)

#### 1. Get Loyalty Cards
```bash
curl -H "Authorization: Bearer CUSTOMER_TOKEN" \
  "https://your-domain.vercel.app/api/loyalty/cards?customerId=123"

# Expected: {"cards": [...]}
```

#### 2. Award Points to Card
```bash
curl -X POST https://your-domain.vercel.app/api/loyalty/cards \
  -H "Authorization: Bearer BUSINESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cardId": "789", "points": 100, "description": "Purchase", "source": "POS"}'

# Expected: {"success": true, "card": {...}, "message": "100 points awarded successfully"}
```

**Status**: [ ] Loyalty endpoints working

---

### Transaction Endpoints (Main Catch-All)

#### 1. Get Transactions
```bash
curl -H "Authorization: Bearer CUSTOMER_TOKEN" \
  "https://your-domain.vercel.app/api/transactions?customerId=123"

# Expected: {"transactions": [...]}
```

#### 2. Award Points
```bash
curl -X POST https://your-domain.vercel.app/api/transactions \
  -H "Authorization: Bearer BUSINESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "award", "customerId": "123", "businessId": "456", "programId": "789", "points": 50}'

# Expected: {"success": true, "points": 50, "message": "Points awarded successfully"}
```

#### 3. Redeem Points
```bash
curl -X POST https://your-domain.vercel.app/api/transactions \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "redeem", "customerId": "123", "businessId": "456", "programId": "789", "points": 25}'

# Expected: {"success": true, "points": 25, "message": "Points redeemed successfully"}
```

**Status**: [ ] Transaction endpoints working

---

### QR Code Endpoints (Main Catch-All)

#### 1. Generate QR Code
```bash
curl -X POST https://your-domain.vercel.app/api/qr/generate \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "customer", "customerId": "123"}'

# Expected: {"success": true, "qrData": {...}}
```

#### 2. Validate QR Code
```bash
curl -X POST https://your-domain.vercel.app/api/qr/validate \
  -H "Authorization: Bearer BUSINESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qrData": {...}, "businessId": "456"}'

# Expected: {"valid": true, "message": "QR code is valid"}
```

#### 3. QR Scan Log
```bash
curl -X POST https://your-domain.vercel.app/api/qr/scan \
  -H "Authorization: Bearer BUSINESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qrData": {...}, "businessId": "456", "customerId": "123", "points": 10}'

# Expected: {"success": true, "scanLogId": 999}
```

**Status**: [ ] QR endpoints working

---

### Notification Endpoints (Main Catch-All)

#### 1. Get Notifications
```bash
curl -H "Authorization: Bearer CUSTOMER_TOKEN" \
  "https://your-domain.vercel.app/api/notifications?customerId=123"

# Expected: {"notifications": [...]}
```

#### 2. Create Notification
```bash
curl -X POST https://your-domain.vercel.app/api/notifications \
  -H "Authorization: Bearer BUSINESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "123", "business_id": "456", "type": "POINTS_AWARDED", "title": "Points Earned", "message": "You earned 10 points"}'

# Expected: {"notification": {...}}
```

#### 3. Mark as Read
```bash
curl -X PUT "https://your-domain.vercel.app/api/notifications?notificationId=999" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_read": true}'

# Expected: {"notification": {...}}
```

**Status**: [ ] Notification endpoints working

---

### Analytics Endpoints (Analytics Catch-All)

#### 1. Points Analytics
```bash
curl -H "Authorization: Bearer BUSINESS_TOKEN" \
  "https://your-domain.vercel.app/api/analytics/points?businessId=456"

# Expected: {"totalPoints": 5000}
```

#### 2. Redemptions Analytics
```bash
curl -H "Authorization: Bearer BUSINESS_TOKEN" \
  "https://your-domain.vercel.app/api/analytics/redemptions?businessId=456&type=popular"

# Expected: {"popularRewards": [...]}
```

#### 3. Customer Analytics
```bash
curl -H "Authorization: Bearer BUSINESS_TOKEN" \
  "https://your-domain.vercel.app/api/analytics/customers?businessId=456&type=active"

# Expected: {"activeCustomers": 250}
```

#### 4. Engagement Analytics
```bash
curl -H "Authorization: Bearer BUSINESS_TOKEN" \
  "https://your-domain.vercel.app/api/analytics/engagement?businessId=456"

# Expected: {"customerEngagement": [{date: "2025-10-22", value: 100}, ...]}
```

**Status**: [ ] Analytics endpoints working

---

### Dashboard Endpoints

#### 1. Dashboard Stats (Main Catch-All)
```bash
# Customer Dashboard
curl -H "Authorization: Bearer CUSTOMER_TOKEN" \
  "https://your-domain.vercel.app/api/dashboard/stats?type=customer&customerId=123"

# Business Dashboard
curl -H "Authorization: Bearer BUSINESS_TOKEN" \
  "https://your-domain.vercel.app/api/dashboard/stats?type=business&businessId=456"

# Admin Dashboard
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "https://your-domain.vercel.app/api/dashboard/stats?type=admin"
```

#### 2. Admin Dashboard Stats (Dedicated Function)
```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  https://your-domain.vercel.app/api/admin/dashboard-stats

# Expected: {"totalUsers": 1000, "totalBusinesses": 50, ...}
```

**Status**: [ ] Dashboard endpoints working

---

### User Endpoints

#### 1. Get User by ID (Dedicated Function)
```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  https://your-domain.vercel.app/api/users/123

# Expected: {"user": {...}}
```

#### 2. Get User by Email (Dedicated Function)
```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "https://your-domain.vercel.app/api/users/by-email?email=test@example.com"

# Expected: {"user": {...}}
```

#### 3. List Users (Catch-All)
```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  https://your-domain.vercel.app/api/users

# Expected: {"users": [...]}
```

#### 4. Search Users (Catch-All)
```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "https://your-domain.vercel.app/api/users/search?query=john"

# Expected: {"users": [...]}
```

**Status**: [ ] User endpoints working

---

### Program Management (Main Catch-All)

#### 1. List Programs
```bash
curl -H "Authorization: Bearer BUSINESS_TOKEN" \
  "https://your-domain.vercel.app/api/businesses/programs?businessId=456"

# Expected: {"programs": [...]}
```

#### 2. Create Program
```bash
curl -X POST "https://your-domain.vercel.app/api/businesses/programs?businessId=456" \
  -H "Authorization: Bearer BUSINESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "VIP Program", "description": "For loyal customers", "pointsPerDollar": 10}'

# Expected: {"program": {...}}
```

#### 3. Update Program
```bash
curl -X PUT "https://your-domain.vercel.app/api/businesses/programs?businessId=456&programId=789" \
  -H "Authorization: Bearer BUSINESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated VIP Program", "isActive": true}'

# Expected: {"program": {...}}
```

#### 4. Delete Program
```bash
curl -X DELETE "https://your-domain.vercel.app/api/businesses/programs?businessId=456&programId=789" \
  -H "Authorization: Bearer BUSINESS_TOKEN"

# Expected: {"message": "Program deactivated successfully"}
```

**Status**: [ ] Program endpoints working

---

## Performance Testing

### 1. Response Time Check
```bash
# Should be < 500ms for most endpoints
curl -w "\nTime: %{time_total}s\n" -o /dev/null -s \
  -H "Authorization: Bearer TOKEN" \
  https://your-domain.vercel.app/api/dashboard/stats?type=customer&customerId=123
```

**Target**: < 500ms average  
**Status**: [ ] Performance acceptable

### 2. Rate Limiting Check
```bash
# Test rate limit (240 req/min)
for i in {1..250}; do
  curl -s https://your-domain.vercel.app/api/promotions > /dev/null &
done
wait

# Should see some 429 errors
```

**Expected**: 429 errors after ~240 requests  
**Status**: [ ] Rate limiting working

### 3. Cold Start Test
```bash
# Test cold start by waiting 5 minutes then calling endpoint
sleep 300
time curl -H "Authorization: Bearer TOKEN" \
  https://your-domain.vercel.app/api/dashboard/stats?type=customer&customerId=123
```

**Target**: < 2 seconds for cold start  
**Status**: [ ] Cold start acceptable

---

## Monitoring

### 1. Vercel Dashboard Checks

- [ ] Function count shows exactly 10
- [ ] No 404 errors on existing routes
- [ ] No 500 errors in logs
- [ ] Function invocations distributed as expected
- [ ] Memory usage within allocated limits
- [ ] No timeout errors

### 2. Error Monitoring

Check Vercel logs for:
- [ ] No "Function not found" errors
- [ ] No "Route not found" errors  
- [ ] Authentication errors are expected (401s for invalid tokens)
- [ ] Authorization errors are expected (403s for forbidden access)
- [ ] No unexpected 500 errors

### 3. Usage Patterns

Monitor for 24-48 hours:
- [ ] Most traffic goes through catch-all handlers
- [ ] Auth endpoints show high usage
- [ ] No performance degradation over time
- [ ] Error rate < 0.1%

---

## Rollback Procedure

If critical issues arise:

### 1. Immediate Rollback
```bash
# Revert git commit
git revert HEAD
git push origin main

# Or rollback in Vercel dashboard
# Go to Deployments → Select previous deployment → Promote to Production
```

### 2. Identify Issue
- Check Vercel function logs
- Identify which routes are failing
- Check error messages

### 3. Selective Restoration
If specific routes need to be restored as individual functions:
```bash
# Restore file from git history
git checkout HEAD~1 -- api/path/to/endpoint.ts

# Update vercel.json to include the function
# Commit and deploy
```

---

## Success Criteria

All items below must be checked before considering deployment successful:

### Critical Checks ✅
- [ ] All authentication endpoints working (5/5)
- [ ] Customer dashboard loading correctly
- [ ] Business dashboard loading correctly
- [ ] Admin dashboard loading correctly
- [ ] Points can be awarded successfully
- [ ] QR code generation/validation working
- [ ] No 404 errors on existing routes
- [ ] No unexpected 500 errors
- [ ] Vercel shows exactly 10 functions

### Performance Checks ⚡
- [ ] Average response time < 500ms
- [ ] Cold start < 2 seconds
- [ ] Rate limiting active (429 after 240 req/min)
- [ ] No timeout errors

### Monitoring Checks 📊
- [ ] Error rate < 0.1%
- [ ] No memory limit exceeded errors
- [ ] Function invocations as expected
- [ ] No deployment warnings in Vercel

---

## Final Sign-Off

- [ ] All critical endpoints tested and working
- [ ] Performance meets requirements
- [ ] Monitoring shows healthy metrics
- [ ] Documentation updated
- [ ] Team notified of changes

**Deployment Status**: ⬜ Pending / ⬜ In Progress / ⬜ Complete ✅

**Signed Off By**: ________________  
**Date**: ________________  
**Notes**: ________________

---

## Support Contacts

- **Documentation**: `.cursor/plans/phase-11-serverless-optimization.md`
- **Developer Guide**: `api/CATCH-ALL-ROUTING-GUIDE.md`
- **Completion Report**: `.cursor/plans/phase-11-completion-report.md`
- **Quick Summary**: `PHASE-11-SUMMARY.md`

