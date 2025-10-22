# Phase 10 Test Suite

Comprehensive testing infrastructure for the database-to-API backend migration.

---

## Quick Start

```bash
# 1. Create test data
npm run test:setup

# 2. Run security validation
npm run test:security

# 3. Start dev server (separate terminal)
npm run dev

# 4. Run API tests
npm run test:phase10
```

---

## Test Files

### `phase10-comprehensive-test-suite.js`
Automated API testing suite covering all endpoints and user flows.

**Tests:**
- Authentication (login, logout, registration)
- Customer dashboard endpoints
- Business dashboard endpoints
- Admin dashboard endpoints
- Security (authorization, SQL injection, rate limiting)
- Performance (response times, concurrent requests)
- Error handling (404, 401, 403, validation)

**Run:** `npm run test:phase10`

---

### `security-validation-test.js`
Security-focused validation testing.

**Tests:**
- No database credentials in frontend bundle
- Environment variable configuration
- File permissions
- Source code security audit
- Dependency vulnerabilities
- Security headers
- Database access control

**Run:** `npm run test:security`

---

### `setup-test-data.js`
Creates test users and sample data for testing.

**Creates:**
- Test admin user
- Test business user
- Test customer users (2)
- Sample loyalty programs (2)
- Customer enrollments
- Sample transactions
- Sample notifications

**Run:** `npm run test:setup`

---

## Test Output

### Successful Test Run

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
  ✓ Passed: 45
  ✗ Failed: 0
  ⊘ Skipped: 0
  
  Success Rate: 100.0%
```

---

## Requirements

- Node.js 18+
- npm 8+
- PostgreSQL database (Neon or local)
- Environment variables configured

---

## Environment Variables

Required in `.env`:

```bash
DATABASE_URL=postgresql://user:password@host/database
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
NODE_ENV=development

# For automated tests
TEST_BASE_URL=http://localhost:3000
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=Admin123!@#
TEST_BUSINESS_EMAIL=business@test.com
TEST_BUSINESS_PASSWORD=Business123!@#
TEST_CUSTOMER_EMAIL=customer@test.com
TEST_CUSTOMER_PASSWORD=Customer123!@#
```

---

## Troubleshooting

### Tests fail with connection errors

```bash
# Ensure dev server is running
npm run dev

# Check DATABASE_URL
echo $DATABASE_URL
```

### Authentication tests fail

```bash
# Recreate test data
npm run test:setup
```

### Security test finds credentials in bundle

```bash
# Remove VITE_DATABASE_URL from .env
# Rebuild
rm -rf dist/
npm run build
```

---

## Documentation

- **Quick Reference:** `../PHASE_10_QUICK_REFERENCE.md`
- **Execution Guide:** `../PHASE_10_TESTING_EXECUTION_GUIDE.md`
- **Manual Checklist:** `../PHASE_10_MANUAL_TESTING_CHECKLIST.md`
- **Implementation Status:** `../PHASE_10_IMPLEMENTATION_STATUS.md`

---

## Test Maintenance

### Update Test Credentials

Edit `setup-test-data.js`:

```javascript
const testUsers = {
  admin: {
    email: 'newemail@test.com',
    password: 'NewPassword123!',
    // ...
  }
};
```

### Add New Tests

Edit `phase10-comprehensive-test-suite.js`:

1. Create test function
2. Add to `runAllTests()`
3. Update test count

### Clear Test Data

```bash
psql $DATABASE_URL -c "
  DELETE FROM users WHERE email LIKE '%@test.com';
  DELETE FROM loyalty_cards WHERE card_number LIKE 'TEST-%';
"
```

---

## CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Setup test data
  run: npm run test:setup

- name: Run security tests
  run: npm run test:security

- name: Run API tests
  run: npm run test:phase10
```

---

## License

Internal use only - Part of Gudcity Loyalty Platform Phase 10 migration.

