#!/usr/bin/env node

/**
 * Admin Database Initialization Script
 * 
 * This script sets up the database schema required for admin settings functionality.
 * It should be run after the main database setup to ensure all admin features work properly.
 * 
 * Usage:
 *   node scripts/init-admin-db.mjs
 * 
 * Environment Variables Required:
 *   - VITE_DATABASE_URL or DATABASE_URL
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL environment variable');
  process.exit(1);
}

console.log('🔧 Starting admin database initialization...');

const sql = neon(DATABASE_URL);

async function initializeAdminDatabase() {
  try {
    console.log('📋 Checking database connection...');
    
    // Test connection
    const connectionTest = await sql`SELECT 1 as connected`;
    if (!connectionTest[0]?.connected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection successful');

    console.log('📋 Adding missing columns to users table...');
    
    // Add phone column
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'phone'
        ) THEN
          ALTER TABLE users ADD COLUMN phone VARCHAR(50);
          RAISE NOTICE 'Added phone column to users table';
        ELSE
          RAISE NOTICE 'Phone column already exists in users table';
        END IF;
      END
      $$;
    `;

    // Add password_hash column
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'password_hash'
        ) THEN
          -- Check if password column exists first
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'password'
          ) THEN
            ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
            -- Copy existing password data to password_hash
            UPDATE users SET password_hash = password WHERE password IS NOT NULL AND password_hash IS NULL;
            RAISE NOTICE 'Added password_hash column and copied from password column';
          ELSE
            ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '';
            RAISE NOTICE 'Added password_hash column to users table';
          END IF;
        ELSE
          RAISE NOTICE 'Password_hash column already exists in users table';
        END IF;
      END
      $$;
    `;

    // Add two_factor_enabled column
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'two_factor_enabled'
        ) THEN
          ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
          RAISE NOTICE 'Added two_factor_enabled column to users table';
        ELSE
          RAISE NOTICE 'Two_factor_enabled column already exists in users table';
        END IF;
      END
      $$;
    `;

    // Add notification_settings column
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'notification_settings'
        ) THEN
          ALTER TABLE users ADD COLUMN notification_settings JSONB DEFAULT '{
            "email_notifications": true,
            "login_alerts": true,
            "system_updates": true
          }';
          RAISE NOTICE 'Added notification_settings column to users table';
        ELSE
          RAISE NOTICE 'Notification_settings column already exists in users table';
        END IF;
      END
      $$;
    `;

    // Add updated_at column
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
          RAISE NOTICE 'Added updated_at column to users table';
        ELSE
          RAISE NOTICE 'Updated_at column already exists in users table';
        END IF;
      END
      $$;
    `;

    // Add status column
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'status'
        ) THEN
          ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';
          RAISE NOTICE 'Added status column to users table';
        ELSE
          RAISE NOTICE 'Status column already exists in users table';
        END IF;
      END
      $$;
    `;

    console.log('📋 Creating indexes for performance...');

    // Add indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)',
      'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
      'CREATE INDEX IF NOT EXISTS idx_users_two_factor ON users(two_factor_enabled)',
      'CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at)'
    ];

    for (const index of indexes) {
      await sql.query(index);
    }

    console.log('📋 Creating trigger function for updated_at...');

    // Create trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;

    // Add trigger to users table - split into separate commands for Neon compatibility
    await sql.query("DROP TRIGGER IF EXISTS update_users_updated_at ON users");
    await sql.query("CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()");

    console.log('📋 Creating admin_settings table...');

    // Create admin_settings table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value JSONB NOT NULL,
        setting_type VARCHAR(50) NOT NULL DEFAULT 'general',
        description TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Add trigger to admin_settings table - split into separate commands for Neon compatibility
    await sql.query("DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON admin_settings");
    await sql.query("CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON admin_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()");

    console.log('📋 Inserting default admin settings...');

    // Insert default settings
    const defaultSettings = [
      { key: 'site_name', value: '"Vcarda Loyalty Platform"', type: 'general', description: 'Website name' },
      { key: 'support_email', value: '"support@vcarda.com"', type: 'general', description: 'Support email address' },
      { key: 'default_language', value: '"en"', type: 'general', description: 'Default language for new users' },
      { key: 'timezone', value: '"UTC"', type: 'general', description: 'Default timezone' },
      { key: 'maintenance_mode', value: 'false', type: 'general', description: 'Enable maintenance mode' },
      { key: 'maintenance_message', value: '"We are currently performing scheduled maintenance. Please check back later."', type: 'general', description: 'Maintenance mode message' },
      { key: 'user_registration_enabled', value: 'true', type: 'security', description: 'Allow new user registrations' },
      { key: 'business_registration_enabled', value: 'true', type: 'security', description: 'Allow new business registrations' },
      { key: 'two_factor_auth_required', value: 'false', type: 'security', description: 'Require two-factor authentication' },
      { key: 'password_min_length', value: '8', type: 'security', description: 'Minimum password length' },
      { key: 'password_require_special_char', value: 'true', type: 'security', description: 'Require special characters in passwords' },
      { key: 'password_require_number', value: 'true', type: 'security', description: 'Require numbers in passwords' },
      { key: 'password_require_uppercase', value: 'true', type: 'security', description: 'Require uppercase letters in passwords' },
      { key: 'max_login_attempts', value: '5', type: 'security', description: 'Maximum login attempts before lockout' },
      { key: 'session_timeout_minutes', value: '30', type: 'security', description: 'Session timeout in minutes' },
      { key: 'api_rate_limit_per_hour', value: '100', type: 'security', description: 'API rate limit per hour' },
      { key: 'email_notifications_enabled', value: 'true', type: 'notifications', description: 'Enable email notifications' },
      { key: 'push_notifications_enabled', value: 'true', type: 'notifications', description: 'Enable push notifications' },
      { key: 'admin_alerts_enabled', value: 'true', type: 'notifications', description: 'Enable admin alerts' },
      { key: 'user_signup_notifications', value: 'true', type: 'notifications', description: 'Notify admins of new user signups' },
      { key: 'business_signup_notifications', value: 'true', type: 'notifications', description: 'Notify admins of new business signups' },
      { key: 'transaction_alerts', value: 'true', type: 'notifications', description: 'Enable transaction alerts' },
      { key: 'weekly_reports_enabled', value: 'true', type: 'notifications', description: 'Enable weekly reports' },
      { key: 'marketing_emails_enabled', value: 'false', type: 'notifications', description: 'Enable marketing emails' },
      { key: 'default_currency', value: '"USD"', type: 'payments', description: 'Default currency for transactions' },
      { key: 'processing_fee_percentage', value: '2.5', type: 'payments', description: 'Payment processing fee percentage' },
      { key: 'minimum_payout_amount', value: '50', type: 'payments', description: 'Minimum payout amount' },
      { key: 'payout_schedule', value: '"monthly"', type: 'payments', description: 'Payout schedule' },
      { key: 'stripe_enabled', value: 'true', type: 'payments', description: 'Enable Stripe payments' },
      { key: 'paypal_enabled', value: 'true', type: 'payments', description: 'Enable PayPal payments' },
      { key: 'test_mode', value: 'true', type: 'payments', description: 'Enable test mode for payments' }
    ];

    for (const setting of defaultSettings) {
      await sql`
        INSERT INTO admin_settings (setting_key, setting_value, setting_type, description)
        VALUES (${setting.key}, ${setting.value}::jsonb, ${setting.type}, ${setting.description})
        ON CONFLICT (setting_key) DO NOTHING
      `;
    }

    console.log('📋 Verifying installation...');

    // Verify the installation
    const verificationResults = await Promise.all([
      sql`SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('phone', 'password_hash', 'two_factor_enabled', 'notification_settings', 'updated_at', 'status')`,
      sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_settings') as exists`,
      sql`SELECT COUNT(*) as count FROM admin_settings`,
      sql`SELECT EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'update_updated_at_column') as exists`
    ]);

    const [columnsResult, adminTableResult, settingsCountResult, triggerResult] = verificationResults;

    console.log('📊 Installation Summary:');
    console.log(`  ✅ Users table columns added: ${columnsResult[0].count}/6`);
    console.log(`  ✅ Admin settings table exists: ${adminTableResult[0].exists ? 'Yes' : 'No'}`);
    console.log(`  ✅ Default settings inserted: ${settingsCountResult[0].count}`);
    console.log(`  ✅ Trigger function exists: ${triggerResult[0].exists ? 'Yes' : 'No'}`);

    if (columnsResult[0].count == 6 && adminTableResult[0].exists && settingsCountResult[0].count > 0 && triggerResult[0].exists) {
      console.log('🎉 Admin database initialization completed successfully!');
      console.log('');
      console.log('📋 Next steps:');
      console.log('  1. Start your application');
      console.log('  2. Navigate to /admin/settings');
      console.log('  3. Verify that all admin functionality works properly');
      console.log('');
      console.log('🔧 Environment Variables:');
      console.log('  Make sure you have set the following environment variables:');
      console.log('  - VITE_JWT_SECRET (minimum 32 characters)');
      console.log('  - VITE_JWT_REFRESH_SECRET (minimum 32 characters)');
      console.log('  - VITE_QR_SECRET_KEY (minimum 64 characters)');
    } else {
      console.log('⚠️  Some components may not have been installed correctly');
      console.log('Please check the logs above for any errors');
    }

  } catch (error) {
    console.error('❌ Error during admin database initialization:', error);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('  1. Check that your DATABASE_URL is correct');
    console.error('  2. Ensure the database exists and is accessible');
    console.error('  3. Verify that the database user has sufficient permissions');
    console.error('  4. Check the database logs for more detailed error information');
    process.exit(1);
  }
}

// Run the initialization
initializeAdminDatabase();
