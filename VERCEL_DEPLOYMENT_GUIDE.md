# 🚀 Vercel Deployment Guide - API Configuration

## Overview
This guide will help you configure environment variables in Vercel to fix the 404 errors on `/apireda` testing page and ensure all API functions work correctly.

## ⚠️ Current Issue
All API functions in `/apireda` are returning **404 errors** because the required environment variables are not set in Vercel.

## 🔧 Required Environment Variables

To deploy your serverless API functions to Vercel, you **MUST** configure the following environment variables in your Vercel project:

### 1. Database Configuration (CRITICAL)
```bash
# Main database URL - REQUIRED for all API functions
DATABASE_URL=postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require

# Backup/Client-side reference (optional but recommended)
VITE_DATABASE_URL=postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### 2. JWT Authentication Secrets (CRITICAL)
```bash
# JWT access token secret (64 characters minimum)
JWT_SECRET=2249c269f69187040d3563d7bdff911b2f21016df78a47a74d31ed12d7dae632e9327daade8cf0a1009933e805c424f6dd7238d76c911d683cbe27c2a9863052

# JWT refresh token secret (64 characters minimum)
JWT_REFRESH_SECRET=54e9e6a1d870ee06bff4a0ac801ebc7080bdfd4e4001f229afa8f93ab895a3f40f5bc6a2df4d7d3f0e535a1c6f41197d2063780d045fd9c08a1e087f34f75490

# Client-side copies (for frontend)
VITE_JWT_SECRET=2249c269f69187040d3563d7bdff911b2f21016df78a47a74d31ed12d7dae632e9327daade8cf0a1009933e805c424f6dd7238d76c911d683cbe27c2a9863052

VITE_JWT_REFRESH_SECRET=54e9e6a1d870ee06bff4a0ac801ebc7080bdfd4e4001f229afa8f93ab895a3f40f5bc6a2df4d7d3f0e535a1c6f41197d2063780d045fd9c08a1e087f34f75490
```

### 3. QR Code Security (REQUIRED)
```bash
# QR secret key (64 characters minimum)
VITE_QR_SECRET_KEY=09726b32096f175aa7e0fa7b0494fcda12937c92ad253ec396017e950aaea513fc313d77cd586139ec88ab263e1df9b21edd9444f8d8d385c8c2b8ead31aefcb

# QR encryption key (64 characters minimum)
VITE_QR_ENCRYPTION_KEY=115cef019a8b8564387d075d4232ec32ad94866d6577424e82d068b7d8d0e6e631de90b39e7bfa8592c83076c39ada47e9dbea230a5bcda296488c6d71f9f4e6
```

### 4. Node Environment
```bash
NODE_ENV=production
```

---

## 📝 Step-by-Step Setup Instructions

### Option 1: Using Vercel Dashboard (Recommended)

1. **Go to your Vercel project dashboard**
   - Navigate to: https://vercel.com/your-username/your-project

2. **Open Settings**
   - Click on the **Settings** tab

3. **Navigate to Environment Variables**
   - Click on **Environment Variables** in the sidebar

4. **Add Each Variable**
   For each variable listed above:
   - Click **Add New**
   - Enter the **Name** (e.g., `DATABASE_URL`)
   - Enter the **Value** (the connection string or secret)
   - Select **All Environments** (Production, Preview, Development)
   - Click **Save**

5. **Redeploy Your Application**
   - Go to the **Deployments** tab
   - Click the three dots (...) on your latest deployment
   - Select **Redeploy**
   - Check **Use existing Build Cache** (optional)
   - Click **Redeploy**

### Option 2: Using Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Add environment variables
vercel env add DATABASE_URL production
# Paste the value when prompted

vercel env add JWT_SECRET production
# Paste the value when prompted

vercel env add JWT_REFRESH_SECRET production
# Paste the value when prompted

vercel env add VITE_QR_SECRET_KEY production
# Paste the value when prompted

vercel env add VITE_QR_ENCRYPTION_KEY production
# Paste the value when prompted

# Pull environment variables to your local .env file
vercel env pull

# Deploy
vercel --prod
```

---

## 🧪 Testing the API

### 1. Test Health Endpoint First
After deploying, test the health endpoint:

```bash
# Replace with your actual Vercel URL
curl https://your-app.vercel.app/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-31T...",
    "services": {
      "database": {
        "status": "healthy",
        "responseTime": 123
      }
    }
  }
}
```

### 2. Test Auth Endpoint
```bash
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### 3. Use the /apireda Testing Page
After successful deployment:
1. Navigate to: `https://your-app.vercel.app/apireda`
2. Click **"Test All Functions"**
3. All functions should now return ✅ success status (or appropriate errors for invalid test data)

---

## 🔍 Troubleshooting

### Problem: Still Getting 404 Errors

**Cause:** API routes not properly configured

**Solution:**
1. Verify `vercel.json` has the rewrite rules:
```json
"rewrites": [
  {
    "source": "/api/:path*",
    "destination": "/api/:path*"
  }
]
```

2. Check that API files are in the correct location:
```
api/
├── _lib/
├── _middleware/
├── auth/
│   └── [action].ts
├── businesses/
│   └── [...slug].ts
├── customers/
│   └── [...slug].ts
└── health.ts
```

### Problem: Database Connection Errors

**Cause:** DATABASE_URL not set or incorrect

**Solutions:**
1. Verify DATABASE_URL is set in Vercel:
   ```bash
   vercel env ls
   ```

2. Check the database URL format:
   ```
   postgres://username:password@host:port/database?sslmode=require
   ```

3. Test database connection directly:
   ```bash
   psql "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require"
   ```

### Problem: Authentication Errors

**Cause:** JWT secrets not set

**Solution:**
1. Verify JWT_SECRET and JWT_REFRESH_SECRET are set
2. Ensure they are at least 32 characters long
3. Redeploy after adding secrets

### Problem: CORS Errors

**Cause:** Missing CORS headers

**Solution:** The updated `vercel.json` includes CORS headers. If issues persist:
1. Check browser console for specific CORS errors
2. Verify the frontend URL matches your deployment
3. Ensure API requests include proper credentials

---

## 🎯 Verification Checklist

Before considering the deployment complete, verify:

- [ ] All environment variables are set in Vercel
- [ ] Latest code is deployed to Vercel
- [ ] `/api/health` endpoint returns 200 OK
- [ ] `/apireda` page loads without errors
- [ ] At least one API test on `/apireda` returns success
- [ ] Authentication flow works (login/register)
- [ ] No console errors in browser dev tools

---

## 📊 API Endpoints Structure

Your API has the following serverless functions:

### Authentication: `/api/auth/[action]`
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/verify` - Verify token
- `GET /api/auth/me` - Get current user

### Business Management: `/api/businesses/[...slug]`
- `GET /api/businesses` - List businesses
- `POST /api/businesses` - Create business
- `GET /api/businesses/:id` - Get business
- `PUT /api/businesses/:id` - Update business
- `DELETE /api/businesses/:id` - Delete business
- `GET /api/businesses/:id/customers` - Get business customers
- `GET /api/businesses/:id/programs` - Get loyalty programs

### Customers: `/api/customers/[...slug]`
- Similar CRUD pattern for customers

### Points: `/api/points/[action]`
- Points awarding and redemption

### QR Operations: `/api/qr/[action]`
- QR code generation and validation

### Notifications: `/api/notifications/[...route]`
- Notification management

### Health Check: `/api/health`
- System health and database connectivity

---

## 🔒 Security Best Practices

1. **Never commit secrets to Git**
   - All secrets are in `.env.local` (gitignored)
   - Use Vercel's environment variables

2. **Rotate secrets periodically**
   - Generate new JWT secrets every 90 days
   - Update in Vercel and redeploy

3. **Use different secrets for different environments**
   - Production secrets should differ from development
   - Use Vercel's environment scoping

4. **Monitor API usage**
   - Check Vercel analytics regularly
   - Set up alerts for unusual activity

5. **Keep dependencies updated**
   - Run `npm audit` regularly
   - Update @neondatabase/serverless and other packages

---

## 📚 Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Neon Database Docs](https://neon.tech/docs/introduction)
- [API Testing Guide](./README_API_TESTING.md)

---

## 🆘 Getting Help

If you're still experiencing issues:

1. Check Vercel function logs:
   - Dashboard → Your Project → Functions → View Logs

2. Enable verbose logging:
   ```bash
   vercel logs your-deployment-url --follow
   ```

3. Test locally first:
   ```bash
   vercel dev
   ```

4. Check the API health endpoint response for detailed error messages

---

**Last Updated:** 2025-10-31
**Status:** ✅ Configuration Complete
**Next Steps:** Deploy and test all endpoints
