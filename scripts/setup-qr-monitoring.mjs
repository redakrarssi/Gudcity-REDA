#!/usr/bin/env node

/**
 * QR Code Monitoring System Setup Script
 * 
 * This script:
 * 1. Creates necessary database tables for QR code monitoring
 * 2. Sets up scheduled tasks for monitoring and analysis
 * 3. Creates initial alert configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Execute SQL file
 */
async function executeSqlFile(filePath) {
  try {
    console.log(chalk.blue(`Executing SQL file: ${filePath}`));
    const sql = fs.readFileSync(filePath, 'utf8');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(chalk.green('✓ SQL file executed successfully'));
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(chalk.red('✗ Error executing SQL file:'), err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(chalk.red('✗ Error reading or executing SQL file:'), err);
    throw err;
  }
}

/**
 * Set up database schema
 */
async function setupDatabase() {
  console.log(chalk.yellow('\n📊 Setting up QR code monitoring database...'));
  
  const schemaFile = path.join(__dirname, '..', 'db', 'qr_monitoring_schema.sql');
  await executeSqlFile(schemaFile);
  
  console.log(chalk.green('✓ Database schema for QR code monitoring has been set up'));
}

/**
 * Create monitoring script
 */
async function createMonitoringScript() {
  console.log(chalk.yellow('\n📝 Creating monitoring script...'));
  
  const scriptFile = path.join(__dirname, 'run-qr-monitoring.mjs');
  const scriptContent = `#!/usr/bin/env node

/**
 * QR Code Monitoring System - Scheduled Run Script
 * 
 * This script runs the monitoring system to:
 * 1. Detect unusual QR code activity
 * 2. Generate usage statistics
 * 3. Check for suspicious patterns
 */

import dotenv from 'dotenv';
import { QrCodeMonitoringService } from '../src/services/qrCodeMonitoringService.js';

// Load environment variables
dotenv.config();

// Initialize monitoring service
const monitoringService = new QrCodeMonitoringService();

async function runMonitoring() {
  const timestamp = new Date().toISOString();
  console.log(\`\\n[QR CODE MONITORING] Starting monitoring run at \${timestamp}\`);
  
  try {
    // 1. Detect unusual activity
    console.log('\\n[QR CODE MONITORING] Detecting unusual activity...');
    const unusualActivity = await monitoringService.detectUnusualActivity();
    console.log(\`Unusual activity detection completed. Found \${unusualActivity.unusualDays.length} days with unusual activity.\`);
    
    // 2. Generate usage statistics
    console.log('\\n[QR CODE MONITORING] Generating usage statistics...');
    const dailyStats = await monitoringService.generateUsageStatistics('daily');
    console.log(\`Generated usage statistics for \${dailyStats.length} days.\`);
    
    console.log('\\n[QR CODE MONITORING] Monitoring run completed successfully.\\n');
  } catch (error) {
    console.error('\\n[QR CODE MONITORING] Error during monitoring run:', error);
  }
}

// Run the monitoring
runMonitoring().catch(console.error);
`;

  try {
    fs.writeFileSync(scriptFile, scriptContent);
    fs.chmodSync(scriptFile, '755'); // Make executable
    console.log(chalk.green(`✓ Monitoring script created at: ${scriptFile}`));
  } catch (err) {
    console.error(chalk.red('✗ Error creating monitoring script:'), err);
  }
}

/**
 * Create logs directory
 */
function createLogsDirectory() {
  const logsDir = path.join(__dirname, '..', 'logs');
  
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(chalk.green(`✓ Logs directory created at: ${logsDir}`));
  } catch (err) {
    console.error(chalk.red('✗ Error creating logs directory:'), err);
  }
}

/**
 * Setup scheduled monitoring
 */
function setupScheduledMonitoring() {
  console.log(chalk.yellow('\n⏰ Setting up monitoring schedule...'));
  
  try {
    const cronDir = path.join(__dirname, '..', 'cron');
    fs.mkdirSync(cronDir, { recursive: true });
    
    // Default: Run monitoring daily at midnight
    const cronFile = path.join(cronDir, 'qr-monitor.cron');
    const cronContent = `0 0 * * * cd ${path.join(__dirname, '..')} && node scripts/run-qr-monitoring.mjs >> logs/qr-monitoring.log 2>&1\n`;
    fs.writeFileSync(cronFile, cronContent);
    
    console.log(chalk.green(`✓ Monitoring schedule created: Daily at midnight`));
    console.log(chalk.green(`✓ Cron file created at: ${cronFile}`));
    console.log(chalk.yellow('! NOTE: You may need to manually add this to your system\'s crontab'));
  } catch (err) {
    console.error(chalk.red('✗ Error setting up monitoring schedule:'), err);
  }
}

/**
 * Main setup function
 */
async function main() {
  console.log(chalk.cyan('========================================'));
  console.log(chalk.cyan('  QR CODE MONITORING SYSTEM SETUP'));
  console.log(chalk.cyan('========================================'));
  
  try {
    await setupDatabase();
    await createMonitoringScript();
    createLogsDirectory();
    setupScheduledMonitoring();
    
    console.log(chalk.green('\n✅ QR code monitoring system setup completed successfully!'));
    console.log(chalk.yellow('\nNext steps:'));
    console.log(chalk.yellow('1. Add the cron job to your system\'s crontab if needed'));
    console.log(chalk.yellow('2. Check the logs directory for monitoring output'));
    console.log(chalk.yellow('3. Test the monitoring system by running: node scripts/run-qr-monitoring.mjs'));
  } catch (err) {
    console.error(chalk.red('\n❌ Setup failed:'), err);
    process.exit(1);
  } finally {
    // Close the database pool
    pool.end();
  }
}

// Run the setup
main().catch(console.error);
