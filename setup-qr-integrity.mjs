#!/usr/bin/env node

/**
 * QR Code Integrity Schema Setup Script
 * 
 * This script sets up the database schema for QR code integrity checks and
 * cleanup processes including archive and log tables.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Initialize environment
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Set up database connection
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ No DATABASE_URL environment variable found');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Setting up QR code integrity database schema...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'db', 'qr_integrity_schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error(`❌ Schema file not found at ${schemaPath}`);
      process.exit(1);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema SQL
    await pool.query(schemaSQL);
    
    console.log('✅ QR code integrity schema setup successfully!');
    
    // Verify tables were created
    const tables = ['qr_codes_archive', 'qr_code_integrity_logs', 'qr_code_integrity_schedule'];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`✅ Table created: ${table}`);
      } else {
        console.error(`❌ Failed to create table: ${table}`);
      }
    }
    
    // Check the qr_code_integrity_schedule table to make sure it has entries
    const scheduleResult = await pool.query(`
      SELECT COUNT(*) FROM qr_code_integrity_schedule
    `);
    
    console.log(`✅ Scheduled integrity checks: ${scheduleResult.rows[0].count}`);
    
    if (parseInt(scheduleResult.rows[0].count) === 0) {
      console.log('Adding default schedule entries...');
      
      await pool.query(`
        INSERT INTO qr_code_integrity_schedule 
          (check_type, frequency_hours, next_run, configuration)
        VALUES 
          (
            'user-qrcode-relationship', 
            24, 
            (CURRENT_TIMESTAMP + INTERVAL '1 day'), 
            '{"repairMode": true, "batchSize": 500, "logLevel": "detailed"}'::JSONB
          ),
          (
            'expired-qrcode-cleanup', 
            168, 
            (CURRENT_TIMESTAMP + INTERVAL '7 days'), 
            '{"olderThan": 90, "archiveMode": true, "limit": 1000}'::JSONB
          )
      `);
      
      console.log('✅ Default schedule entries added');
    }
    
    console.log('🎉 QR code integrity setup complete!');
  } catch (error) {
    console.error('❌ Error setting up QR code integrity schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main(); 