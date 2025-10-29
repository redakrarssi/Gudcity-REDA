# 🚀 Deployment Checklist for GudCity API

## ⚠️ IMPORTANT: Before You Deploy

Your local tests are working with the **custom test server**, but production deployment is different. Here's what you need to ensure success:

---

## ✅ Step 1: Verify Vercel Environment Variables

Your API requires these environment variables to be set in Vercel:

### **CRITICAL - Required Variables:**

1. **DATABASE_URL**
   ```bash
   postgres://username:password@host:5432/database?sslmode=require
   ```
   - Must be your **Neon PostgreSQL** connection string
   - Get this from: https://console.neon.tech/

2. **JWT_SECRET**
   ```bash
   # Generate with: openssl rand -base64 32
   ```
   - Minimum 32 characters
   - Used for access token generation

3. **JWT_REFRESH_SECRET**
   ```bash
   # Generate with: openssl rand -base64 32
   ```
   - Minimum 32 characters
   - Used for refresh token generation

### **Optional Variables:**

4. **QR_SECRET_KEY** (for QR code operations)
   ```bash
   # Generate with: openssl rand -base64 64
   ```

5. **NODE_ENV**
   ```bash
   production
   ```
   - Vercel sets this automatically

---

## 📋 Step 2: Set Environment Variables in Vercel

### **Option A: Via Vercel Dashboard**

1. Go to: https://vercel.com/your-username/your-project
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Your Neon database URL
   - **Environment**: Select all (Production, Preview, Development)
4. Repeat for `JWT_SECRET`, `JWT_REFRESH_SECRET`
5. Click **Save**

### **Option B: Via Vercel CLI**

```bash
# Make sure you're in the project directory
cd C:\2Vcarda\Gudcity-REDA-650909939b3d1742a3f49d2796190cac35591e3b

# Link to Vercel project (if not already linked)
vercel link

# Add environment variables
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add JWT_REFRESH_SECRET production

# Verify they're set
vercel env ls
```

---

## 🔍 Step 3: Check Your Current Vercel Setup

Run these commands to verify your configuration:

```bash
# Check if project is linked
vercel link --confirm

# View current environment variables
vercel env ls

# View project settings
vercel inspect
```

---

## 🚢 Step 4: Deploy to Vercel

### **Manual Deployment:**

```bash
# Deploy to production
vercel --prod

# Or just push to master (if auto-deploy is enabled)
git push origin master
```

### **What Happens During Deployment:**

1. ✅ Vercel detects your `vercel.json` configuration
2. ✅ Runs `npm run build` (builds your frontend)
3. ✅ Compiles all TypeScript files in `/api` to serverless functions
4. ✅ Deploys to: `https://your-project.vercel.app`

---

## 🧪 Step 5: Test Your Deployed API

### **Test 1: Health Check**

```bash
# Test if API is responding
curl https://your-project.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-29T...",
  "database": "connected"
}
```

### **Test 2: Login Endpoint**

```bash
# Test login (adjust URL to your actual Vercel URL)
curl -X POST https://your-project.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@gudcity.com","password":"Demo123!@#"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

---

## ❌ Common Deployment Issues & Solutions

### **Issue 1: "DATABASE_URL is not defined"**

**Cause:** Environment variable not set in Vercel

**Solution:**
```bash
vercel env add DATABASE_URL production
# Paste your Neon database URL when prompted
vercel --prod  # Redeploy
```

---

### **Issue 2: "JWT secrets must be configured"**

**Cause:** JWT_SECRET or JWT_REFRESH_SECRET not set

**Solution:**
```bash
# Generate secrets
openssl rand -base64 32

# Add to Vercel
vercel env add JWT_SECRET production
vercel env add JWT_REFRESH_SECRET production

# Redeploy
vercel --prod
```

---

### **Issue 3: "Module not found" or TypeScript errors**

**Cause:** Dependencies not installed or build failed

**Solution:**
```bash
# Install dependencies
npm install

# Test build locally
npm run build

# If build succeeds, deploy again
vercel --prod
```

---

### **Issue 4: CORS Errors from Frontend**

**Cause:** Your frontend is not in ALLOWED_ORIGINS

**Solution:** Your CORS is set to `*` for now, so this shouldn't happen. But if it does:

1. Edit `api/_lib/cors.ts`
2. Add your Vercel URL to ALLOWED_ORIGINS:
   ```typescript
   const ALLOWED_ORIGINS = [
     'https://your-project.vercel.app',
     'https://gudcity.com',
     // ... other origins
   ];
   ```
3. Commit and push

---

### **Issue 5: 500 Internal Server Error**

**Cause:** Database connection failed or runtime error

**Solution:**
1. Check Vercel logs:
   ```bash
   vercel logs
   ```
2. Or view in dashboard: https://vercel.com/your-project/deployments
3. Look for error messages in the logs

---

## 🎯 Quick Test Script

Create this file to test your deployed API:

```javascript
// test-production-api.js
const BASE_URL = 'https://your-project.vercel.app'; // Replace with your URL

async function testAPI() {
  console.log('🧪 Testing Production API...\n');
  
  // Test 1: Health Check
  console.log('1️⃣ Health Check...');
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    console.log('✅ Status:', res.status);
    console.log('📊 Response:', data);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  console.log('\n2️⃣ Login Test...');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@gudcity.com',
        password: 'Demo123!@#'
      })
    });
    const data = await res.json();
    console.log('✅ Status:', res.status);
    console.log('📊 Response:', data);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testAPI();
```

Run it:
```bash
node test-production-api.js
```

---

## 📊 Vercel Deployment Status

After deploying, check:

1. **Build Logs:** https://vercel.com/your-project/deployments
2. **Function Logs:** Real-time logs for each API call
3. **Analytics:** Response times, error rates, etc.

---

## ✅ Success Criteria

Your deployment is successful if:

- ✅ `GET /api/health` returns 200 OK
- ✅ `POST /api/auth/login` returns 200 OK with valid credentials
- ✅ CORS headers are present in responses
- ✅ No 500 errors in Vercel logs
- ✅ Database connection is successful

---

## 🚨 If Deployment Fails

### Check These:

1. **Environment Variables Set?**
   ```bash
   vercel env ls
   ```
   Should show: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET

2. **Build Successful?**
   ```bash
   npm run build
   ```
   Should complete without errors

3. **Dependencies Installed?**
   ```bash
   npm install
   ```

4. **TypeScript Errors?**
   ```bash
   npm run typecheck
   ```

---

## 🎯 Next Steps After Successful Deployment

1. **Update Frontend API URL**
   - Change API calls from `http://localhost:3000` to `https://your-project.vercel.app`

2. **Test All Endpoints**
   - Run comprehensive API tests against production

3. **Monitor Logs**
   - Watch for errors in Vercel dashboard

4. **Set Up Custom Domain** (Optional)
   - Add custom domain in Vercel settings

---

## 💡 Pro Tips

1. **Use Vercel CLI for faster debugging:**
   ```bash
   vercel logs --follow
   ```

2. **Preview deployments:**
   Every pull request gets a preview URL automatically

3. **Rollback if needed:**
   Go to Vercel dashboard → Deployments → Click "Promote to Production" on a previous working deployment

---

## 📞 Need Help?

If you see errors after deployment, share:
1. The Vercel deployment URL
2. The error message from Vercel logs (`vercel logs`)
3. The specific endpoint that's failing

---

## ⚡ Quick Deploy Command

```bash
# One command to rule them all:
npm install && npm run build && vercel --prod
```

This will:
1. Install dependencies
2. Build the project
3. Deploy to production

---

**Ready to deploy?** Make sure environment variables are set first! 🚀

