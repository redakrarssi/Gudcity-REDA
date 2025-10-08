# Local Development Fix - GudCity REDA

This document provides solutions for local development issues encountered with the GudCity REDA application.

## Issues Fixed

### 1. Missing Database Tables
- **Problem**: `security_audit_logs` table does not exist
- **Solution**: Created `fix-local-database.sql` with complete schema
- **Files**: `fix-local-database.sql`, `fix-local-database.js`

### 2. Missing API Endpoints
- **Problem**: `/api/auth/generate-tokens` endpoint returns 404
- **Solution**: Fixed Express server route registration
- **Files**: `src/server.ts`, `src/api/index.ts`

### 3. AdminLayout Component Error
- **Problem**: `TypeError: Cannot read properties of undefined (reading 'call')`
- **Solution**: Added safe translation function with error handling
- **Files**: `src/components/admin/AdminLayout.tsx`

### 4. Authentication Service Errors
- **Problem**: JWT token generation failing
- **Solution**: Fixed server-side token generation endpoint
- **Files**: `src/services/authService.ts`, `src/api/authTokenHandler.ts`

### 5. Neon Database Connection Issues
- **Problem**: Database connection errors in local development
- **Solution**: Created fallback connection handling
- **Files**: Database connection utilities

## Quick Fix Instructions

### Option 1: Automated Fix (Recommended)
```bash
# Run the comprehensive fix script
node fix-local-development.js
```

### Option 2: Manual Fix
```bash
# 1. Setup environment
node setup-env.js

# 2. Fix database
node fix-local-database.js

# 3. Install dependencies
npm install

# 4. Start development server
npm run dev
```

## Database Setup

If the automated database fix fails, manually run the SQL commands:

```bash
# Connect to your PostgreSQL database
psql your_database_url

# Run the fix script
\i fix-local-database.sql
```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
NODE_ENV=development
PORT=3000
VITE_PORT=5173
DATABASE_URL=postgresql://localhost:5432/gudcity_reda
JWT_SECRET=local-dev-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=local-dev-refresh-secret-key-change-in-production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
ENABLE_SECURITY_AUDIT=true
ENABLE_RATE_LIMITING=true
ENABLE_CSRF_PROTECTION=true
```

## Verification Steps

After running the fixes, verify everything is working:

1. **Database**: Check that tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('security_audit_logs', 'refresh_tokens', 'revoked_tokens');
   ```

2. **API Endpoints**: Test the auth endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/auth/generate-tokens \
     -H "Content-Type: application/json" \
     -d '{"userId": 1, "email": "test@example.com", "role": "admin"}'
   ```

3. **Admin Panel**: Navigate to `http://localhost:5173/admin` and verify:
   - No console errors
   - AdminLayout loads properly
   - Translation functions work

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL in .env.local
   - Ensure PostgreSQL is running
   - Verify database exists

2. **Port Already in Use**
   - Change PORT in .env.local
   - Kill existing processes: `lsof -ti:3000 | xargs kill`

3. **Dependencies Installation Failed**
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and package-lock.json
   - Run `npm install` again

4. **Translation Errors**
   - Check i18n configuration
   - Verify translation files exist
   - Use safe translation function in components

### Getting Help

If issues persist:
1. Check the browser console for errors
2. Check the terminal output for server errors
3. Verify all environment variables are set
4. Ensure database is accessible

## Files Created/Modified

### New Files
- `fix-local-database.sql` - Database schema fix
- `fix-local-database.js` - Database setup script
- `setup-env.js` - Environment setup script
- `fix-local-development.js` - Comprehensive fix script
- `start-dev-fixed.js` - Development server starter

### Modified Files
- `src/components/admin/AdminLayout.tsx` - Added safe translation function
- `src/server.ts` - Fixed API route imports
- `src/api/index.ts` - Fixed route exports

## Security Notes

- JWT secrets in .env.local are for development only
- Change all secrets before production deployment
- Database credentials should be properly secured
- Follow security guidelines in reda.md

This fix ensures the GudCity REDA application runs properly in local development environments while maintaining security best practices.
