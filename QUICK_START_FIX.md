# ⚡ Quick Start: Fix /apireda 404 Errors

## 🎯 The Problem
All API functions on `/apireda` are returning 404 errors.

## ✅ The Solution (3 Steps)

### Step 1: Set Environment Variables in Vercel (5 minutes)

1. Go to: https://vercel.com/your-username/your-project/settings/environment-variables

2. Add these variables (click "Add New" for each):

```bash
DATABASE_URL
postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require

JWT_SECRET
2249c269f69187040d3563d7bdff911b2f21016df78a47a74d31ed12d7dae632e9327daade8cf0a1009933e805c424f6dd7238d76c911d683cbe27c2a9863052

JWT_REFRESH_SECRET
54e9e6a1d870ee06bff4a0ac801ebc7080bdfd4e4001f229afa8f93ab895a3f40f5bc6a2df4d7d3f0e535a1c6f41197d2063780d045fd9c08a1e087f34f75490

VITE_QR_SECRET_KEY
09726b32096f175aa7e0fa7b0494fcda12937c92ad253ec396017e950aaea513fc313d77cd586139ec88ab263e1df9b21edd9444f8d8d385c8c2b8ead31aefcb

VITE_QR_ENCRYPTION_KEY
115cef019a8b8564387d075d4232ec32ad94866d6577424e82d068b7d8d0e6e631de90b39e7bfa8592c83076c39ada47e9dbea230a5bcda296488c6d71f9f4e6

NODE_ENV
production
```

**Important:** For each variable, select **"All Environments"** (Production, Preview, Development)

---

### Step 2: Deploy the Code Changes (2 minutes)

The code has already been fixed. Just deploy:

```bash
# Commit the changes
git add .
git commit -m "fix: resolve API 404 errors and configure secure connection"

# Push to repository
git push

# Deploy to Vercel (or it will auto-deploy from git push)
vercel --prod
```

---

### Step 3: Verify the Fix (1 minute)

1. Wait for deployment to complete (~2 minutes)
2. Go to: `https://your-app.vercel.app/api/health`
3. Should see: `{"success":true,"data":{"status":"healthy",...}}`
4. Go to: `https://your-app.vercel.app/apireda`
5. Click **"Test All Functions"**
6. ✅ All tests should now pass (or show appropriate auth errors, not 404s)

---

## 🔍 What Was Fixed?

1. ✅ Database connection now works in serverless functions
2. ✅ API routes properly configured in `vercel.json`
3. ✅ Import paths fixed (removed `.js` extensions)
4. ✅ CORS headers added for API endpoints
5. ✅ Environment variable fallback for local development

---

## 📝 Files Modified

- `api/_lib/db.ts` - Database connection with fallback
- `api/auth/[action].ts` - Fixed imports
- `api/businesses/[...slug].ts` - Fixed imports
- `api/customers/[...slug].ts` - Fixed imports
- `api/points/[action].ts` - Fixed imports
- `api/qr/[action].ts` - Fixed imports
- `api/notifications/[...route].ts` - Fixed imports
- `api/health.ts` - Fixed imports
- `vercel.json` - Added API routes and CORS

---

## 🧪 Test Locally First (Optional)

```bash
# Start local dev server
vercel dev

# In another terminal
node test-api-local.mjs
```

---

## 🆘 Still Not Working?

1. **Check environment variables are set:**
   ```bash
   vercel env ls
   ```

2. **Check deployment logs:**
   ```bash
   vercel logs your-deployment-url
   ```

3. **Verify health endpoint:**
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

4. **Read full guide:**
   - See `VERCEL_DEPLOYMENT_GUIDE.md` for detailed troubleshooting

---

## ✨ Expected Result

### Before:
- ❌ `/apireda` shows all 404 errors
- ❌ API endpoints don't work
- ❌ Database connection fails

### After:
- ✅ `/apireda` shows successful tests
- ✅ API endpoints respond correctly
- ✅ Database connection works
- ✅ Authentication flows work

---

**Total Time:** ~8 minutes  
**Difficulty:** Easy  
**Status:** Ready to deploy

🚀 **You're all set! Just follow the 3 steps above.**
