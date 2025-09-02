#!/usr/bin/env node

/**
 * Password Update Fix Script
 * 
 * This script fixes password update issues by verifying the password columns and hashing mechanisms.
 * 
 * Usage:
 *   node scripts/fix-password-update.mjs
 * 
 * Environment Variables Required:
 *   - VITE_DATABASE_URL or DATABASE_URL
 */

import { neon } from '@neondatabase/serverless';
import * as bcrypt from 'bcryptjs';

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL environment variable');
  process.exit(1);
}

console.log('🔧 Starting password update fix...');

const sql = neon(DATABASE_URL);

async function fixPasswordUpdate() {
  try {
    console.log('📋 Checking database connection...');
    
    // Test connection
    const connectionTest = await sql`SELECT 1 as connected`;
    if (!connectionTest[0]?.connected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection successful');

    console.log('📋 Checking password columns in users table...');
    
    // Check which password columns exist
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('password', 'password_hash')
    `;
    
    const columnNames = columns.map(col => col.column_name);
    console.log(`Found password columns: ${columnNames.join(', ')}`);
    
    const hasPasswordHash = columnNames.includes('password_hash');
    const hasPassword = columnNames.includes('password');
    
    if (!hasPasswordHash && !hasPassword) {
      console.log('❌ No password columns found in the users table');
      console.log('Adding both password and password_hash columns...');
      
      await sql`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
      `;
      
      console.log('✅ Added password columns');
    }
    
    // Ensure both columns exist
    if (!hasPasswordHash) {
      console.log('Adding password_hash column...');
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`;
      console.log('✅ Added password_hash column');
    }
    
    if (!hasPassword) {
      console.log('Adding password column...');
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255)`;
      console.log('✅ Added password column');
    }
    
    // Check if there are users with inconsistent password columns
    console.log('📋 Checking for inconsistent password values...');
    
    // We can't use complex queries with neon, so we'll do a simple check
    const users = await sql`
      SELECT id, password, password_hash FROM users
      WHERE (password IS NULL AND password_hash IS NOT NULL)
      OR (password IS NOT NULL AND password_hash IS NULL)
      LIMIT 100
    `;
    
    console.log(`Found ${users.length} users with inconsistent password values`);
    
    // Synchronize password columns
    if (users.length > 0) {
      console.log('📋 Synchronizing password columns...');
      
      for (const user of users) {
        if (user.password && !user.password_hash) {
          console.log(`Copying password to password_hash for user ${user.id}`);
          await sql`UPDATE users SET password_hash = ${user.password} WHERE id = ${user.id}`;
        } else if (!user.password && user.password_hash) {
          console.log(`Copying password_hash to password for user ${user.id}`);
          await sql`UPDATE users SET password = ${user.password_hash} WHERE id = ${user.id}`;
        }
      }
      
      console.log('✅ Password columns synchronized');
    }
    
    // Set up a test user with a simple password for testing
    console.log('📋 Setting up a test user with a known password...');
    
    const adminUsers = await sql`
      SELECT id, email FROM users WHERE role = 'admin' LIMIT 1
    `;
    
    if (adminUsers.length === 0) {
      console.log('❌ No admin users found. Cannot set up test password.');
    } else {
      const adminId = adminUsers[0].id;
      const adminEmail = adminUsers[0].email;
      const testPassword = 'Admin123!';
      
      console.log(`Setting test password for admin user ${adminEmail} (ID: ${adminId})`);
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(testPassword, salt);
      
      // Update both password fields
      await sql`
        UPDATE users 
        SET password = ${passwordHash}, password_hash = ${passwordHash}
        WHERE id = ${adminId}
      `;
      
      console.log(`✅ Admin password set to "${testPassword}"`);
      console.log(`📝 IMPORTANT: Please update this password after testing!`);
    }

    // Create a stored procedure to fix password updates in the future
    console.log('📋 Creating password sync trigger...');
    
    // Create a function to sync passwords - split into multiple queries for Neon compatibility
    await sql.query(`
      CREATE OR REPLACE FUNCTION sync_password_columns()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.password IS DISTINCT FROM OLD.password THEN
          NEW.password_hash := NEW.password;
        END IF;
        IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
          NEW.password := NEW.password_hash;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create a trigger to apply the function - split into multiple queries
    await sql.query(`DROP TRIGGER IF EXISTS sync_passwords_trigger ON users;`);
    
    await sql.query(`
      CREATE TRIGGER sync_passwords_trigger
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION sync_password_columns();
    `);
    
    console.log('✅ Password sync trigger created successfully');
    
    console.log('\n🎉 Password update fix completed!');
    console.log('\nTest your password change functionality with:');
    console.log('1. Navigate to /admin/settings');
    console.log('2. Try to update your password');
    console.log('3. Check the console for detailed error messages if issues persist');
    
    if (adminUsers.length > 0) {
      console.log('\n⚠️ SECURITY REMINDER: Update your admin password immediately after testing!');
    }

  } catch (error) {
    console.error('❌ Error during password update fix:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('  1. Check that your DATABASE_URL is correct');
    console.error('  2. Ensure the database exists and is accessible');
    console.error('  3. Verify that the database user has sufficient permissions');
    process.exit(1);
  }
}

// Run the fix
fixPasswordUpdate();
