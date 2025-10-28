#!/usr/bin/env node

/**
 * Admin Database Health Check Script
 * 
 * This script checks the health of the admin database configuration.
 * 
 * Usage:
 *   node scripts/check-admin-db-health.mjs
 * 
 * Environment Variables Required:
 *   - VITE_DATABASE_URL or DATABASE_URL
 */

import { neon } from '@neondatabase/serverless';

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL environment variable');
  process.exit(1);
}

console.log('🔍 Starting admin database health check...');

const sql = neon(DATABASE_URL);

async function checkAdminDatabaseHealth() {
  try {
    console.log('📋 Checking database connection...');
    
    // Test connection
    const connectionTest = await sql`SELECT 1 as connected`;
    if (!connectionTest[0]?.connected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection successful');

    console.log('📋 Checking required database schema...');

    // Check for required columns in users table
    const userColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `;

    const requiredColumns = ['phone', 'password_hash', 'two_factor_enabled', 'notification_settings', 'updated_at', 'status'];
    const existingColumns = userColumns.map(col => col.column_name);

    const missingColumns = [];
    for (const col of requiredColumns) {
      if (!existingColumns.includes(col)) {
        missingColumns.push(`Missing users.${col} column`);
      }
    }

    // Check for admin_settings table
    const adminSettingsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'admin_settings'
      )
    `;

    // Check for trigger function
    const triggerExists = await sql`
      SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'update_updated_at_column'
      )
    `;

    // Check for settings count
    const settingsCount = await sql`
      SELECT COUNT(*) as count 
      FROM admin_settings
    `;

    // Prepare health report
    const healthReport = {
      isHealthy: missingColumns.length === 0 && 
                 adminSettingsExists[0]?.exists && 
                 triggerExists[0]?.exists && 
                 settingsCount[0]?.count > 0,
      missingFeatures: missingColumns,
      databaseInfo: {
        userColumns: existingColumns.filter(col => requiredColumns.includes(col)).length + '/' + requiredColumns.length,
        adminSettingsExists: adminSettingsExists[0]?.exists ? 'Yes' : 'No',
        settingsCount: settingsCount[0]?.count,
        triggerFunctionExists: triggerExists[0]?.exists ? 'Yes' : 'No'
      },
      errors: []
    };

    // Output health report
    console.log('📊 Health Check Results:');
    console.log(`  Database Connection: ✅ Connected`);
    console.log(`  Users Table Columns: ${healthReport.databaseInfo.userColumns}`);
    console.log(`  Admin Settings Table: ${healthReport.databaseInfo.adminSettingsExists}`);
    console.log(`  Settings Count: ${healthReport.databaseInfo.settingsCount}`);
    console.log(`  Trigger Function: ${healthReport.databaseInfo.triggerFunctionExists}`);
    
    if (healthReport.missingFeatures.length > 0) {
      console.log('⚠️  Missing Features:');
      for (const feature of healthReport.missingFeatures) {
        console.log(`  - ${feature}`);
      }
    }

    console.log(`Overall Health: ${healthReport.isHealthy ? '✅ Healthy' : '❌ Issues Detected'}`);

    if (!healthReport.isHealthy) {
      console.log('\n🔧 Recommended Action:');
      console.log('  Run the database initialization script:');
      console.log('  npm run admin:init-db');
    } else {
      console.log('\n✨ Your admin database configuration is healthy and ready to use!');
    }

    return healthReport;
  } catch (error) {
    console.error('❌ Error during admin database health check:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('  1. Check that your DATABASE_URL is correct');
    console.error('  2. Ensure the database exists and is accessible');
    console.error('  3. Verify that the database user has sufficient permissions');
    
    return {
      isHealthy: false,
      missingFeatures: [],
      errors: [`Database Error: ${error.message}`]
    };
  }
}

// Run the health check
checkAdminDatabaseHealth();
