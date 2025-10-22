# Phase 10: Manual Testing Checklist

**Test Date:** _____________  
**Tester:** _____________  
**Environment:** ☐ Development  ☐ Staging  ☐ Production  
**Base URL:** _____________

---

## 10.1 Authentication Testing

### Customer Authentication
- [ ] **Test 1.1:** Register new customer account
  - Email: ________________________
  - Result: ☐ Pass ☐ Fail
  - Notes: ___________________________________________

- [ ] **Test 1.2:** Login with customer credentials
  - Result: ☐ Pass ☐ Fail
  - Token received: ☐ Yes ☐ No

- [ ] **Test 1.3:** Access customer dashboard after login
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 1.4:** Logout from customer account
  - Result: ☐ Pass ☐ Fail
  - Redirected to login: ☐ Yes ☐ No

- [ ] **Test 1.5:** Try accessing protected route after logout
  - Result: ☐ Blocked (Pass) ☐ Allowed (Fail)

### Business Authentication
- [ ] **Test 1.6:** Register new business account
  - Business Name: ________________________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 1.7:** Login with business credentials
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 1.8:** Access business dashboard
  - Result: ☐ Pass ☐ Fail

### Admin Authentication
- [ ] **Test 1.9:** Login with admin credentials
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 1.10:** Access admin dashboard
  - Result: ☐ Pass ☐ Fail

### Negative Tests
- [ ] **Test 1.11:** Login with wrong password
  - Result: ☐ Error shown (Pass) ☐ Allowed (Fail)
  - Error message: ___________________________________________

- [ ] **Test 1.12:** Login with non-existent email
  - Result: ☐ Error shown (Pass) ☐ Allowed (Fail)

- [ ] **Test 1.13:** Try 10+ failed login attempts (rate limiting)
  - Result: ☐ Rate limited (Pass) ☐ Not limited (Fail)
  - After how many attempts: _____________

---

## 10.2 Customer Dashboard Testing

**Logged in as Customer:** ________________________

### Dashboard Overview
- [ ] **Test 2.1:** Customer dashboard loads
  - Load time: _______ seconds
  - Result: ☐ Pass (< 3s) ☐ Slow (> 3s) ☐ Fail

- [ ] **Test 2.2:** QR code is displayed
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.3:** Points balance is shown
  - Points: _____________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.4:** Enrolled programs list (top 3)
  - Number shown: _____________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.5:** Recent promotions shown
  - Number shown: _____________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.6:** Unread notifications count
  - Count: _____________
  - Result: ☐ Pass ☐ Fail

### Loyalty Cards Page
- [ ] **Test 2.7:** Navigate to loyalty cards page
  - URL: `/customer/cards`
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.8:** All loyalty cards displayed
  - Number of cards: _____________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.9:** Points shown for each card
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.10:** Card details accessible
  - Result: ☐ Pass ☐ Fail

### QR Code Page
- [ ] **Test 2.11:** Navigate to QR card page
  - URL: `/customer/qr-card`
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.12:** QR code generates successfully
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.13:** QR code is scannable (test with phone)
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.14:** Can regenerate QR code
  - Result: ☐ Pass ☐ Fail

### Program Enrollment
- [ ] **Test 2.15:** View available programs
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.16:** Request enrollment in a program
  - Program: ________________________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.17:** Notification sent to business
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.18:** Enrollment status shows "Pending"
  - Result: ☐ Pass ☐ Fail

### Transaction History
- [ ] **Test 2.19:** View transaction history
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.20:** Transactions listed chronologically
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.21:** Points added/deducted shown correctly
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.22:** Pagination works (if many transactions)
  - Result: ☐ Pass ☐ Fail ☐ N/A

### Notifications
- [ ] **Test 2.23:** Open notifications center
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.24:** All notifications displayed
  - Count: _____________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.25:** Mark notification as read
  - Unread count updates: ☐ Yes ☐ No
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.26:** Delete notification
  - Result: ☐ Pass ☐ Fail

### Customer Settings
- [ ] **Test 2.27:** Navigate to settings
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.28:** Update profile information
  - Result: ☐ Pass ☐ Fail
  - Changes saved: ☐ Yes ☐ No

- [ ] **Test 2.29:** Change notification preferences
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 2.30:** Change password
  - Result: ☐ Pass ☐ Fail
  - Can login with new password: ☐ Yes ☐ No

---

## 10.3 Business Dashboard Testing

**Logged in as Business:** ________________________

### Dashboard Overview
- [ ] **Test 3.1:** Business dashboard loads
  - Load time: _______ seconds
  - Result: ☐ Pass (< 3s) ☐ Slow (> 3s) ☐ Fail

- [ ] **Test 3.2:** Analytics displayed
  - Total customers: _____________
  - Total programs: _____________
  - Total points: _____________
  - Total redemptions: _____________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.3:** Recent activity shown
  - Result: ☐ Pass ☐ Fail

### Customer Management
- [ ] **Test 3.4:** Navigate to customers page
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.5:** All enrolled customers listed
  - Count: _____________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.6:** Search for customer
  - Search term: ________________________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.7:** View customer details
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.8:** Pagination works
  - Result: ☐ Pass ☐ Fail ☐ N/A

### QR Code Scanning
- [ ] **Test 3.9:** Navigate to QR scanner
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.10:** Camera permission requested
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.11:** Scan customer QR code
  - Customer identified: ☐ Yes ☐ No
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.12:** Award points after scan
  - Points awarded: _____________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.13:** Customer notified of points
  - Result: ☐ Pass ☐ Fail ☐ Unable to verify

### Loyalty Program Management
- [ ] **Test 3.14:** View existing programs
  - Count: _____________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.15:** Create new program
  - Program name: ________________________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.16:** Edit program details
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.17:** Deactivate program
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.18:** Enrolled customers count shown
  - Result: ☐ Pass ☐ Fail

### Promotion Management
- [ ] **Test 3.19:** View promotions page
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.20:** Create new promotion
  - Promotion name: ________________________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.21:** Set promotion rules
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.22:** Activate promotion
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.23:** Customers can see promotion
  - Result: ☐ Pass ☐ Fail ☐ Unable to verify

### Staff Management
- [ ] **Test 3.24:** Navigate to staff management
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.25:** Add new staff member
  - Staff email: ________________________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.26:** Set staff permissions
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.27:** Staff can login with limited access
  - Result: ☐ Pass ☐ Fail ☐ Unable to verify

### Analytics Dashboard
- [ ] **Test 3.28:** Navigate to analytics
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.29:** All charts render correctly
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.30:** Date range filters work
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.31:** Data appears accurate
  - Result: ☐ Pass ☐ Fail

### Business Settings
- [ ] **Test 3.32:** Navigate to settings
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.33:** Update business profile
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.34:** Change currency
  - New currency: _____________
  - Reflected everywhere: ☐ Yes ☐ No
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 3.35:** Update notification preferences
  - Result: ☐ Pass ☐ Fail

---

## 10.4 Admin Dashboard Testing

**Logged in as Admin:** ________________________

### Dashboard Overview
- [ ] **Test 4.1:** Admin dashboard loads
  - Load time: _______ seconds
  - Result: ☐ Pass (< 3s) ☐ Slow (> 3s) ☐ Fail

- [ ] **Test 4.2:** System-wide stats displayed
  - Total users: _____________
  - Total businesses: _____________
  - Total customers: _____________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 4.3:** Recent activity log visible
  - Result: ☐ Pass ☐ Fail

### User Management
- [ ] **Test 4.4:** View all users
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 4.5:** Search for user
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 4.6:** Edit user details
  - User: ________________________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 4.7:** Ban user
  - User cannot login: ☐ Verified ☐ Not verified
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 4.8:** Unban user
  - User can login: ☐ Verified ☐ Not verified
  - Result: ☐ Pass ☐ Fail

### Business Management
- [ ] **Test 4.9:** View all businesses
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 4.10:** Approve pending business
  - Business: ________________________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 4.11:** Reject pending business
  - Business: ________________________
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 4.12:** Suspend business
  - Business cannot operate: ☐ Verified ☐ Not verified
  - Result: ☐ Pass ☐ Fail

### System Analytics
- [ ] **Test 4.13:** View system analytics
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 4.14:** Filter by date range
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 4.15:** Export analytics report
  - Result: ☐ Pass ☐ Fail

### Global Settings
- [ ] **Test 4.16:** View settings page
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 4.17:** Update system settings
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 4.18:** Configure security policies
  - Result: ☐ Pass ☐ Fail

---

## 10.5 Security Testing

### Database Credential Protection
- [ ] **Test 5.1:** Build production bundle
  ```bash
  npm run build
  ```
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 5.2:** Search for credentials in bundle
  ```bash
  grep -r "VITE_DATABASE_URL" dist/
  grep -r "postgres://" dist/
  ```
  - Found credentials: ☐ No (Pass) ☐ Yes (Fail)

### Authorization Tests
- [ ] **Test 5.3:** Access API without token
  ```bash
  curl http://localhost:3000/api/users/1
  ```
  - Response: ☐ 401 (Pass) ☐ Other (Fail)

- [ ] **Test 5.4:** Customer accessing other customer data
  - Response: ☐ 403 (Pass) ☐ Data returned (Fail)

- [ ] **Test 5.5:** Customer accessing business data
  - Response: ☐ 403 (Pass) ☐ Data returned (Fail)

- [ ] **Test 5.6:** Business accessing admin endpoints
  - Response: ☐ 403 (Pass) ☐ Data returned (Fail)

### SQL Injection Tests
- [ ] **Test 5.7:** SQL injection in login
  - Email: `admin' OR '1'='1`
  - Password: `' OR '1'='1`
  - Result: ☐ Blocked (Pass) ☐ Allowed (Fail)

- [ ] **Test 5.8:** SQL injection in search
  - Search: `'; DROP TABLE users; --`
  - Result: ☐ Sanitized (Pass) ☐ Executed (Fail)

### XSS Tests
- [ ] **Test 5.9:** XSS in profile name
  - Name: `<script>alert('XSS')</script>`
  - Script executed: ☐ No (Pass) ☐ Yes (Fail)

- [ ] **Test 5.10:** XSS in comment/feedback
  - Comment: `<img src=x onerror="alert('XSS')">`
  - Script executed: ☐ No (Pass) ☐ Yes (Fail)

### Rate Limiting
- [ ] **Test 5.11:** Make 100+ requests rapidly
  - After N requests: ☐ Rate limited (Pass) ☐ Not limited (Fail)
  - N = _____________

### Security Headers
- [ ] **Test 5.12:** Check security headers
  ```bash
  curl -I http://localhost:3000/
  ```
  - Strict-Transport-Security: ☐ Present ☐ Missing
  - X-Content-Type-Options: ☐ Present ☐ Missing
  - X-Frame-Options: ☐ Present ☐ Missing
  - Content-Security-Policy: ☐ Present ☐ Missing
  - Result: ☐ Pass ☐ Fail

---

## 10.6 Performance Testing

### API Response Times
Test each endpoint 5 times and record average:

- [ ] **Test 6.1:** GET /api/users/[id]
  - Avg time: _______ ms
  - Result: ☐ Pass (< 100ms) ☐ Slow (> 100ms)

- [ ] **Test 6.2:** GET /api/customers/[id]/programs
  - Avg time: _______ ms
  - Result: ☐ Pass (< 200ms) ☐ Slow (> 200ms)

- [ ] **Test 6.3:** POST /api/transactions/award-points
  - Avg time: _______ ms
  - Result: ☐ Pass (< 300ms) ☐ Slow (> 300ms)

- [ ] **Test 6.4:** GET /api/business/[id]/analytics
  - Avg time: _______ ms
  - Result: ☐ Pass (< 500ms) ☐ Slow (> 500ms)

### Dashboard Load Times
- [ ] **Test 6.5:** Customer dashboard load time
  - Time: _______ seconds
  - Result: ☐ Pass (< 3s) ☐ Slow (> 3s)

- [ ] **Test 6.6:** Business dashboard load time
  - Time: _______ seconds
  - Result: ☐ Pass (< 3s) ☐ Slow (> 3s)

- [ ] **Test 6.7:** Admin dashboard load time
  - Time: _______ seconds
  - Result: ☐ Pass (< 3s) ☐ Slow (> 3s)

### Lighthouse Scores
Run Lighthouse on each dashboard:

- [ ] **Test 6.8:** Customer dashboard Lighthouse
  - Performance: _______ / 100
  - Accessibility: _______ / 100
  - Best Practices: _______ / 100
  - SEO: _______ / 100

- [ ] **Test 6.9:** Business dashboard Lighthouse
  - Performance: _______ / 100
  - Accessibility: _______ / 100

- [ ] **Test 6.10:** Admin dashboard Lighthouse
  - Performance: _______ / 100
  - Accessibility: _______ / 100

---

## 10.7 Error Handling Testing

### Network Errors
- [ ] **Test 7.1:** Disconnect internet and try API call
  - Error message shown: ☐ Yes ☐ No
  - User-friendly: ☐ Yes ☐ No
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 7.2:** Reconnect and retry
  - Request succeeds: ☐ Yes ☐ No
  - Result: ☐ Pass ☐ Fail

### Validation Errors
- [ ] **Test 7.3:** Submit form with missing fields
  - Specific field errors shown: ☐ Yes ☐ No
  - Result: ☐ Pass ☐ Fail

- [ ] **Test 7.4:** Submit form with invalid email
  - Email format error shown: ☐ Yes ☐ No
  - Result: ☐ Pass ☐ Fail

### Not Found Errors
- [ ] **Test 7.5:** Navigate to non-existent route
  - 404 page displayed: ☐ Yes ☐ No
  - Can navigate back: ☐ Yes ☐ No
  - Result: ☐ Pass ☐ Fail

---

## Test Summary

**Total Tests:** _____________  
**Passed:** _____________  
**Failed:** _____________  
**Skipped:** _____________  
**Success Rate:** _____________ %

### Critical Issues Found

1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

### Minor Issues Found

1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

### Recommendations

1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

---

## Deployment Readiness

Based on testing results:

- [ ] ✅ **READY FOR PRODUCTION**  
  All tests passed, no critical issues found.

- [ ] ⚠️ **READY WITH CAVEATS**  
  Minor issues found but not blocking.  
  Caveats: __________________________________________________

- [ ] ❌ **NOT READY**  
  Critical issues must be fixed before deployment.  
  Blocking issues: __________________________________________

---

**Tester Signature:** _____________________ **Date:** _____________  
**Reviewer Signature:** __________________ **Date:** _____________

