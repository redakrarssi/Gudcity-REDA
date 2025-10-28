# Admin Settings Database Integration Fix

This document outlines the comprehensive fixes applied to resolve `/admin/settings` database integration and console errors in the GudCity REDA platform.

## 🐛 Issues Fixed

### Database Schema Issues
- ✅ Missing `phone` column in users table
- ✅ Missing `password_hash` column in users table  
- ✅ Missing `two_factor_enabled` column
- ✅ Missing `notification_settings` JSONB column
- ✅ Missing `updated_at` timestamp column
- ✅ Missing `status` column for user status management

### JWT Authentication Issues
- ✅ JWT token generation failing with "Function.prototype.bind called on incompatible undefined"
- ✅ Environment variable validation and error handling
- ✅ Dynamic import issues with jsonwebtoken library
- ✅ Improved error messages for missing JWT secrets

### PostgreSQL Query Issues  
- ✅ Invalid JSON operator usage: `operator does not exist: record ->> unknown`
- ✅ Analytics queries failing due to incorrect JSON operators on non-JSON columns
- ✅ Column existence checking before queries

### Admin Panel Integration
- ✅ Complete admin settings service implementation
- ✅ Database-backed settings storage
- ✅ Profile update functionality
- ✅ Password change functionality
- ✅ Error handling throughout admin panel

## 📁 Files Created/Modified

### New Files Created
- `db/admin_settings_schema.sql` - Database schema for admin settings
- `src/services/adminSettingsService.ts` - Service for managing admin settings
- `src/utils/adminDbInit.ts` - Database initialization utility
- `scripts/init-admin-db.mjs` - Database setup script
- `ADMIN_SETTINGS_FIX_README.md` - This documentation

### Files Modified
- `src/services/authService.ts` - Enhanced JWT token generation with better error handling
- `src/services/userSettingsService.ts` - Fixed password column handling and phone field support
- `src/services/analyticsDbService.ts` - Fixed JSON operator usage in queries
- `src/pages/admin/Settings.tsx` - Enhanced error handling for database issues
- `package.json` - Added admin database initialization scripts

## 🚀 Setup Instructions

### 1. Environment Variables

Ensure these environment variables are set in your `.env` file:

```bash
# Database
VITE_DATABASE_URL=postgres://username:password@host:port/database

# JWT Secrets (minimum 32 characters each)
VITE_JWT_SECRET=your_secure_jwt_secret_minimum_32_characters_long
VITE_JWT_REFRESH_SECRET=your_secure_jwt_refresh_secret_minimum_32_characters_long

# QR Code Security (minimum 64 characters)
VITE_QR_SECRET_KEY=your_secure_qr_secret_key_minimum_64_characters_long
```

### 2. Database Setup

Run the admin database initialization script:

```bash
npm run admin:init-db
```

This script will:
- Add missing columns to the `users` table
- Create the `admin_settings` table
- Insert default admin settings
- Add necessary indexes and triggers
- Verify the installation

### 3. Health Check

Verify the admin database setup:

```bash
npm run admin:check-health
```

### 4. Manual Database Setup (Alternative)

If you prefer to run the SQL manually, execute the schema file:

```sql
-- Run the contents of db/admin_settings_schema.sql in your database
```

## 🔧 Usage

### Admin Settings Service

```typescript
import { AdminSettingsService } from '../services/adminSettingsService';

// Get all admin settings
const settings = await AdminSettingsService.getAllSettings();

// Update settings
await AdminSettingsService.updateSettings({
  general: {
    site_name: 'My Loyalty Platform',
    maintenance_mode: false
  },
  security: {
    password_min_length: 12,
    two_factor_auth_required: true
  }
});

// Get a specific setting
const siteName = await AdminSettingsService.getSetting('site_name');

// Set a specific setting
await AdminSettingsService.setSetting('feature_flag', true, 'general');
```

### User Settings Service (Enhanced)

```typescript
import { UserSettingsService } from '../services/userSettingsService';

// Update user profile (now handles missing columns gracefully)
const success = await UserSettingsService.updateUserSettings(userId, {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890', // Will handle missing phone column
  two_factor_enabled: true
});

// Update user password (handles both password and password_hash columns)
const passwordChanged = await UserSettingsService.updateUserPassword(
  userId,
  'currentPassword',
  'newPassword'
);
```

### Database Initialization Utility

```typescript
import { AdminDbInitializer } from '../utils/adminDbInit';

// Initialize admin database features
await AdminDbInitializer.initializeAdminDatabase();

// Check database health
const health = await AdminDbInitializer.checkAdminDatabaseHealth();
console.log('Database health:', health);

// Force re-initialization (development/testing)
await AdminDbInitializer.forceReinitialize();
```

## 🛠️ Features

### Enhanced Error Handling
- Graceful handling of missing database columns
- User-friendly error messages for database configuration issues
- Automatic fallbacks for authentication when JWT generation fails
- Detailed logging for troubleshooting

### Database Flexibility
- Automatic detection of existing columns before operations
- Support for both `password` and `password_hash` columns
- Graceful handling of missing JSONB columns
- Backward compatibility with existing databases

### Admin Settings Management
- Database-backed settings storage using JSONB
- Categorized settings (general, security, notifications, payments)
- Default settings initialization
- Audit trail for settings changes

### JWT Authentication Improvements
- Better error handling for missing environment variables
- Improved dynamic imports for jsonwebtoken
- Enhanced token validation and generation
- Security warnings for weak secrets

## 🔍 Troubleshooting

### Common Issues

#### 1. "Column does not exist" errors
**Solution**: Run the database initialization script:
```bash
npm run admin:init-db
```

#### 2. JWT token generation errors
**Solution**: Check your environment variables:
```bash
# Ensure these are set and at least 32 characters long
echo $VITE_JWT_SECRET
echo $VITE_JWT_REFRESH_SECRET
```

#### 3. PostgreSQL JSON operator errors
**Solution**: The analytics queries have been fixed to use proper JSONB operators with COALESCE for safety.

#### 4. Admin settings not loading
**Solution**: Verify admin_settings table exists:
```sql
SELECT COUNT(*) FROM admin_settings;
```

### Database Migration Issues

If you encounter issues with the automatic migration:

1. **Check database permissions**:
   ```sql
   -- Ensure your user has necessary privileges
   GRANT ALL PRIVILEGES ON DATABASE your_database TO your_user;
   ```

2. **Manual column addition**:
   ```sql
   -- Add missing columns manually if automatic migration fails
   ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
   ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
   -- ... (see db/admin_settings_schema.sql for complete list)
   ```

3. **Check for existing data conflicts**:
   ```sql
   -- Check for any data that might conflict with new columns
   SELECT COUNT(*) FROM users WHERE phone IS NOT NULL;
   ```

## 📊 Database Schema Changes

### Users Table Additions
```sql
-- New columns added to users table
phone VARCHAR(50)                    -- User phone number
password_hash VARCHAR(255)           -- Hashed password storage
two_factor_enabled BOOLEAN           -- 2FA status
notification_settings JSONB         -- User notification preferences
updated_at TIMESTAMP                 -- Last update timestamp
status VARCHAR(50)                   -- User status (active/banned/restricted)
```

### New Tables
```sql
-- Admin settings table
CREATE TABLE admin_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  setting_type VARCHAR(50) NOT NULL DEFAULT 'general',
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 🔐 Security Considerations

### Environment Variables
- JWT secrets must be at least 32 characters long
- QR secret key should be at least 64 characters long
- Never commit real secrets to version control
- Use strong, randomly generated secrets in production

### Database Security
- User passwords are properly hashed using bcrypt
- JWT tokens include issuer and audience for additional security
- Admin settings are stored as JSONB for type safety
- Audit trail maintained for all settings changes

### Input Validation
- All user inputs are validated before database operations
- SQL injection prevention through parameterized queries
- Type checking for all settings values
- Graceful error handling without information disclosure

## 📋 Testing Checklist

After applying these fixes, verify:

- [ ] Admin settings page loads without errors
- [ ] User profile updates work correctly
- [ ] Password changes function properly
- [ ] JWT authentication works
- [ ] Phone number field is editable
- [ ] Two-factor authentication can be enabled/disabled
- [ ] Notification settings can be modified
- [ ] Admin analytics dashboard loads without JSON operator errors
- [ ] Database health check passes
- [ ] All console errors are resolved

## 🎯 Next Steps

1. **Run the initialization script** to set up the database
2. **Test all admin functionality** to ensure everything works
3. **Configure environment variables** properly for production
4. **Monitor logs** for any remaining issues
5. **Consider additional security measures** like rate limiting for admin endpoints

## 📞 Support

If you encounter any issues after applying these fixes:

1. Check the troubleshooting section above
2. Run the health check script: `npm run admin:check-health`
3. Review the console logs for specific error messages
4. Ensure all environment variables are properly set
5. Verify database connectivity and permissions

---

**Note**: These fixes follow the `reda.md` guidelines and maintain backward compatibility with existing data while adding the necessary functionality for admin settings.
