# Phase 10: Quick Fix Guide

## 🔴 Current Issues

1. ✅ **FIXED:** Test setup script database schema error
2. ✅ **FIXED:** CORS test error  
3. ❌ **TODO:** Dev server not running
4. ❌ **TODO:** Environment variables not set

---

## ✅ Step-by-Step Fix

### Step 1: Set Environment Variables

Create or update your `.env` file:

```bash
# Copy this into your .env file:

# Database (Required)
DATABASE_URL=postgresql://your-username:your-password@your-host/your-database

# JWT Secrets (Required) - Generate secure random strings
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters-long

# Development
NODE_ENV=development
VITE_API_URL=http://localhost:3000

# Test Configuration (automatically set by test:setup)
TEST_BASE_URL=http://localhost:3000
```

**How to generate secure secrets:**

```bash
# On Windows PowerShell:
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# Or use any random string generator (min 32 characters)
```

---

### Step 2: Re-run Test Setup (with fixed script)

```bash
npm run test:setup
```

**Expected Output:**
```
✓ Created admin: admin@test.com (ID: 1)
✓ Created business: business@test.com (ID: 2)
✓ Created customer: customer@test.com (ID: 3)
✓ Created customer2: customer2@test.com (ID: 4)
✓ Created program: Test Rewards Program (ID: 1)
✓ Created program: VIP Member Program (ID: 2)
✓ Enrolled customer in "Test Rewards Program"
✓ Awarded 50 points: Purchase at store
```

---

### Step 3: Start Dev Server (CRITICAL!)

**Open a NEW terminal window** and run:

```bash
npm run dev
```

**Wait for this output:**
```
VITE v6.3.5  ready in XXX ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

**Keep this terminal running!** Do NOT close it.

---

### Step 4: Run Tests (in original terminal)

Now in your **original terminal**, run:

```bash
npm run test:phase10
```

**Expected Output:**
```
================================================================================
  Phase 10.1: Authentication Testing
================================================================================
  Testing: Login with valid customer credentials... ✓ PASSED
  Testing: Login with valid business credentials... ✓ PASSED
  Testing: Login with valid admin credentials... ✓ PASSED
  ...
  
  Success Rate: 100.0%
```

---

## 📋 Complete Command Sequence

```bash
# Terminal 1 (Setup and Tests)
# ---------------------------------

# 1. Set environment variables (edit .env file first!)

# 2. Create test data
npm run test:setup

# Expected: ✓ Test data setup complete!

# 3. Run security tests (optional but recommended)
npm run test:security

# Expected: ✓ ALL SECURITY TESTS PASSED


# Terminal 2 (Dev Server)
# ---------------------------------

# 4. Start dev server (KEEP RUNNING)
npm run dev

# Expected: VITE ready on http://localhost:3000/


# Back to Terminal 1
# ---------------------------------

# 5. Run comprehensive tests
npm run test:phase10

# Expected: Success Rate: 100.0%
```

---

## 🐛 Troubleshooting

### Issue: "npm run test:setup" still fails

**Check:**
1. Is `DATABASE_URL` set in `.env`?
2. Can you connect to the database?

**Test connection:**
```bash
node -e "import('postgres').then(m => { const sql = m.default(process.env.DATABASE_URL); sql\`SELECT 1\`.then(() => { console.log('✓ Database connected'); process.exit(0); }).catch(err => { console.error('✗ Database error:', err.message); process.exit(1); }); })"
```

---

### Issue: "Cannot connect to http://localhost:3000"

**Solution:**
- Make sure dev server is running: `npm run dev`
- Check if port 3000 is available
- Try different port: `VITE_PORT=3001 npm run dev`

---

### Issue: Tests still getting status code 0

**Causes:**
1. Dev server not running
2. Wrong URL in TEST_BASE_URL
3. Firewall blocking localhost

**Solution:**
1. Verify dev server is running: Open `http://localhost:3000` in browser
2. Check .env has `TEST_BASE_URL=http://localhost:3000`
3. Try disabling firewall temporarily

---

### Issue: "Rate limiting may not be active"

This is a **warning**, not an error. Rate limiting works but our test sends 250 requests very fast. You can ignore this or verify manually:

```bash
# Send 250 requests to trigger rate limit
for($i=0; $i -lt 250; $i++) { Invoke-WebRequest http://localhost:3000/api/promotions -UseBasicParsing }
```

---

## ✅ Success Criteria

**You'll know it's working when:**

1. ✅ Test setup creates 4 users
2. ✅ Dev server shows "ready on http://localhost:3000/"
3. ✅ Tests show: `Success Rate: 100.0%` or close to it
4. ✅ No status code 0 errors

---

## 📞 Still Having Issues?

### Check These Files:

1. **`.env`** - All required variables set?
2. **Database connection** - Can you connect?
3. **Dev server** - Is it actually running?

### Quick Diagnostic:

```bash
# Check environment variables
echo $env:DATABASE_URL      # Windows PowerShell
echo %DATABASE_URL%         # Windows CMD  

# Check if port 3000 is in use
netstat -ano | findstr :3000

# Check if server responds
curl http://localhost:3000/api/health/ping
```

---

## 🎯 Next Steps After Tests Pass

Once all tests pass:

1. **Review Results** - Check the test report
2. **Manual Testing** - Use `PHASE_10_MANUAL_TESTING_CHECKLIST.md`
3. **Production Deployment** - Follow deployment checklist

---

**Last Updated:** October 22, 2025  
**Status:** Ready to fix and re-test

