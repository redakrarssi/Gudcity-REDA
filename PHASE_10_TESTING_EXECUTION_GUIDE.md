# Phase 10: Testing Execution Guide

## Overview

This guide provides step-by-step instructions for executing Phase 10 comprehensive testing of the database-to-API backend migration.

---

## Prerequisites

### 1. Environment Setup

Ensure you have the following installed:
- Node.js 18+ 
- npm 8+
- PostgreSQL database (Neon or local)

### 2. Environment Variables

Create or update your `.env` file with:

```bash
# Required
DATABASE_URL=postgresql://user:password@host/database
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
NODE_ENV=development

# Optional
VITE_API_URL=http://localhost:3000
TEST_BASE_URL=http://localhost:3000

# Test Credentials (automatically set after running test:setup)
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=Admin123!@#
TEST_BUSINESS_EMAIL=business@test.com
TEST_BUSINESS_PASSWORD=Business123!@#
TEST_CUSTOMER_EMAIL=customer@test.com
TEST_CUSTOMER_PASSWORD=Customer123!@#
```

### 3. Install Dependencies

```bash
npm install
```

---

## Testing Workflow

Follow these steps in order:

### Step 1: Setup Test Data

Create test users, businesses, loyalty programs, and sample transactions:

```bash
npm run test:setup
```

**What this does:**
- Creates test admin, business, and customer accounts
- Creates sample loyalty programs
- Enrolls customers in programs
- Creates sample transactions and notifications
- Displays test credentials for use

**Expected Output:**
```
✓ Created admin: admin@test.com (ID: 1)
✓ Created business: business@test.com (ID: 2)
✓ Created customer: customer@test.com (ID: 3)
✓ Created program: Test Rewards Program (ID: 1)
✓ Enrolled customer in "Test Rewards Program"
✓ Awarded 50 points: Purchase at store
```

**Note:** Save the displayed credentials for manual testing.

---

### Step 2: Build and Security Validation

Run security validation tests to ensure no database credentials in frontend bundle:

```bash
npm run test:security
```

**What this tests:**
- ✓ No VITE_DATABASE_URL in production bundle
- ✓ No postgres:// connection strings in bundle
- ✓ Environment variables configured correctly
- ✓ No direct database access in client code
- ✓ Security headers configured in vercel.json
- ✓ Dependency vulnerabilities check
- ✓ No hardcoded credentials in source code

**Expected Output:**
```
✓ No VITE_DATABASE_URL found
✓ No database connection strings found  
✓ All security tests PASSED
```

---

### Step 3: Start Development Server

In a separate terminal, start the development server:

```bash
npm run dev
```

Wait for the server to start:
```
VITE v6.3.5  ready in 1234 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

Keep this terminal running for the automated tests.

---

### Step 4: Run Automated API Tests

Run the comprehensive API test suite:

```bash
npm run test:phase10
```

**What this tests:**

#### Phase 10.1: Authentication
- Login with valid credentials (customer, business, admin)
- Login with invalid credentials
- Logout functionality
- Token handling

#### Phase 10.2: Customer Dashboard
- Dashboard stats and overview
- Loyalty cards display
- Program enrollment
- Transaction history
- Notifications
- QR code generation

#### Phase 10.3: Business Dashboard
- Business analytics
- Customer management
- Program management
- QR code scanning
- Settings management

#### Phase 10.4: Admin Dashboard
- System-wide statistics
- User management
- Business management
- Approval workflows

#### Phase 10.5: Security
- Unauthorized access prevention (401)
- Cross-user access prevention (403)
- SQL injection prevention
- Rate limiting
- CORS headers
- Invalid token rejection

#### Phase 10.6: Performance
- API response times (<500ms)
- Concurrent request handling

#### Phase 10.7: Error Handling
- 404 Not Found
- 400 Validation errors
- 405 Method not allowed

**Expected Output:**
```
══════════════════════════════════════════════════════════════════
  Phase 10.1: Authentication Testing
══════════════════════════════════════════════════════════════════
  Testing: Login with valid customer credentials... ✓ PASSED
  Testing: Login with valid business credentials... ✓ PASSED
  Testing: Login with valid admin credentials... ✓ PASSED
  ...

══════════════════════════════════════════════════════════════════
  Test Summary
══════════════════════════════════════════════════════════════════
  Total Tests: 45
  ✓ Passed: 43
  ✗ Failed: 0
  ⊘ Skipped: 2
  
  Success Rate: 100.0%
```

---

### Step 5: Manual Testing

Use the manual testing checklist for thorough user interface testing:

```bash
# Open the checklist
PHASE_10_MANUAL_TESTING_CHECKLIST.md
```

**Testing Areas:**
1. Authentication flows (registration, login, logout)
2. Customer dashboard (all pages and features)
3. Business dashboard (all pages and features)
4. Admin dashboard (all pages and features)
5. Security validation (browser-based)
6. Performance testing (Lighthouse)
7. Error handling (user experience)

**Tips for Manual Testing:**
- Use the test credentials from Step 1
- Test in multiple browsers (Chrome, Firefox, Safari)
- Test on mobile devices
- Take screenshots of any issues
- Record video for complex user flows

---

### Step 6: Performance Testing with Lighthouse

Test each dashboard with Lighthouse:

```bash
# Start production build
npm run build
npm run serve:prod

# Run Lighthouse (in separate terminal)
npm run lighthouse
```

Or test manually:
1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select categories: Performance, Accessibility, Best Practices, SEO
4. Click "Analyze page load"

**Target Scores:**
- Performance: > 80
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 80

---

### Step 7: Load Testing (Optional)

For production-ready validation, perform load testing:

#### Using Apache Bench (ab)

```bash
# Install Apache Bench
# macOS: brew install httpd
# Ubuntu: sudo apt-get install apache2-utils

# Test 100 concurrent requests
ab -n 100 -c 10 http://localhost:3000/api/promotions

# With authentication
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
   http://localhost:3000/api/users/1
```

#### Using k6 (Recommended for advanced testing)

```bash
# Install k6
# macOS: brew install k6
# Ubuntu: sudo snap install k6

# Create test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10, // 10 virtual users
  duration: '30s', // Run for 30 seconds
};

export default function () {
  let res = http.get('http://localhost:3000/api/promotions');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
EOF

# Run test
k6 run load-test.js
```

**Expected Results:**
- All requests succeed (0% error rate)
- Average response time < 500ms
- 95th percentile < 1000ms
- No memory leaks or crashes

---

## Test Results Documentation

### Create Test Report

Document your test results:

```bash
# Copy the template
cp PHASE_10_MANUAL_TESTING_CHECKLIST.md PHASE_10_TEST_RESULTS_$(date +%Y%m%d).md

# Fill in the results
# Include:
# - Test date and tester name
# - All checkbox results
# - Screenshots of issues
# - Performance metrics
# - Recommendations
```

---

## Troubleshooting

### Issue: Tests fail with "Connection refused"

**Solution:**
```bash
# Ensure development server is running
npm run dev

# Check if port 3000 is in use
lsof -i :3000

# Use different port if needed
VITE_PORT=3001 npm run dev
# Then update TEST_BASE_URL in .env
```

### Issue: Authentication tests fail

**Solution:**
```bash
# Recreate test data
npm run test:setup

# Verify database connection
echo $DATABASE_URL

# Check JWT secrets are set
echo $JWT_SECRET
```

### Issue: Security tests fail - credentials found in bundle

**Solution:**
```bash
# Check .env file doesn't have VITE_DATABASE_URL
grep VITE_DATABASE_URL .env

# Rebuild clean
rm -rf dist/
npm run build

# Re-run security tests
npm run test:security
```

### Issue: Database connection errors

**Solution:**
```bash
# Test database connection
node -e "import('postgres').then(m => {
  const sql = m.default(process.env.DATABASE_URL);
  sql\`SELECT 1\`.then(() => {
    console.log('✓ Database connected');
    process.exit(0);
  }).catch(err => {
    console.error('✗ Database error:', err.message);
    process.exit(1);
  });
})"
```

### Issue: Rate limiting prevents tests

**Solution:**
```bash
# Wait for rate limit to reset (usually 1 minute)
# Or temporarily increase rate limits in api/_lib/auth.ts:
# const allow = rateLimitFactory(500, 60_000); // 500 requests per minute
```

---

## Continuous Integration (CI)

### GitHub Actions Workflow

Create `.github/workflows/phase10-tests.yml`:

```yaml
name: Phase 10 Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: |
          npm run db:migrate
          npm run test:setup
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
          JWT_SECRET: test-secret-key
          JWT_REFRESH_SECRET: test-refresh-secret
      
      - name: Run security tests
        run: npm run test:security
      
      - name: Build application
        run: npm run build
      
      - name: Start server
        run: npm run dev &
        env:
          PORT: 3000
      
      - name: Wait for server
        run: npx wait-on http://localhost:3000
      
      - name: Run Phase 10 tests
        run: npm run test:phase10
        env:
          TEST_BASE_URL: http://localhost:3000
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All automated tests pass (100% success rate)
- [ ] Security validation passes
- [ ] Manual testing checklist completed
- [ ] Performance benchmarks met
- [ ] No critical or high vulnerabilities in dependencies
- [ ] Environment variables configured in production
- [ ] Database backups enabled
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented
- [ ] Load testing completed successfully
- [ ] Security headers verified in production
- [ ] SSL/TLS certificates valid
- [ ] Rate limiting active
- [ ] Error tracking configured (Sentry, etc.)

---

## Test Maintenance

### Updating Test Data

```bash
# Clear old test data
psql $DATABASE_URL -c "
  DELETE FROM users WHERE email LIKE '%@test.com';
  DELETE FROM loyalty_cards WHERE card_number LIKE 'TEST-%';
"

# Recreate test data
npm run test:setup
```

### Adding New Tests

1. Edit `tests/phase10-comprehensive-test-suite.js`
2. Add new test function
3. Call from `runAllTests()`
4. Update test count in summary

### Updating Test Credentials

Edit `tests/setup-test-data.js`:
```javascript
const testUsers = {
  admin: {
    email: 'newadmin@test.com', // Change here
    password: 'NewPassword123!', // Change here
    // ...
  }
};
```

---

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review test output logs
3. Consult migration documentation:
   - `PHASE_10_COMPREHENSIVE_TESTING_GUIDE.md`
   - `complete-database-to-api-backend-migration-plan.plan.md`
4. Check API endpoint documentation
5. Review security documentation

---

## Next Steps

After Phase 10 testing is complete:

✅ **All Tests Passed?**
→ Proceed to Phase 11: Vercel Function Limit Optimization (if needed)
→ Or proceed to Production Deployment

❌ **Tests Failed?**
→ Review failure logs
→ Fix identified issues
→ Re-run tests
→ Update documentation with findings

---

## Test Results Archive

Keep test results for historical reference:

```bash
# Create archive
mkdir -p test-results/$(date +%Y%m%d)

# Save automated test output
npm run test:all 2>&1 | tee test-results/$(date +%Y%m%d)/automated-tests.log

# Save manual test checklist
cp PHASE_10_MANUAL_TESTING_CHECKLIST.md \
   test-results/$(date +%Y%m%d)/manual-tests-completed.md

# Save Lighthouse reports
# (exports from Chrome DevTools)

# Commit results
git add test-results/
git commit -m "Phase 10 test results - $(date +%Y-%m-%d)"
```

---

**Document Version:** 1.0  
**Last Updated:** October 22, 2025  
**Status:** Ready for Testing

