#!/usr/bin/env node

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
  console.log(`\n[QR CODE MONITORING] Starting monitoring run at ${timestamp}`);
  
  try {
    // 1. Detect unusual activity
    console.log('\n[QR CODE MONITORING] Detecting unusual activity...');
    const unusualActivity = await monitoringService.detectUnusualActivity();
    console.log(`Unusual activity detection completed. Found ${unusualActivity.unusualDays.length} days with unusual activity.`);
    
    // 2. Generate usage statistics
    console.log('\n[QR CODE MONITORING] Generating usage statistics...');
    const dailyStats = await monitoringService.generateUsageStatistics('daily');
    console.log(`Generated usage statistics for ${dailyStats.length} days.`);
    
    console.log('\n[QR CODE MONITORING] Monitoring run completed successfully.\n');
  } catch (error) {
    console.error('\n[QR CODE MONITORING] Error during monitoring run:', error);
  }
}

// Run the monitoring
runMonitoring().catch(console.error); 