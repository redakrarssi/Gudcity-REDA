# Customer Dashboard API Connectivity - Complete Mapping
**Date**: October 24, 2025  
**Function Limit**: 10/12 ✅  
**Strategy**: All routes through catch-all handlers

---

## 🎯 Customer Dashboard Components & API Needs

### 1. **Dashboard (Home)** - `/customer/dashboard`
**Components**: `src/pages/customer/Dashboard.tsx`

#### Data Requirements:
- ✅ User profile data
- ✅ Enrolled programs (top 3)
- ✅ Total points across all programs
- ✅ Available promotions (top 3)
- ✅ Unread notifications count
- ✅ QR code for scanning

#### API Endpoints Used:
```typescript
GET /api/customers/{id}/programs          // ✅ EXISTS in catch-all
GET /api/promotions                        // ✅ EXISTS in catch-all
GET /api/notifications?customerId={id}&unread=true  // ✅ EXISTS in catch-all
GET /api/users/{id}                        // ✅ EXISTS (dedicated function)
```

---

### 2. **Cards Page** - `/customer/cards`
**Components**: `src/pages/customer/Cards.tsx`, `src/components/customer/LoyaltyCard.tsx`

#### Data Requirements:
- ✅ All loyalty cards for customer
- ✅ Card details (points, tier, status)
- ✅ Program information
- ✅ Business information
- ✅ Available rewards per card
- ✅ Recent transactions per card

#### API Endpoints Used:
```typescript
GET /api/loyalty/cards/customer/{id}      // ✅ EXISTS in catch-all
GET /api/customers/{id}/programs          // ✅ EXISTS in catch-all
GET /api/transactions?customerId={id}     // ⚠️ NEEDS ADDITION to catch-all
POST /api/customers/reward-tiers          // ⚠️ NEEDS ADDITION to catch-all
```

---

### 3. **Promotions Page** - `/customer/promotions`
**Components**: `src/pages/customer/Promotions.tsx`, `src/components/customer/PromoWallet.tsx`

#### Data Requirements:
- ✅ All available promotions
- ✅ Active promo codes
- ✅ Promo code usage history
- ✅ Promo expiration dates

#### API Endpoints Used:
```typescript
GET /api/promotions                        // ✅ EXISTS in catch-all
GET /api/promotions?businessId={id}        // ✅ EXISTS in catch-all
POST /api/promotions/redeem                // ⚠️ NEEDS ADDITION to catch-all
```

---

### 4. **QR Card Page** - `/customer/qr-card`
**Components**: `src/pages/customer/QrCard.tsx`, `src/components/QRCard.tsx`

#### Data Requirements:
- ✅ Customer primary QR code
- ✅ QR code image/data
- ✅ Customer profile info
- ✅ Enrolled programs count
- ✅ Total points

#### API Endpoints Used:
```typescript
GET /api/customers/{id}/qr-code            // ⚠️ NEEDS ADDITION to catch-all
GET /api/customers/{id}/programs          // ✅ EXISTS in catch-all
GET /api/users/{id}                        // ✅ EXISTS (dedicated)
```

---

### 5. **Notifications** - Sidebar/Modal
**Components**: `src/components/customer/NotificationList.tsx`

#### Data Requirements:
- ✅ All notifications for customer
- ✅ Unread notifications
- ✅ Notification types (enrollment, points, redemption)
- ✅ Mark as read functionality
- ✅ Delete notifications

#### API Endpoints Used:
```typescript
GET /api/notifications?customerId={id}           // ✅ EXISTS in catch-all
GET /api/notifications?customerId={id}&unread=true  // ✅ EXISTS in catch-all
PUT /api/notifications                            // ✅ EXISTS in catch-all (update status)
DELETE /api/notifications/{id}                    // ⚠️ NEEDS ADDITION to catch-all
POST /api/notifications/approval/respond          // ⚠️ NEEDS ADDITION to catch-all
```

---

### 6. **Transaction History** - Modal/Page
**Components**: `src/components/customer/TransactionHistory.tsx`

#### Data Requirements:
- ✅ All transactions for customer
- ✅ Transaction type (award, redeem)
- ✅ Points amounts
- ✅ Timestamps
- ✅ Related business/program

#### API Endpoints Used:
```typescript
GET /api/transactions?customerId={id}      // ⚠️ NEEDS ADDITION to catch-all
GET /api/transactions?cardId={id}          // ⚠️ NEEDS ADDITION to catch-all
```

---

### 7. **Settings Page** - `/customer/settings`
**Components**: `src/pages/customer/Settings.tsx`

#### Data Requirements:
- ✅ User profile (name, email, phone)
- ✅ Notification preferences
- ✅ Language preference
- ✅ Currency preference

#### API Endpoints Used:
```typescript
GET /api/users/{id}                        // ✅ EXISTS (dedicated)
PUT /api/users/{id}                        // ✅ EXISTS (dedicated)
GET /api/users/{id}/settings               // ⚠️ NEEDS ADDITION to catch-all
PUT /api/users/{id}/settings               // ⚠️ NEEDS ADDITION to catch-all
```

---

## 🔧 Missing Routes to Add to Catch-All

### Required Additions to `api/[[...segments]].ts`:

#### 1. Transactions (GET)
```typescript
// Route: GET /api/transactions?customerId={id}
if (segments.length === 1 && segments[0] === 'transactions' && req.method === 'GET') {
  const { customerId, cardId, limit = 50 } = req.query;
  // Authorization check + SQL query
}
```

#### 2. Reward Tiers (POST - batch fetch)
```typescript
// Route: POST /api/customers/reward-tiers
if (segments.length === 2 && segments[0] === 'customers' && segments[1] === 'reward-tiers' && req.method === 'POST') {
  const { programIds } = req.body;
  // Batch fetch reward tiers for multiple programs
}
```

#### 3. Customer QR Code (GET)
```typescript
// Route: GET /api/customers/{id}/qr-code
if (segments.length === 3 && segments[0] === 'customers' && segments[2] === 'qr-code' && req.method === 'GET') {
  const customerId = segments[1];
  // Fetch or generate customer QR code
}
```

#### 4. Promo Redemption (POST)
```typescript
// Route: POST /api/promotions/redeem
if (segments.length === 2 && segments[0] === 'promotions' && segments[1] === 'redeem' && req.method === 'POST') {
  const { promoCode, customerId } = req.body;
  // Validate and apply promo code
}
```

#### 5. Notification Delete (DELETE)
```typescript
// Route: DELETE /api/notifications/{id}
if (segments.length === 2 && segments[0] === 'notifications' && req.method === 'DELETE') {
  const notificationId = segments[1];
  // Soft delete notification
}
```

#### 6. Approval Response (POST)
```typescript
// Route: POST /api/notifications/approval/respond
if (segments.length === 3 && segments[0] === 'notifications' && segments[1] === 'approval' && segments[2] === 'respond') {
  const { requestId, approved } = req.body;
  // Handle enrollment approval response
}
```

#### 7. User Settings (GET/PUT)
```typescript
// Route: GET/PUT /api/users/{id}/settings
if (segments.length === 3 && segments[0] === 'users' && segments[2] === 'settings') {
  const userId = segments[1];
  // GET: Return settings, PUT: Update settings
}
```

---

## 📊 Complete Endpoint Inventory

### ✅ Already Implemented (Working):
1. `GET /api/customers/{id}/programs` - Customer enrolled programs
2. `GET /api/promotions` - Available promotions  
3. `GET /api/notifications` - Customer notifications
4. `PUT /api/notifications` - Update notification status
5. `POST /api/notifications` - Create notification
6. `GET /api/loyalty/cards/customer/{id}` - Customer cards
7. `GET /api/users/{id}` - User profile
8. `PUT /api/users/{id}` - Update user
9. `GET /api/security/audit` - Security logs (admin)
10. `POST /api/security/audit` - Log security event

### ⚠️ Needs Implementation (7 routes):
1. `GET /api/transactions` - Transaction history
2. `POST /api/customers/reward-tiers` - Batch fetch reward tiers
3. `GET /api/customers/{id}/qr-code` - Customer QR code
4. `POST /api/promotions/redeem` - Redeem promo code
5. `DELETE /api/notifications/{id}` - Delete notification
6. `POST /api/notifications/approval/respond` - Respond to approval
7. `GET/PUT /api/users/{id}/settings` - User settings

---

## 🎯 Implementation Priority

### High Priority (Required for Basic Functionality):
1. ✅ **Transactions** - Cards page needs transaction history
2. ✅ **Reward Tiers** - Enrolled programs need reward info
3. ✅ **Customer QR Code** - QR card page needs customer QR

### Medium Priority (Enhanced Functionality):
4. **Approval Response** - Enrollment acceptance/rejection
5. **Notification Delete** - Clean up old notifications
6. **User Settings** - Preferences management

### Low Priority (Nice to Have):
7. **Promo Redemption** - Promo code application

---

## 🔒 Security Requirements (All Routes)

Every route MUST implement:
- ✅ Authentication via `verifyAuth(req)`
- ✅ Authorization checks (user can only access own data or admin)
- ✅ Rate limiting (already at handler level)
- ✅ Input validation
- ✅ SQL injection prevention (parameterized queries)
- ✅ Error logging
- ✅ CORS handling

---

## 📈 Function Count Status

**Current**: 10/12 functions  
**After additions**: 10/12 functions (all in catch-all)  
**Buffer**: 2 functions remaining ✅

All 7 new routes will be added to the existing `api/[[...segments]].ts` catch-all handler, maintaining our function limit compliance.

---

## 🧪 Testing Checklist

After implementation, test each endpoint:

### Transactions
- [ ] `GET /api/transactions?customerId=4` returns transactions
- [ ] `GET /api/transactions?cardId=123` returns card transactions
- [ ] Response includes: id, type, points, timestamp, business/program

### Reward Tiers
- [ ] `POST /api/customers/reward-tiers` with programIds array
- [ ] Returns reward tiers grouped by program ID
- [ ] Handles empty programIds gracefully

### Customer QR Code
- [ ] `GET /api/customers/4/qr-code` returns QR code data/image
- [ ] Generates new QR if none exists
- [ ] Returns existing QR if already created

### Approval Response
- [ ] `POST /api/notifications/approval/respond` accepts/rejects enrollment
- [ ] Creates loyalty card on acceptance
- [ ] Notifies business of decision

### Notification Delete
- [ ] `DELETE /api/notifications/123` soft deletes notification
- [ ] Only owner or admin can delete
- [ ] Returns success confirmation

### User Settings
- [ ] `GET /api/users/4/settings` returns preferences
- [ ] `PUT /api/users/4/settings` updates preferences
- [ ] Validates setting values before update

### Promo Redemption
- [ ] `POST /api/promotions/redeem` validates promo code
- [ ] Applies discount/reward to customer
- [ ] Tracks redemption history

---

## 🚀 Deployment Steps

1. ✅ Add 7 new routes to `api/[[...segments]].ts`
2. ✅ Test each route locally
3. ✅ Verify authorization logic
4. ✅ Commit changes
5. ✅ Push to GitHub
6. ✅ Verify Vercel build (function count ≤12)
7. ✅ Test in production

---

**Status**: Ready for implementation  
**Estimated Time**: 2-3 hours  
**Risk Level**: LOW (all routes follow existing patterns)  
**Function Limit**: ✅ COMPLIANT (10/12 after changes)
