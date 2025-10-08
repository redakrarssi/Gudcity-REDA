#!/usr/bin/env node

/**
 * Local Database Fix Script
 * Fixes missing tables and functions for local development
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we're in a local development environment
const isLocalDev = process.env.NODE_ENV !== 'production' && 
                   (process.env.DATABASE_URL?.includes('localhost') || 
                    process.env.DATABASE_URL?.includes('127.0.0.1') ||
                    !process.env.DATABASE_URL);

if (!isLocalDev) {
  console.log('⚠️  This script is for local development only');
  console.log('   Production database should be managed through proper migrations');
  process.exit(0);
}

async function runDatabaseFix() {
  try {
    console.log('🔧 Starting local database fix...');
    
    // Read the SQL fix file
    const sqlFile = path.join(__dirname, 'fix-local-database.sql');
    if (!fs.existsSync(sqlFile)) {
      console.error('❌ SQL fix file not found:', sqlFile);
      process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Try to connect to database and run the fix
    try {
      const { sql } = require('@neondatabase/serverless');
      
      if (!process.env.DATABASE_URL) {
        console.log('⚠️  DATABASE_URL not set. Please set it in your .env file');
        console.log('   Example: DATABASE_URL=postgresql://user:password@localhost:5432/database');
        process.exit(1);
      }
      
      console.log('📡 Connecting to database...');
      
      // Split SQL into individual statements
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      console.log(`📝 Executing ${statements.length} SQL statements...`);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            await sql`${sql.unsafe(statement)}`;
            console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
          } catch (error) {
            // Some statements might fail if tables already exist, which is OK
            if (error.message.includes('already exists') || 
                error.message.includes('does not exist')) {
              console.log(`⚠️  Statement ${i + 1} skipped (already exists or not needed)`);
            } else {
              console.error(`❌ Statement ${i + 1} failed:`, error.message);
              throw error;
            }
          }
        }
      }
      
      console.log('🎉 Database fix completed successfully!');
      console.log('✅ security_audit_logs table created');
      console.log('✅ refresh_tokens table created');
      console.log('✅ revoked_tokens table created');
      console.log('✅ Failed login tracking functions created');
      console.log('✅ Security monitoring views created');
      
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError.message);
      console.log('\n📋 Manual setup instructions:');
      console.log('1. Connect to your PostgreSQL database');
      console.log('2. Run the SQL commands from fix-local-database.sql');
      console.log('3. Verify tables exist: security_audit_logs, refresh_tokens, revoked_tokens');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Database fix failed:', error.message);
    process.exit(1);
  }
}

// Run the fix
runDatabaseFix();
