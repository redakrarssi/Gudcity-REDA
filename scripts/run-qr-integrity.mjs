#!/usr/bin/env node

/**
 * QR Code Integrity Check Script
 * 
 * This script runs database integrity checks on QR codes and performs cleanup
 * of expired/revoked codes based on a defined schedule.
 * 
 * Usage:
 *   node run-qr-integrity.mjs [--check] [--cleanup] [--repair] [--force]
 * 
 * Options:
 *   --check   Run the integrity check
 *   --cleanup Run the cleanup process
 *   --repair  Enable repair mode during integrity check
 *   --force   Force run even if not scheduled
 * 
 * If no options are provided, the script will check the schedule table
 * and run any scheduled tasks that are due.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize environment
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  check: args.includes('--check'),
  cleanup: args.includes('--cleanup'),
  repair: args.includes('--repair'),
  force: args.includes('--force'),
  verbose: args.includes('--verbose')
};

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
  console.log('🔍 QR Code Integrity Check and Cleanup Script');
  console.log('=============================================');
  console.log('Started at:', new Date().toISOString());
  console.log('Options:', JSON.stringify(options));
  
  try {
    // Check if tables exist and create them if not
    await ensureTables();
    
    if (options.check || options.cleanup) {
      // Explicit run based on command line args
      if (options.check) {
        await runIntegrityCheck(options.repair);
      }
      
      if (options.cleanup) {
        await runCleanup();
      }
    } else {
      // Check schedule and run due tasks
      await runScheduledTasks();
    }
    
    console.log('✅ Script completed successfully');
  } catch (error) {
    console.error('❌ Error running script:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Ensure all required tables exist
 */
async function ensureTables() {
  try {
    console.log('Ensuring required tables exist...');
    
    // Check if archive table exists
    const archiveTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'qr_codes_archive'
      )
    `);
    
    if (!archiveTableCheck.rows[0].exists) {
      console.log('Creating archive table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS qr_codes_archive (
          id SERIAL PRIMARY KEY,
          original_id INTEGER NOT NULL,
          qr_unique_id VARCHAR(36) NOT NULL,
          customer_id INTEGER NOT NULL,
          qr_type VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL,
          qr_data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL,
          last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
          archived_at TIMESTAMP WITH TIME ZONE NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_qr_codes_archive_original_id ON qr_codes_archive(original_id);
        CREATE INDEX IF NOT EXISTS idx_qr_codes_archive_qr_unique_id ON qr_codes_archive(qr_unique_id);
        CREATE INDEX IF NOT EXISTS idx_qr_codes_archive_customer_id ON qr_codes_archive(customer_id);
        CREATE INDEX IF NOT EXISTS idx_qr_codes_archive_archived_at ON qr_codes_archive(archived_at);
      `);
    }
    
    // Check if integrity logs table exists
    const logsTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'qr_code_integrity_logs'
      )
    `);
    
    if (!logsTableCheck.rows[0].exists) {
      console.log('Creating integrity logs table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS qr_code_integrity_logs (
          id SERIAL PRIMARY KEY,
          check_type VARCHAR(50) NOT NULL,
          total_checked INTEGER NOT NULL,
          passed INTEGER NOT NULL,
          failed INTEGER NOT NULL,
          orphaned INTEGER NOT NULL,
          repaired INTEGER NOT NULL,
          error_details JSONB,
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          end_time TIMESTAMP WITH TIME ZONE NOT NULL,
          duration_ms INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_qr_code_integrity_logs_check_type ON qr_code_integrity_logs(check_type);
        CREATE INDEX IF NOT EXISTS idx_qr_code_integrity_logs_created_at ON qr_code_integrity_logs(created_at);
      `);
    }
    
    // Check if schedule table exists
    const scheduleTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'qr_code_integrity_schedule'
      )
    `);
    
    if (!scheduleTableCheck.rows[0].exists) {
      console.log('Creating schedule table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS qr_code_integrity_schedule (
          id SERIAL PRIMARY KEY,
          check_type VARCHAR(50) NOT NULL,
          frequency_hours INTEGER NOT NULL,
          last_run TIMESTAMP WITH TIME ZONE,
          next_run TIMESTAMP WITH TIME ZONE NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          configuration JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_qr_code_integrity_schedule_next_run ON qr_code_integrity_schedule(next_run);
        CREATE INDEX IF NOT EXISTS idx_qr_code_integrity_schedule_is_active ON qr_code_integrity_schedule(is_active);
        
        -- Insert default schedule for integrity checks (daily)
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
          );
      `);
    }
    
    console.log('All required tables exist.');
  } catch (error) {
    console.error('Error ensuring tables exist:', error);
    throw error;
  }
}

/**
 * Run scheduled tasks that are due
 */
async function runScheduledTasks() {
  try {
    console.log('Checking for scheduled tasks...');
    
    const now = new Date();
    const scheduledTasks = await pool.query(`
      SELECT id, check_type, configuration
      FROM qr_code_integrity_schedule
      WHERE next_run <= $1
      AND is_active = TRUE
    `, [now]);
    
    if (scheduledTasks.rows.length === 0) {
      console.log('No scheduled tasks are due.');
      return;
    }
    
    console.log(`Found ${scheduledTasks.rows.length} scheduled tasks to run.`);
    
    for (const task of scheduledTasks.rows) {
      console.log(`Running scheduled task: ${task.check_type}`);
      const config = task.configuration || {};
      
      if (task.check_type === 'user-qrcode-relationship') {
        await runIntegrityCheck(config.repairMode || false, config);
      } else if (task.check_type === 'expired-qrcode-cleanup') {
        await runCleanup(config);
      } else {
        console.warn(`Unknown task type: ${task.check_type}`);
      }
      
      // Update next run time
      await updateTaskSchedule(task.id);
    }
  } catch (error) {
    console.error('Error running scheduled tasks:', error);
    throw error;
  }
}

/**
 * Update the next run time for a scheduled task
 */
async function updateTaskSchedule(taskId) {
  try {
    const task = await pool.query(`
      SELECT frequency_hours
      FROM qr_code_integrity_schedule
      WHERE id = $1
    `, [taskId]);
    
    if (task.rows.length === 0) {
      console.warn(`Task with ID ${taskId} not found.`);
      return;
    }
    
    const frequencyHours = task.rows[0].frequency_hours;
    const now = new Date();
    
    // Calculate next run time
    await pool.query(`
      UPDATE qr_code_integrity_schedule
      SET last_run = $1,
          next_run = $1 + (interval '1 hour' * $2)
      WHERE id = $3
    `, [now, frequencyHours, taskId]);
    
    console.log(`Updated schedule for task ${taskId}, next run in ${frequencyHours} hours.`);
  } catch (error) {
    console.error(`Error updating task schedule for task ${taskId}:`, error);
    throw error;
  }
}

/**
 * Run the QR code integrity check
 */
async function runIntegrityCheck(repairMode = false, config = {}) {
  try {
    console.log(`Running QR code integrity check (repair mode: ${repairMode ? 'ON' : 'OFF'})...`);
    
    const batchSize = config.batchSize || 100;
    const logLevel = config.logLevel || 'detailed';
    
    const startTime = new Date();
    const result = {
      checkType: 'user-qrcode-relationship',
      total: 0,
      passed: 0,
      failed: 0,
      orphaned: 0,
      repaired: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      durationMs: 0
    };
    
    // Get total count of QR codes for progress tracking
    const countResult = await pool.query(`
      SELECT COUNT(*) FROM customer_qrcodes
    `);
    
    const totalQrCodes = parseInt(countResult.rows[0].count);
    result.total = totalQrCodes;
    
    console.log(`Found ${totalQrCodes} QR codes to check.`);
    
    if (totalQrCodes === 0) {
      console.log('No QR codes to check.');
      return;
    }
    
    // Process in batches to avoid memory issues
    let offset = 0;
    let processedCount = 0;
    
    while (offset < totalQrCodes) {
      const qrCodesResult = await pool.query(`
        SELECT id, qr_unique_id, customer_id, business_id, qr_type, status, qr_data, digital_signature
        FROM customer_qrcodes
        ORDER BY id
        LIMIT $1 OFFSET $2
      `, [batchSize, offset]);
      
      // Process each QR code in the batch
      for (const qrCode of qrCodesResult.rows) {
        processedCount++;
        
        try {
          // Check if customer exists
          const customerResult = await pool.query(`
            SELECT id, status FROM users 
            WHERE id = $1 AND user_type = 'customer'
          `, [qrCode.customer_id]);
          
          if (customerResult.rows.length === 0) {
            // Customer doesn't exist - orphaned QR code
            result.orphaned++;
            result.failed++;
            
            if (logLevel !== 'minimal') {
              result.errors.push({
                qrCodeId: qrCode.id,
                error: `Orphaned QR code: Customer ID ${qrCode.customer_id} not found`
              });
            }
            
            // Repair if in repair mode
            if (repairMode) {
              await handleOrphanedQrCode(qrCode);
              result.repaired++;
            }
          } else if (customerResult.rows[0].status !== 'active') {
            // Customer exists but is not active
            result.failed++;
            
            if (logLevel !== 'minimal') {
              result.errors.push({
                qrCodeId: qrCode.id,
                error: `QR code linked to inactive customer: ${qrCode.customer_id}`
              });
            }
            
            // Repair if in repair mode - expire QR codes for inactive customers
            if (repairMode && qrCode.status === 'ACTIVE') {
              await expireQrCode(qrCode.id);
              result.repaired++;
            }
          } else {
            // Customer exists and is active
            result.passed++;
          }
          
          // If a business ID is associated, verify it exists
          if (qrCode.business_id) {
            const businessResult = await pool.query(`
              SELECT id, status FROM users 
              WHERE id = $1 AND user_type = 'business'
            `, [qrCode.business_id]);
            
            if (businessResult.rows.length === 0) {
              // Business doesn't exist - data inconsistency
              result.failed++;
              
              if (logLevel !== 'minimal') {
                result.errors.push({
                  qrCodeId: qrCode.id,
                  error: `QR code references non-existent business: ${qrCode.business_id}`
                });
              }
              
              // Repair if in repair mode - clear invalid business ID
              if (repairMode) {
                await clearInvalidBusinessId(qrCode.id);
                result.repaired++;
              }
            }
          }
        } catch (error) {
          console.error(`Error checking QR code ${qrCode.id}:`, error);
          
          if (logLevel !== 'minimal') {
            result.errors.push({
              qrCodeId: qrCode.id,
              error: error.message
            });
          }
          
          result.failed++;
        }
        
        // Log progress for long-running checks
        if (processedCount % 1000 === 0 || processedCount === totalQrCodes) {
          console.log(`Progress: ${processedCount}/${totalQrCodes} (${Math.floor(processedCount / totalQrCodes * 100)}%)`);
        }
      }
      
      offset += batchSize;
    }
    
    // Record the results
    const endTime = new Date();
    result.endTime = endTime;
    result.durationMs = endTime.getTime() - startTime.getTime();
    
    // Log integrity check to database
    await logIntegrityCheck(result);
    
    console.log('Integrity check completed:');
    console.log(`- Total QR codes: ${result.total}`);
    console.log(`- Passed: ${result.passed}`);
    console.log(`- Failed: ${result.failed}`);
    console.log(`- Orphaned: ${result.orphaned}`);
    console.log(`- Repaired: ${result.repaired}`);
    console.log(`- Duration: ${result.durationMs / 1000} seconds`);
    
    return result;
  } catch (error) {
    console.error('Error running integrity check:', error);
    throw error;
  }
}

/**
 * Run the QR code cleanup process
 */
async function runCleanup(config = {}) {
  try {
    console.log('Running QR code cleanup...');
    
    const olderThan = config.olderThan || 90; // Default to 90 days
    const statuses = config.statuses || ['EXPIRED', 'REVOKED', 'REPLACED'];
    const archiveMode = config.archiveMode !== false; // Default to true
    const limit = config.limit || 1000;
    
    console.log(`Cleanup configuration: olderThan=${olderThan} days, statuses=${statuses.join(',')}, archiveMode=${archiveMode}, limit=${limit}`);
    
    // Find QR codes to clean up
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThan);
    
    const qrCodesResult = await pool.query(`
      SELECT id, qr_unique_id, customer_id, qr_type, status, updated_at
      FROM customer_qrcodes
      WHERE status = ANY($1)
      AND updated_at < $2
      LIMIT $3
    `, [statuses, cutoffDate, limit]);
    
    if (qrCodesResult.rows.length === 0) {
      console.log('No QR codes to clean up.');
      return {
        archived: 0,
        deleted: 0,
        errors: []
      };
    }
    
    console.log(`Found ${qrCodesResult.rows.length} QR codes to clean up.`);
    
    const result = {
      archived: 0,
      deleted: 0,
      errors: []
    };
    
    // Process each QR code
    for (const qrCode of qrCodesResult.rows) {
      try {
        if (archiveMode) {
          // Archive the QR code data before removal
          await pool.query('BEGIN');
          
          try {
            // Get full QR code data
            const fullQrCodeResult = await pool.query(`
              SELECT qr_data, created_at
              FROM customer_qrcodes
              WHERE id = $1
            `, [qrCode.id]);
            
            if (fullQrCodeResult.rows.length === 0) {
              throw new Error(`QR code ${qrCode.id} not found during cleanup`);
            }
            
            const fullQrCode = fullQrCodeResult.rows[0];
            
            // Insert into archive table
            await pool.query(`
              INSERT INTO qr_codes_archive (
                original_id,
                qr_unique_id,
                customer_id,
                qr_type,
                status,
                qr_data,
                created_at,
                last_updated,
                archived_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            `, [
              qrCode.id,
              qrCode.qr_unique_id,
              qrCode.customer_id,
              qrCode.qr_type,
              qrCode.status,
              fullQrCode.qr_data,
              fullQrCode.created_at,
              qrCode.updated_at
            ]);
            
            // Delete the original QR code
            await pool.query(`
              DELETE FROM customer_qrcodes
              WHERE id = $1
            `, [qrCode.id]);
            
            await pool.query('COMMIT');
            result.archived++;
          } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
          }
        } else {
          // Direct deletion without archiving
          await pool.query(`
            DELETE FROM customer_qrcodes
            WHERE id = $1
          `, [qrCode.id]);
          
          result.deleted++;
        }
      } catch (error) {
        console.error(`Error cleaning up QR code ${qrCode.id}:`, error);
        result.errors.push({
          qrCodeId: qrCode.id,
          error: error.message
        });
      }
    }
    
    console.log('Cleanup completed:');
    console.log(`- QR codes archived: ${result.archived}`);
    console.log(`- QR codes deleted: ${result.deleted}`);
    console.log(`- Errors: ${result.errors.length}`);
    
    return result;
  } catch (error) {
    console.error('Error running cleanup:', error);
    throw error;
  }
}

/**
 * Handle orphaned QR codes (customer doesn't exist)
 */
async function handleOrphanedQrCode(qrCode) {
  try {
    await pool.query('BEGIN');
    
    try {
      // Insert into archive table
      await pool.query(`
        INSERT INTO qr_codes_archive (
          original_id,
          qr_unique_id,
          customer_id,
          qr_type,
          status,
          qr_data,
          created_at,
          last_updated,
          archived_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        qrCode.id,
        qrCode.qr_unique_id,
        qrCode.customer_id,
        qrCode.qr_type,
        'ORPHANED', // Special status for orphaned QR codes
        qrCode.qr_data,
        qrCode.created_at || new Date(),
        qrCode.updated_at || new Date()
      ]);
      
      // Update the QR code status to expired
      await pool.query(`
        UPDATE customer_qrcodes
        SET status = 'EXPIRED', updated_at = NOW()
        WHERE id = $1
      `, [qrCode.id]);
      
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error(`Error handling orphaned QR code ${qrCode.id}:`, error);
    throw error;
  }
}

/**
 * Expire a QR code
 */
async function expireQrCode(qrCodeId) {
  try {
    await pool.query(`
      UPDATE customer_qrcodes
      SET status = 'EXPIRED', updated_at = NOW()
      WHERE id = $1
    `, [qrCodeId]);
  } catch (error) {
    console.error(`Error expiring QR code ${qrCodeId}:`, error);
    throw error;
  }
}

/**
 * Clear invalid business ID from QR code
 */
async function clearInvalidBusinessId(qrCodeId) {
  try {
    await pool.query(`
      UPDATE customer_qrcodes
      SET business_id = NULL, updated_at = NOW()
      WHERE id = $1
    `, [qrCodeId]);
  } catch (error) {
    console.error(`Error clearing invalid business ID for QR code ${qrCodeId}:`, error);
    throw error;
  }
}

/**
 * Log integrity check results to database
 */
async function logIntegrityCheck(result) {
  try {
    await pool.query(`
      INSERT INTO qr_code_integrity_logs (
        check_type,
        total_checked,
        passed,
        failed,
        orphaned,
        repaired,
        error_details,
        start_time,
        end_time,
        duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      result.checkType,
      result.total,
      result.passed,
      result.failed,
      result.orphaned,
      result.repaired,
      JSON.stringify(result.errors),
      result.startTime,
      result.endTime,
      result.durationMs
    ]);
  } catch (error) {
    console.error('Error logging integrity check:', error);
    // Don't throw, just log the error
  }
}

// Run the script
main();
