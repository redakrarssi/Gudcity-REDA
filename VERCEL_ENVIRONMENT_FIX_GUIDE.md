# 🚨 Vercel Environment Variables - Complete Fix Guide

## **CRITICAL: This Must Be Done IMMEDIATELY**

Your API endpoints are returning 404 because environment variables are NOT configured in your Vercel deployment.

---

## 🎯 **Step 1: Go to Vercel Dashboard**

1. **Open**: https://vercel.com/dashboard
2. **Find your project** (likely named something like `gudcity-reda-*`)
3. **Click on the project name**

---

## ⚙️ **Step 2: Configure Environment Variables**

1. Click **"Settings"** tab (top navigation)
2. Click **"Environment Variables"** in the left sidebar
3. For **EACH** variable below, click **"Add New"**:

### **CRITICAL Variables (REQUIRED for Login to Work)**

#### **Variable 1: DATABASE_URL**
```
Name: DATABASE_URL
Value: [Your actual Neon/PostgreSQL database URL]
Environment: ✅ Production ✅ Preview ✅ Development
```

#### **Variable 2: POSTGRES_URL** 
```
Name: POSTGRES_URL  
Value: [Same as DATABASE_URL]
Environment: ✅ Production ✅ Preview ✅ Development
```

#### **Variable 3: JWT_SECRET**
```
Name: JWT_SECRET
Value: [Generate a 64+ character random string]
Environment: ✅ Production ✅ Preview ✅ Development
```

#### **Variable 4: JWT_REFRESH_SECRET**
```
Name: JWT_REFRESH_SECRET
Value: [Generate a different 64+ character random string]  
Environment: ✅ Production ✅ Preview ✅ Development
```

#### **Variable 5: VITE_API_URL**
```
Name: VITE_API_URL
Value: [LEAVE EMPTY or DELETE THIS VARIABLE]
Environment: ✅ Production ✅ Preview ✅ Development

⚠️ CRITICAL: DO NOT set this to "/api" - it will cause double /api/api/ URLs!
The endpoints already include /api/ prefix, so VITE_API_URL should be empty.
```

#### **Variable 6: VITE_APP_URL**
```
Name: VITE_APP_URL
Value: https://your-actual-vercel-domain.vercel.app
Environment: ✅ Production ✅ Preview ✅ Development
```

#### **Variable 7: NODE_ENV**
```
Name: NODE_ENV
Value: production
Environment: ✅ Production ✅ Preview ✅ Development
```

---

## 🔐 **Step 3: Generate Secure Secrets**

### **For JWT_SECRET and JWT_REFRESH_SECRET:**

**Option A - Online Generator:**
1. Go to: https://generate-secret.vercel.app/64
2. Copy the generated string
3. Use it as your JWT_SECRET
4. Generate another one for JWT_REFRESH_SECRET

**Option B - Command Line:**
```bash
# Generate JWT_SECRET (64 characters)
openssl rand -base64 48

# Generate JWT_REFRESH_SECRET (64 characters) 
openssl rand -base64 48
```

**Option C - Manual Generation:**
Use a password manager to generate 64+ character random strings

---

## 🚀 **Step 4: Deploy the Updated Code**

After setting environment variables, you need to deploy the latest fixes:

```bash
# Commit and push the API client fixes
git add src/services/apiClient.ts src/utils/environmentDiagnostic.ts src/main.tsx
git commit -m "fix: improve API client configuration and add environment diagnostic"
git push origin main
```

---

## ⏰ **Step 5: Wait and Test**

1. **Wait 2-3 minutes** for Vercel to redeploy
2. **Check deployment status**: Go to Vercel Dashboard → Deployments
3. **Look for green checkmark** ✅
4. **Test login** on your live site

---

## 🧪 **Step 6: Verify the Fix**

### **Open Your Live Website**
1. Go to your production URL
2. **Open Browser Console**: Press `F12` → Console tab
3. **Try to login** with valid credentials

### **Check Console Output**
You should now see detailed diagnostic information:
```
🔍 Environment Diagnostic
📊 Environment: production
🌐 API Configuration
   Base URL: https://your-domain.vercel.app
   Final Login URL: https://your-domain.vercel.app/api/auth/login
🌐 Making API request: POST https://your-domain.vercel.app/api/auth/login
📡 API Response: { status: 200, statusText: "OK" }
```

### **Success Indicators:**
- ✅ **No 404 errors** in console
- ✅ **Login succeeds** without "API endpoint not available" 
- ✅ **Diagnostic shows correct URLs**
- ✅ **User gets redirected to dashboard**

---

## 🔧 **Troubleshooting**

### **Issue: Still Getting 404 After Setting Variables**

**Solution:**
1. Go to Vercel Dashboard → Deployments
2. Click **"Redeploy"** on the latest deployment 
3. Wait 2-3 minutes
4. Test again

### **Issue: "Database not configured" Error**

**Problem:** DATABASE_URL is not set correctly
**Solution:**
1. Double-check your database URL format
2. Ensure it includes `?sslmode=require` at the end
3. Example: `postgres://user:password@host:5432/dbname?sslmode=require`

### **Issue: Environment Diagnostic Shows Missing Variables**

**Problem:** Variables not set for all environments
**Solution:**
1. In Vercel Environment Variables page
2. **Edit each variable**
3. **Check all boxes**: Production ✅ Preview ✅ Development ✅
4. **Save**

### **Issue: API Still Returns HTML Instead of JSON**

**Problem:** Requests are still going to index.html instead of API
**Solution:**
1. Clear browser cache: `Ctrl + Shift + R`
2. Try incognito/private window
3. Check if VITE_API_URL is set to `/api`

---

## 📋 **Environment Variables Checklist**

Copy this checklist and verify each item:

- [ ] **DATABASE_URL** - Set for all environments
- [ ] **POSTGRES_URL** - Set for all environments  
- [ ] **JWT_SECRET** - 64+ character string, all environments
- [ ] **JWT_REFRESH_SECRET** - Different 64+ character string, all environments
- [ ] **VITE_API_URL** - DELETED or EMPTY (NOT "/api")
- [ ] **VITE_APP_URL** - Set to actual domain for all environments
- [ ] **NODE_ENV** - Set to `production` for all environments
- [ ] **All variables checked** ✅ Production ✅ Preview ✅ Development
- [ ] **Redeployed** after setting variables
- [ ] **Tested login** - works without 404 errors

---

## 🎯 **Expected Timeline**

| Step | Duration | Action |
|------|----------|--------|
| Set Environment Variables | 5 minutes | Add all required variables in Vercel |
| Deploy Code Changes | 2 minutes | Push latest API client fixes |
| Vercel Build & Deploy | 2-3 minutes | Automatic deployment |
| **TOTAL** | **~10 minutes** | **Complete fix** |

---

## 📞 **Need Help?**

### **Check Deployment Logs:**
1. Go to Vercel Dashboard → Deployments
2. Click on latest deployment  
3. Click **"Function Logs"**
4. Look for any error messages

### **Verify Environment Variables:**
1. Go to Settings → Environment Variables
2. Ensure all variables are present
3. Check they're enabled for all environments

### **Test API Directly:**
Open browser console and run:
```javascript
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: 'test' })
})
.then(res => console.log('Status:', res.status, 'Type:', res.headers.get('content-type')))
```

**Expected Result**: Status 400 or 401 with content-type: application/json (NOT 404!)

---

## 🔐 **Security Note**

The environment variables you're setting contain sensitive information:
- ✅ **DATABASE_URL**: Contains database credentials
- ✅ **JWT secrets**: Used for authentication security  
- ✅ **Never share** these values publicly
- ✅ **Use different secrets** for different environments

---

**This fix will resolve your 404 API errors completely!** 

The new diagnostic system will help you verify everything is configured correctly.

**Status**: 🔴 **URGENT - Action Required**  
**Impact**: 🎯 **CRITICAL - Fixes Authentication**  
**Time Required**: ⏱️ **~10 minutes**
