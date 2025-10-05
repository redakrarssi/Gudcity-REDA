# 🔧 Vercel Environment Variables Setup - CRITICAL

## 🚨 **URGENT: Environment Variables Missing**

The login is failing because **environment variables are not configured in Vercel Dashboard**. This is a **CRITICAL** issue that must be fixed immediately.

## 📋 **Required Environment Variables**

### **1. Go to Vercel Dashboard**
1. Visit: https://vercel.com/dashboard
2. Select your project: `gudcity-reda-d8zocejrm-123ridaronaldo-gmailcoms-projects`
3. Click **"Settings"** → **"Environment Variables"**

### **2. Add These CRITICAL Variables**

#### **Database Configuration (REQUIRED)**
```
Key: DATABASE_URL
Value: postgres://your_actual_database_url_here
Environment: Production, Preview, Development
```

```
Key: POSTGRES_URL  
Value: postgres://your_actual_database_url_here
Environment: Production, Preview, Development
```

#### **JWT Secrets (REQUIRED)**
```
Key: JWT_SECRET
Value: your_secure_jwt_secret_32_characters_minimum
Environment: Production, Preview, Development
```

```
Key: JWT_REFRESH_SECRET
Value: your_secure_jwt_refresh_secret_32_characters_minimum
Environment: Production, Preview, Development
```

#### **QR Code Security (REQUIRED)**
```
Key: QR_SECRET_KEY
Value: your_secure_qr_secret_key_64_characters_minimum
Environment: Production, Preview, Development
```

```
Key: QR_ENCRYPTION_KEY
Value: your_secure_qr_encryption_key_64_characters_minimum
Environment: Production, Preview, Development
```

#### **Application Configuration**
```
Key: NODE_ENV
Value: production
Environment: Production, Preview, Development
```

```
Key: VITE_APP_ENV
Value: production
Environment: Production, Preview, Development
```

```
Key: VITE_API_URL
Value: /api
Environment: Production, Preview, Development
```

```
Key: VITE_APP_URL
Value: https://gudcity-reda-d8zocejrm-123ridaronaldo-gmailcoms-projects.vercel.app
Environment: Production, Preview, Development
```

## 🔑 **How to Generate Secure Secrets**

### **JWT Secrets (32+ characters)**
```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### **QR Secrets (64+ characters)**
```bash
# Option 1: Using OpenSSL
openssl rand -base64 64

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

## 🚀 **After Setting Environment Variables**

### **1. Redeploy the Application**
- Go to **"Deployments"** tab in Vercel Dashboard
- Click **"Redeploy"** on the latest deployment
- OR push a new commit to trigger auto-deploy

### **2. Test the Login**
- Visit your deployed URL
- Try logging in with test credentials
- Check browser console for errors

## 🔍 **Verification Steps**

### **1. Check Environment Variables**
- Go to Vercel Dashboard → Settings → Environment Variables
- Verify all variables are set for Production, Preview, and Development
- Ensure no typos in variable names or values

### **2. Test Database Connection**
- Login should work without "Database URL not configured" errors
- Check browser console for database connection success

### **3. Test API Endpoints**
- `/api/auth/login` should return 200 instead of 405
- Authentication should work properly

## ⚠️ **Common Issues**

### **Issue 1: Database URL Format**
```
❌ Wrong: postgresql://user:pass@host:port/db
✅ Correct: postgres://user:pass@host:port/db?sslmode=require
```

### **Issue 2: Environment Scope**
- Make sure variables are set for **ALL environments** (Production, Preview, Development)
- Don't just set for Production

### **Issue 3: Variable Names**
- Use exact names: `DATABASE_URL`, `JWT_SECRET`, etc.
- Case-sensitive: `DATABASE_URL` not `database_url`

## 📞 **If Still Not Working**

### **1. Check Vercel Logs**
- Go to Vercel Dashboard → Functions tab
- Check function logs for errors
- Look for environment variable issues

### **2. Verify Database Access**
- Ensure your database allows connections from Vercel
- Check database firewall settings
- Verify SSL requirements

### **3. Test API Endpoints Directly**
- Try: `https://your-domain.vercel.app/api/auth/login`
- Should return JSON response, not 405 error

---
**Status**: ⚠️ **CRITICAL** - Environment variables must be set for login to work
