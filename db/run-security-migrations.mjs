#!/usr/bin/env node
/**
 * Database Security Migrations Setup Script
 * Runs all necessary security-related database migrations for GudCity REDA
 * 
 * This script ensures:
 * 1. Failed login tracking functions exist
 * 2. Security audit logs table exists
 * 3. All necessary indexes are created
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL or POSTGRES_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

/**
 * Execute SQL file
 */
async function executeSqlFile(filename) {
  try {
    const filePath = join(__dirname, filename);
    const sqlContent = await readFile(filePath, 'utf-8');
    
    console.log(`\n📄 Executing: ${filename}`);
    await sql.unsafe(sqlContent);
    console.log(`✅ Successfully executed: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Error executing ${filename}:`, error.message);
    return false;
  }
}

/**
 * Verify database functions exist
 */
async function verifyFunctions() {
  console.log('\n🔍 Verifying database functions...');
  
  const functions = [
    'is_account_locked',
    'reset_failed_login_attempts',
    'record_failed_login_attempt'
  ];
  
  let allExist = true;
  
  for (const funcName of functions) {
    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc 
          WHERE proname = ${funcName}
        ) as exists
      `;
      
      if (result[0]?.exists) {
        console.log(`  ✅ Function '${funcName}' exists`);
      } else {
        console.log(`  ❌ Function '${funcName}' is missing`);
        allExist = false;
      }
    } catch (error) {
      console.error(`  ❌ Error checking function '${funcName}':`, error.message);
      allExist = false;
    }
  }
  
  return allExist;
}

/**
 * Verify database tables exist
 */
async function verifyTables() {
  console.log('\n🔍 Verifying database tables...');
  
  const tables = [
    'failed_login_attempts',
    'security_audit_logs'
  ];
  
  let allExist = true;
  
  for (const tableName of tables) {
    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = ${tableName}
        ) as exists
      `;
      
      if (result[0]?.exists) {
        console.log(`  ✅ Table '${tableName}' exists`);
      } else {
        console.log(`  ❌ Table '${tableName}' is missing`);
        allExist = false;
      }
    } catch (error) {
      console.error(`  ❌ Error checking table '${tableName}':`, error.message);
      allExist = false;
    }
  }
  
  return allExist;
}

/**
 * Main migration runner
 */
async function runMigrations() {
  console.log('🚀 Starting Security Migrations for GudCity REDA\n');
  console.log('=' .repeat(60));
  
  try {
    // Test database connection
    console.log('\n🔌 Testing database connection...');
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Run migrations in order
    const migrations = [
      'failed_login_tracking_schema.sql',
      'security_audit_logs_schema.sql'
    ];
    
    console.log('\n📦 Running migrations...');
    console.log('=' .repeat(60));
    
    let successCount = 0;
    let failCount = 0;
    
    for (const migration of migrations) {
      const success = await executeSqlFile(migration);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log(`\n📊 Migration Summary:`);
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    
    // Verify everything is in place
    console.log('\n' + '=' .repeat(60));
    const functionsExist = await verifyFunctions();
    const tablesExist = await verifyTables();
    
    console.log('\n' + '=' .repeat(60));
    
    if (functionsExist && tablesExist && failCount === 0) {
      console.log('\n🎉 All migrations completed successfully!');
      console.log('✅ Your database is now ready with security features:');
      console.log('   - Failed login tracking');
      console.log('   - Account lockout protection');
      console.log('   - Security audit logging');
      console.log('   - Brute force detection');
      process.exit(0);
    } else {
      console.log('\n⚠️  Migrations completed with warnings or errors.');
      console.log('   Please review the output above for details.');
      process.exit(failCount > 0 ? 1 : 0);
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run migrations
runMigrations().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

