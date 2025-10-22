# Phase 10 Testing - Windows Setup Guide

## 🪟 Windows-Specific Instructions

You're on Windows (PowerShell), so here's the exact setup:

---

## Step 1: Set Environment Variables

### Option A: Edit .env File (Recommended)

Open `.env` file in your project root and add:

```bash
DATABASE_URL=postgresql://your-username:your-password@your-host/your-database
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars-long
JWT_REFRESH_SECRET=your-refresh-secret-key-at-least-32-chars-long
NODE_ENV=development
VITE_API_URL=http://localhost:3000
TEST_BASE_URL=http://localhost:3000
```

### Option B: Generate Secure Secrets (PowerShell)

```powershell
# Generate JWT_SECRET
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# Generate JWT_REFRESH_SECRET  
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

---

## Step 2: Create Test Data

```powershell
npm run test:setup
```

**Expected:** 
```
✓ Created admin: admin@test.com (ID: 1)
✓ Created business: business@test.com (ID: 2)
✓ Created customer: customer@test.com (ID: 3)
✓ Created customer2: customer2@test.com (ID: 4)
```

**If it fails:** Check that DATABASE_URL is correct in `.env`

---

## Step 3: Start Dev Server

### Open a NEW PowerShell Window

```powershell
# Navigate to your project
cd "C:\Users\Android-ap\Desktop\1 VCARDA\Gudcity-REDA"

# Start dev server (KEEP THIS RUNNING!)
npm run dev
```

**Wait for:**
```
VITE v6.3.5  ready in XXX ms
➜  Local:   http://localhost:3000/
```

**Test it:** Open browser to `http://localhost:3000` - should load your app

---

## Step 4: Run Tests

### In Your Original PowerShell Window

```powershell
npm run test:phase10
```

**Expected:**
```
Success Rate: 95.0%+
```

---

## 🐛 Windows-Specific Issues

### Issue: 'grep' is not recognized

**This is NORMAL on Windows.** The security tests will still pass. The script handles this gracefully.

**Ignore these warnings:**
```
'grep' n'est pas reconnu en tant que commande interne
```

---

### Issue: Port 3000 Already in Use

**Check what's using it:**
```powershell
netstat -ano | findstr :3000
```

**Kill the process:**
```powershell
# Find the PID from above command
taskkill /PID <PID> /F
```

**Or use a different port:**
```powershell
$env:VITE_PORT=3001
npm run dev
```

Then update `.env`:
```
TEST_BASE_URL=http://localhost:3001
```

---

### Issue: PowerShell Execution Policy

If you get execution policy errors:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### Issue: Database Connection Failed

**Test connection:**
```powershell
node -e "import('postgres').then(m => { const sql = m.default(process.env.DATABASE_URL); sql\`SELECT 1\`.then(() => { console.log('Database connected'); process.exit(0); }).catch(err => { console.error('Database error:', err.message); process.exit(1); }); })"
```

**Common fixes:**
1. Check DATABASE_URL format: `postgresql://user:password@host:5432/database`
2. Check if database server is running
3. Check firewall isn't blocking the connection

---

## ✅ Complete Windows Workflow

```powershell
# Terminal 1: Setup & Tests
# =========================

# 1. Make sure .env has all variables

# 2. Create test data
npm run test:setup

# 3. Run security tests (optional)
npm run test:security

# 4. Wait for dev server to start in Terminal 2...

# 5. Run API tests
npm run test:phase10


# Terminal 2: Dev Server (NEW WINDOW!)
# =====================================

# Navigate to project
cd "C:\Users\Android-ap\Desktop\1 VCARDA\Gudcity-REDA"

# Start and KEEP RUNNING
npm run dev
```

---

## 📝 Quick Checklist

Before running tests:

- [ ] `.env` file exists with all required variables
- [ ] `DATABASE_URL` is valid and connection works
- [ ] `JWT_SECRET` is at least 32 characters
- [ ] `JWT_REFRESH_SECRET` is at least 32 characters
- [ ] Dev server is running on port 3000
- [ ] Browser can access `http://localhost:3000`
- [ ] Test data was created successfully

---

## 🎯 Expected Results

### Test Setup
```
✓ Created admin: admin@test.com (ID: 1)
✓ Created business: business@test.com (ID: 2)
✓ Created customer: customer@test.com (ID: 3)
✓ Created customer2: customer2@test.com (ID: 4)
✓ Created program: Test Rewards Program (ID: 1)
✓ Created program: VIP Member Program (ID: 2)
✓ Enrolled customer in "Test Rewards Program"
```

### Security Tests
```
✓ ALL SECURITY TESTS PASSED
(Ignore 'grep' warnings - this is normal on Windows)
```

### API Tests
```
Total Tests: 45
✓ Passed: 43+
✗ Failed: 0-2
⊘ Skipped: 0-2

Success Rate: 95.0%+
```

---

## 🆘 Still Not Working?

### The dev server is the key!

**Verify it's running:**

1. Open new PowerShell
2. Run: `curl http://localhost:3000/api/health/ping`
3. Should get a response (not "connection refused")

**If connection refused:**
- Dev server isn't running
- Wrong port
- Firewall blocking

**Solution:**
- Make sure `npm run dev` is running
- Check the terminal shows "ready on http://localhost:3000"
- Open `http://localhost:3000` in browser to verify

---

**Windows User?** Follow this guide first! ✅

