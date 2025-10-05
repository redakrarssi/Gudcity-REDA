# 🚀 Deployment Instructions - Secure Backend API

## 📋 **Pre-Deployment Checklist**

### 1. **Environment Variables**
Ensure these are set in your Vercel project settings:

#### Backend (Server-Side) Variables
```bash
DATABASE_URL=postgresql://...       # ✅ No VITE_ prefix
JWT_SECRET=your-64-char-secret      # ✅ No VITE_ prefix
ADMIN_INIT_TOKEN=your-admin-token   # ✅ No VITE_ prefix
NODE_ENV=production
```

#### Frontend (Client-Side) Variables
```bash
VITE_APP_URL=https://yourdomain.com
VITE_API_URL=/api
VITE_APP_NAME=GudCity REDA
```

### 2. **Vercel Project Configuration**

#### Set Environment Variables
1. Go to Vercel Dashboard
2. Select your project
3. Click "Settings" → "Environment Variables"
4. Add each variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Your Neon database URL
   - **Environment**: Production, Preview, Development

#### Verify vercel.json
Your `vercel.json` should include:
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3. **Build Configuration**
```json
// package.json
{
  "scripts": {
    "build": "vite build && node scripts/patch-vendor-charts.js",
    "build:vercel": "node scripts/vercel-build.js"
  }
}
```

---

## 🔧 **Deployment Steps**

### Option 1: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Set environment variables
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add ADMIN_INIT_TOKEN production
```

### Option 2: Deploy via Git (Recommended)
```bash
# Push to GitHub
git add .
git commit -m "feat: implement secure backend API architecture"
git push origin main

# Vercel will automatically deploy
# Check deployment status in Vercel dashboard
```

---

## 🗄️ **Database Initialization**

After deployment, initialize the database:

### Method 1: Via API Endpoint
```bash
curl -X POST https://yourdomain.com/api/db/initialize \
  -H "Authorization: Bearer YOUR_ADMIN_INIT_TOKEN" \
  -H "Content-Type: application/json"
```

### Method 2: Via Admin Panel
1. Navigate to `https://yourdomain.com/admin`
2. Login with admin credentials
3. Go to "Database Setup"
4. Click "Initialize Database"

### Expected Response
```json
{
  "message": "Database initialization completed",
  "results": [
    "users table created/verified",
    "auth_tokens table created/verified",
    "revoked_tokens table created/verified",
    "failed_logins table created/verified",
    "customer_interactions table created/verified"
  ]
}
```

---

## ✅ **Post-Deployment Verification**

### 1. **Check API Endpoints**
```bash
# Test login endpoint
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 2. **Verify Security**
Open browser console and check:
```javascript
// Should be undefined ✅
console.log(import.meta.env.VITE_DATABASE_URL);

// Should be /api ✅
console.log(import.meta.env.VITE_API_URL);
```

### 3. **Test Login Flow**
1. Go to `https://yourdomain.com/login`
2. Enter test credentials
3. Verify login succeeds
4. Check localStorage for token

### 4. **Check Vercel Logs**
```bash
# View deployment logs
vercel logs

# View function logs
vercel logs --follow
```

---

## 🔒 **Security Verification**

### ✅ Database Credentials Not Exposed
```bash
# Download and inspect the production bundle
curl https://yourdomain.com/assets/index-*.js > bundle.js

# Search for database URL (should find nothing)
grep -i "postgresql://" bundle.js
# Expected: No matches ✅

grep -i "VITE_DATABASE" bundle.js
# Expected: No matches ✅
```

### ✅ API Routes Working
```bash
# Test each API endpoint
curl https://yourdomain.com/api/auth/login
curl https://yourdomain.com/api/users/by-email
curl https://yourdomain.com/api/db/initialize
```

### ✅ CORS Configured
```bash
# Test CORS headers
curl -I https://yourdomain.com/api/auth/login
# Should include:
# Access-Control-Allow-Origin: https://yourdomain.com
# Access-Control-Allow-Methods: POST, OPTIONS
```

---

## 🐛 **Troubleshooting**

### Issue: 404 on API Routes
**Solution:**
1. Check `vercel.json` has correct rewrites
2. Ensure `api/` folder exists at project root
3. Verify TypeScript files are compiled
4. Check Vercel function logs

### Issue: Database Connection Errors
**Solution:**
1. Verify `DATABASE_URL` is set in Vercel
2. Check Neon database is accessible
3. Test connection from Vercel function
4. Check IP allowlist in Neon settings

### Issue: JWT Errors
**Solution:**
1. Verify `JWT_SECRET` is set in Vercel
2. Ensure secret is at least 32 characters
3. Check token generation in login endpoint
4. Verify token storage in browser

### Issue: CORS Errors
**Solution:**
1. Check `VITE_APP_URL` matches deployment URL
2. Verify CORS headers in API routes
3. Test OPTIONS preflight requests
4. Check browser console for specific error

---

## 📊 **Monitoring**

### Vercel Dashboard
- Monitor function invocations
- Check error rates
- View response times
- Track bandwidth usage

### Key Metrics to Watch
- **API Response Time**: Should be < 500ms
- **Error Rate**: Should be < 1%
- **Function Duration**: Should be < 10s
- **Cold Start Time**: Should be < 1s

---

## 🔄 **Rollback Plan**

If issues occur after deployment:

### Quick Rollback
```bash
# Revert to previous deployment
vercel rollback
```

### Manual Rollback
1. Go to Vercel Dashboard
2. Click "Deployments"
3. Find previous working deployment
4. Click "⋯" → "Promote to Production"

---

## 📈 **Performance Optimization**

### Edge Functions (Future Enhancement)
```json
// vercel.json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "edge"
    }
  }
}
```

### Caching Strategy
```typescript
// api/auth/login.ts
res.setHeader('Cache-Control', 'no-store');
```

### Connection Pooling
- Neon serverless automatically handles connection pooling
- No additional configuration needed

---

## ✅ **Deployment Complete!**

Your application is now deployed with:
- ✅ Secure backend API architecture
- ✅ Database credentials protected
- ✅ JWT authentication working
- ✅ Rate limiting enabled
- ✅ CORS protection active
- ✅ 100% functionality maintained

**Next Steps:**
1. Test all critical user flows
2. Monitor Vercel logs for errors
3. Set up monitoring alerts
4. Document any custom API endpoints

---

**Last Updated:** 2025-10-05  
**Status:** 🚀 READY FOR PRODUCTION
