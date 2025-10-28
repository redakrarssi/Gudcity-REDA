# Authentication and Database Fix - December 2024

## Overview

This document describes the comprehensive fix for critical authentication and database errors in the GudCity REDA application, following the reda.md guidelines for security-first development.

## Problems Addressed

### 1. Missing Database Functions
- `is_account_locked(unknown)` does not exist
- `reset_failed_login_attempts(unknown)` does not exist

### 2. Missing Database Table
- `security_audit_logs` does not exist

### 3. JWT Authentication Browser Compatibility
- `jsonwebtoken` library failing to import in browser
- Error: "Function.prototype.bind called on incompatible undefined"
- JWT operations running client-side (security risk)

## Solutions Implemented

### 1. Database Migrations Created

#### Security Audit Logs Table
**File**: `db/security_audit_logs_schema.sql`

Creates comprehensive security logging infrastructure:
- `security_audit_logs` table for tracking all security events
- Indexed columns for efficient querying (action_type, user_id, ip_address, timestamp)
- JSONB details column for flexible event metadata
- Helper views:
  - `recent_security_events` - Last 24 hours of security events
  - `failed_login_analysis` - Analysis of failed login attempts by user
  - `suspicious_activity_monitor` - IP-based suspicious activity tracking
- Maintenance function: `cleanup_old_security_logs(retention_days)` for log rotation

#### Failed Login Tracking Functions
**File**: `db/failed_login_tracking_schema.sql` (already existed, now verified)

Provides account security features:
- `record_failed_login_attempt()` - Records failed attempts and applies lockout
- `is_account_locked()` - Checks if an account is currently locked
- `reset_failed_login_attempts()` - Resets counters on successful login
- `get_lockout_remaining_time()` - Returns remaining lockout duration
- Columns added to `users` table:
  - `failed_login_attempts` - Counter for failed attempts
  - `last_failed_login` - Timestamp of last failure
  - `account_locked_until` - Lockout expiration timestamp
  - `status` - User status (active, banned, restricted)

#### Migration Runner Script
**File**: `db/run-security-migrations.mjs`

Automated migration runner with verification:
- Executes all security-related SQL migrations
- Verifies database functions exist
- Verifies tables are created
- Provides detailed success/failure reporting
- Safe to run multiple times (uses `IF NOT EXISTS` clauses)

**Usage**:
```bash
# Run the migrations
node db/run-security-migrations.mjs

# Or using npm
npm run migrate:security
```

### 2. Server-Side JWT Token Architecture

#### New API Endpoints
**File**: `src/api/authTokenHandler.ts`

Moved all JWT operations to server-side with endpoints:

1. **POST /api/auth/generate-tokens**
   - Generates new access and refresh tokens
   - Body: `{ userId, email, role }`
   - Returns: `{ accessToken, refreshToken, expiresIn }`
   - Validates JWT secrets before generation
   - Stores refresh tokens in database

2. **POST /api/auth/verify-token**
   - Verifies an access token
   - Body: `{ token }`
   - Returns: `{ valid, payload }`
   - Uses server-side JWT verification

3. **POST /api/auth/refresh-token**
   - Refreshes access token using refresh token
   - Body: `{ refreshToken }`
   - Returns: `{ accessToken, refreshToken, expiresIn }`
   - Revokes old refresh token and generates new pair

4. **POST /api/auth/revoke-tokens**
   - Revokes all tokens for a user (logout)
   - Body: `{ userId }`
   - Returns: `{ success, message }`
   - Marks all user's refresh tokens as revoked

#### Route Registration
**File**: `src/api/authRoutes.ts`

Registers all authentication routes at `/api/auth/*`

**File**: `src/api/authTokenRoutes.ts`

Defines the Express router for token endpoints

### 3. Client-Side Refactoring

#### Auth Service Refactoring
**File**: `src/services/authService.ts`

**Changes Made**:
1. Removed direct `jsonwebtoken` imports
2. Removed server-only imports (`jwtSecretManager`, `tokenBlacklist`, etc.)
3. Refactored functions to call server-side API endpoints:
   - `generateTokens()` → calls `/api/auth/generate-tokens`
   - `refreshTokens()` → calls `/api/auth/refresh-token`
   - `verifyToken()` → calls `/api/auth/verify-token`
   - `revokeAllUserTokens()` → calls `/api/auth/revoke-tokens`
4. Removed unused helper functions (moved to server-side):
   - `storeRefreshToken()` - Now in authTokenHandler.ts
   - `parseJwtExpiry()` - Now in authTokenHandler.ts
   - `blacklistToken()` - Server-side only
   - `rotateJwtSecrets()` - Server-side only

**Benefits**:
- ✅ No more browser compatibility issues
- ✅ JWT secrets never exposed to client
- ✅ Proper separation of concerns
- ✅ Better security posture
- ✅ Follows reda.md security guidelines

#### Auth Context (No Changes Required)
**File**: `src/contexts/AuthContext.tsx`

The AuthContext already uses `authService.generateTokens()`, which now internally calls the server-side API. No changes needed here - the refactoring is transparent.

## Security Improvements

### 1. Failed Login Protection
- **Account Lockout**: 5 failed attempts = 15-minute lockout
- **Automatic Unlock**: Lockout automatically expires after duration
- **Progressive Lockout**: Multiple lockouts increase duration
- **IP Tracking**: Track attempts by IP address for forensics
- **User Agent Logging**: Record browser/device information

### 2. Security Audit Trail
- **Comprehensive Logging**: All security events logged to database
- **Event Categories**:
  - FAILED_LOGIN
  - SUCCESSFUL_LOGIN
  - ACCOUNT_LOCKOUT
  - SUSPICIOUS_ACTIVITY
  - LOGIN_ATTEMPTS_RESET
- **Forensic Analysis**: Views for quick security monitoring
- **Automatic Cleanup**: Old logs cleaned up after 90 days (configurable)

### 3. JWT Token Security
- **Server-Side Only**: JWT operations never run in browser
- **Secret Protection**: JWT secrets never exposed to client
- **Token Rotation**: Refresh tokens are single-use (revoked after use)
- **Database Validation**: Refresh tokens validated against database
- **Issuer/Audience Verification**: Tokens include issuer and audience claims
- **Clock Tolerance**: 5-second tolerance for clock skew

## Migration Guide

### Step 1: Run Database Migrations

```bash
# Make sure your DATABASE_URL environment variable is set
export DATABASE_URL="your-postgres-connection-string"

# Run the migration script
node db/run-security-migrations.mjs
```

**Expected Output**:
```
🚀 Starting Security Migrations for GudCity REDA
============================================================
🔌 Testing database connection...
✅ Database connection successful
📦 Running migrations...
============================================================
📄 Executing: failed_login_tracking_schema.sql
✅ Successfully executed: failed_login_tracking_schema.sql
📄 Executing: security_audit_logs_schema.sql
✅ Successfully executed: security_audit_logs_schema.sql
============================================================
📊 Migration Summary:
  ✅ Successful: 2
  ❌ Failed: 0
============================================================
🔍 Verifying database functions...
  ✅ Function 'is_account_locked' exists
  ✅ Function 'reset_failed_login_attempts' exists
  ✅ Function 'record_failed_login_attempt' exists
🔍 Verifying database tables...
  ✅ Table 'failed_login_attempts' exists
  ✅ Table 'security_audit_logs' exists
============================================================
🎉 All migrations completed successfully!
```

### Step 2: Verify Server Startup

The server should now start without JWT-related errors:

```bash
npm run dev
```

**Expected Output**:
```
✅ Security validation passed - starting server
✅ Registered auth token routes
✅ Registered auth routes at /api/auth
Server running on port 3000
```

### Step 3: Test Authentication

1. **Test Login**:
   - Navigate to `/login`
   - Enter credentials
   - Should successfully log in without JWT errors

2. **Test Failed Login Protection**:
   - Enter wrong password 5 times
   - Account should lock for 15 minutes
   - Error message should display remaining time

3. **Verify Token Generation**:
   - Check browser DevTools Network tab
   - Should see POST to `/api/auth/generate-tokens`
   - No client-side JWT errors

## Affected Files Summary

### Created Files
- `db/security_audit_logs_schema.sql` - Security audit table and views
- `db/run-security-migrations.mjs` - Migration runner script
- `src/api/authTokenHandler.ts` - Server-side JWT operations
- `src/api/authTokenRoutes.ts` - Token API routes
- `src/api/authRoutes.ts` - Main auth routes file
- `AUTHENTICATION_DATABASE_FIX.md` - This documentation

### Modified Files
- `src/services/authService.ts` - Refactored to use API calls instead of JWT imports
- `src/services/failedLoginService.ts` - Now works with database functions
- `src/services/securityAuditService.ts` - Now works with security_audit_logs table

### Verified Existing Files
- `db/failed_login_tracking_schema.sql` - Already had necessary functions
- `db/auth_schema.sql` - Already had user table columns
- `src/contexts/AuthContext.tsx` - No changes needed
- `src/pages/auth/Login.tsx` - No changes needed

## Database Schema Reference

### security_audit_logs Table
```sql
CREATE TABLE security_audit_logs (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) DEFAULT 'unknown',
  user_agent TEXT DEFAULT 'unknown',
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### failed_login_attempts Table
```sql
CREATE TABLE failed_login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  failure_reason VARCHAR(100) DEFAULT 'invalid_credentials'
);
```

### Users Table Additions
```sql
ALTER TABLE users
  ADD COLUMN failed_login_attempts INTEGER DEFAULT 0,
  ADD COLUMN last_failed_login TIMESTAMP WITH TIME ZONE,
  ADD COLUMN account_locked_until TIMESTAMP WITH TIME ZONE,
  ADD COLUMN status VARCHAR(20) DEFAULT 'active';
```

## API Usage Examples

### Generate Tokens (Server-Side Only)
```typescript
// From client-side code
import { generateTokens } from './services/authService';

const tokens = await generateTokens({
  id: user.id,
  email: user.email,
  role: user.role
});

// tokens = { accessToken, refreshToken, expiresIn }
```

### Verify Token
```typescript
import { verifyToken } from './services/authService';

const payload = await verifyToken(accessToken);
if (payload) {
  // Token is valid, payload contains userId, email, role
} else {
  // Token is invalid or expired
}
```

### Refresh Tokens
```typescript
import { refreshTokens } from './services/authService';

const newTokens = await refreshTokens(refreshToken);
if (newTokens) {
  // Store new tokens
} else {
  // Refresh token invalid, require re-login
}
```

### Revoke Tokens (Logout)
```typescript
import { revokeAllUserTokens } from './services/authService';

const success = await revokeAllUserTokens(userId);
if (success) {
  // All tokens revoked, clear local storage
}
```

## Monitoring and Maintenance

### View Recent Security Events
```sql
SELECT * FROM recent_security_events;
```

### Check Failed Login Attempts
```sql
SELECT * FROM failed_login_analysis
WHERE failed_attempts >= 3
ORDER BY failed_attempts DESC;
```

### Monitor Suspicious Activity
```sql
SELECT * FROM suspicious_activity_monitor
WHERE event_count >= 10
ORDER BY event_count DESC;
```

### Clean Up Old Logs
```sql
-- Clean logs older than 90 days
SELECT cleanup_old_security_logs(90);
```

### Check Account Lock Status
```sql
-- Check if specific account is locked
SELECT is_account_locked('user@example.com');

-- Get remaining lockout time
SELECT get_lockout_remaining_time('user@example.com');
```

## Troubleshooting

### Issue: Migration Script Fails
**Solution**: 
```bash
# Check database connection
echo $DATABASE_URL

# Test direct connection
psql $DATABASE_URL

# Run migrations manually
psql $DATABASE_URL -f db/failed_login_tracking_schema.sql
psql $DATABASE_URL -f db/security_audit_logs_schema.sql
```

### Issue: JWT Token Generation Fails
**Solution**:
- Check that JWT_SECRET and JWT_REFRESH_SECRET are set in environment
- Secrets should be at least 32 characters long
- Verify server logs for specific error messages

### Issue: Account Locked Unexpectedly
**Solution**:
```sql
-- Manually unlock account
UPDATE users 
SET account_locked_until = NULL,
    failed_login_attempts = 0,
    last_failed_login = NULL
WHERE email = 'user@example.com';
```

## Performance Considerations

- **Indexes Created**: All frequently queried columns are indexed
- **JSONB Details**: Uses GIN index for efficient JSON queries
- **View Optimization**: Views use time-based filtering to limit dataset size
- **Log Rotation**: Automatic cleanup prevents table bloat

## Security Compliance

This implementation follows reda.md security guidelines:
- ✅ Server-side JWT operations only
- ✅ No sensitive secrets in browser
- ✅ Comprehensive audit logging
- ✅ Account lockout protection
- ✅ Brute force attack prevention
- ✅ SQL injection prevention (parameterized queries)
- ✅ Input validation on all endpoints
- ✅ Secure error messages (no information leakage)

## Next Steps

1. **Configure Log Rotation**: Set up cron job for `cleanup_old_security_logs()`
2. **Monitor Dashboards**: Create admin dashboard for security events
3. **Alert System**: Set up alerts for suspicious activity patterns
4. **Rate Limiting**: Consider adding IP-based rate limiting
5. **Two-Factor Authentication**: Add MFA for sensitive accounts

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Review security_audit_logs table for authentication events
3. Verify database functions exist using migration verifier
4. Consult reda.md for security best practices

---

**Last Updated**: December 2024
**Status**: ✅ Production Ready
**Version**: 1.0.0

