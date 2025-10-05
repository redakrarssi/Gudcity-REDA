# 🔒 Secure Environment Variable Configuration

## ⚠️ CRITICAL: Database Credentials Security

**NEVER** use `VITE_` prefix for sensitive data like:
- Database URLs
- JWT secrets
- API keys
- Private tokens

The `VITE_` prefix exposes variables to the browser bundle, making them visible to anyone!

---

## 📋 **Environment Variables Template**

### Backend Variables (Server-Side ONLY)
```bash
# Database Connection (NO VITE_ PREFIX!)
DATABASE_URL=postgresql://user:password@host.region.neon.tech/dbname?sslmode=require
POSTGRES_URL=postgresql://user:password@host.region.neon.tech/dbname?sslmode=require

# JWT Secret (NO VITE_ PREFIX!)
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-64-character-random-string-here

# Admin Tokens (NO VITE_ PREFIX!)
ADMIN_INIT_TOKEN=your-secure-admin-token-here

# Application Settings
NODE_ENV=production
```

### Frontend Variables (Client-Side - Public)
```bash
# API Configuration (Safe to expose)
VITE_API_URL=/api
VITE_APP_URL=https://your-domain.com

# Application Info (Safe to expose)
VITE_APP_NAME=GudCity REDA
VITE_APP_VERSION=10.0.0
```

---

## 🔑 **How to Generate Secure Secrets**

### JWT Secret (64 characters)
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Admin Token (32 characters)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🚀 **Setting Up for Development**

### 1. Create Local .env File
```bash
# Copy the template
cp SECURE_ENV_CONFIG.md .env

# Edit .env and fill in your values
nano .env

# NEVER commit .env to git!
# It's already in .gitignore
```

### 2. Verify Configuration
```bash
# Check that sensitive variables are NOT accessible from browser
node -e "
const dotenv = require('dotenv');
dotenv.config();
console.log('DATABASE_URL accessible from Node.js:', !!process.env.DATABASE_URL);
console.log('JWT_SECRET accessible from Node.js:', !!process.env.JWT_SECRET);
"
```

### 3. Test Security
Open your app in the browser console:
```javascript
// These should all be undefined ✅
console.log(import.meta.env.DATABASE_URL);        // undefined ✅
console.log(import.meta.env.POSTGRES_URL);        // undefined ✅
console.log(import.meta.env.JWT_SECRET);          // undefined ✅

// These should be defined (public variables)
console.log(import.meta.env.VITE_API_URL);        // "/api" ✅
console.log(import.meta.env.VITE_APP_URL);        // "https://..." ✅
```

---

## 🌐 **Setting Up for Production (Vercel)**

### Via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Settings" → "Environment Variables"
4. Add each variable:

#### Add DATABASE_URL
- **Key**: `DATABASE_URL`
- **Value**: `postgresql://...`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development

#### Add JWT_SECRET
- **Key**: `JWT_SECRET`
- **Value**: Your 64-character secret
- **Environment**: ✅ Production, ✅ Preview, ✅ Development

#### Add ADMIN_INIT_TOKEN
- **Key**: `ADMIN_INIT_TOKEN`
- **Value**: Your admin token
- **Environment**: ✅ Production

#### Add Public Variables
- **Key**: `VITE_APP_URL`
- **Value**: `https://your-domain.com`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development

### Via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Add environment variables
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add ADMIN_INIT_TOKEN production
vercel env add VITE_APP_URL production
```

---

## ✅ **Security Checklist**

### Before Deployment
- [ ] Removed `VITE_` prefix from `DATABASE_URL`
- [ ] Removed `VITE_` prefix from `JWT_SECRET`
- [ ] Removed `VITE_` prefix from all sensitive variables
- [ ] Generated strong JWT secret (64+ characters)
- [ ] Added all variables to Vercel project settings
- [ ] Verified variables are not in client bundle
- [ ] Tested API endpoints work with new configuration

### After Deployment
- [ ] Downloaded production bundle and searched for secrets
- [ ] Confirmed `DATABASE_URL` is not in bundle
- [ ] Confirmed `JWT_SECRET` is not in bundle
- [ ] Tested login flow works
- [ ] Verified database connections work
- [ ] Checked Vercel function logs for errors

---

## 🔍 **Verify Security After Deployment**

### Download and Check Production Bundle
```bash
# Download the main JavaScript bundle
curl https://your-domain.com/assets/index-*.js > bundle.js

# Search for sensitive data (should find NOTHING)
grep -i "postgresql://" bundle.js
grep -i "DATABASE_URL" bundle.js
grep -i "JWT_SECRET" bundle.js

# If any matches found: SECURITY BREACH! 🚨
# If no matches found: SECURE! ✅
```

### Check Browser DevTools
1. Open your website
2. Open DevTools (F12)
3. Go to "Application" tab
4. Check "Local Storage"
5. Verify no sensitive data stored there

### Check Source Code
1. Open DevTools (F12)
2. Go to "Sources" tab
3. Search for "DATABASE" in all files
4. Should only find API calls, not actual credentials

---

## 🆘 **If Credentials Were Exposed**

### Immediate Actions
1. **Rotate Database Password**
   ```bash
   # In Neon dashboard:
   # 1. Go to your database
   # 2. Click "Connection Details"
   # 3. Click "Reset Password"
   # 4. Update DATABASE_URL in Vercel
   ```

2. **Regenerate JWT Secret**
   ```bash
   # Generate new secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Update in Vercel
   vercel env rm JWT_SECRET production
   vercel env add JWT_SECRET production
   ```

3. **Revoke All Tokens**
   ```sql
   -- In your database, revoke all existing tokens
   INSERT INTO revoked_tokens (jti, user_id, reason)
   SELECT jti, user_id, 'Security incident - credentials exposed'
   FROM auth_tokens
   WHERE expires_at > NOW();
   ```

4. **Force All Users to Re-login**
   ```sql
   -- Delete all auth tokens
   DELETE FROM auth_tokens WHERE expires_at > NOW();
   ```

5. **Audit Access Logs**
   - Check Neon database access logs
   - Check Vercel function logs
   - Look for suspicious activity

---

## 📚 **Reference**

### What's Safe to Expose?
✅ API endpoints (e.g., `/api/auth/login`)  
✅ Application name and version  
✅ Public CDN URLs  
✅ Feature flags (non-sensitive)  
✅ Analytics IDs (public ones like Google Analytics)  

### What's NOT Safe to Expose?
❌ Database URLs  
❌ Database passwords  
❌ JWT secrets  
❌ API keys (private)  
❌ Admin tokens  
❌ Encryption keys  
❌ OAuth client secrets  
❌ Private API tokens  

### Vite Environment Variable Rules
- **`VITE_*` prefix**: Exposed to client (browser)
- **No prefix**: Server-only (not exposed)
- **`import.meta.env.VITE_*`**: Accessible in browser
- **`process.env.*`**: Only accessible in Node.js (backend)

---

## 🎯 **Summary**

✅ Use `VITE_` prefix only for public variables  
✅ Never use `VITE_` for sensitive data  
✅ All backend API routes use `process.env` (no `VITE_`)  
✅ Verify security before and after deployment  
✅ Rotate credentials if exposed  

**Remember**: If in doubt, DON'T use `VITE_` prefix!

---

**Last Updated:** 2025-10-05  
**Security Level:** 🔒 CRITICAL
