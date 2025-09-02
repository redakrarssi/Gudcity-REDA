import { Pool } from 'pg';
import sql from '../utils/db';
import { createAuditLog } from '../utils/auditLogger';
import { sendAlert } from '../utils/alertService';

/**
 * QR Code Monitoring Service
 * 
 * Responsible for:
 * 1. Tracking and alerting on suspicious scan patterns (multiple failed attempts)
 * 2. Monitoring QR code usage statistics to detect unusual activity
 * 3. Implementing audit logging for all security-sensitive operations
 */
export class QrCodeMonitoringService {
  private suspiciousThreshold: number = 3; // Number of failed attempts to trigger an alert
  private suspiciousTimeWindow: number = 5 * 60 * 1000; // 5 minutes in milliseconds
  private usageDeviationThreshold: number = 2.0; // Standard deviation multiplier for unusual activity

  constructor() {
    // Initialize service
  }

  /**
   * Record a QR code scan attempt with success/failure status
   * @param qrCodeId The QR code ID that was scanned
   * @param userId The user ID who scanned the code (if authenticated)
   * @param ipAddress The IP address of the scanner
   * @param userAgent The user agent of the scanner
   * @param success Whether the scan was successful
   * @param scanType The type of scan (e.g., loyalty, access, verification)
   * @param location Optional location data of the scan
   */
  async recordScanAttempt(
    qrCodeId: string,
    userId: string | null,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    scanType: string,
    location?: { latitude: number, longitude: number }
  ): Promise<void> {
    try {
      await sql`
        INSERT INTO qr_scan_attempts 
        (qr_code_id, user_id, ip_address, user_agent, success, scan_type, latitude, longitude, timestamp) 
        VALUES (
          ${qrCodeId}, 
          ${userId}, 
          ${ipAddress}, 
          ${userAgent}, 
          ${success}, 
          ${scanType}, 
          ${location?.latitude || null}, 
          ${location?.longitude || null},
          NOW()
        )
      `;

      // Create audit log for the scan attempt
      await createAuditLog({
        actionType: 'QR_CODE_SCAN',
        resourceId: qrCodeId,
        userId: userId || 'anonymous',
        ipAddress,
        userAgent,
        details: {
          success,
          scanType,
          location
        }
      });

      // If the scan failed, check for suspicious patterns
      if (!success) {
        await this.checkForSuspiciousActivity(qrCodeId, ipAddress);
      }
    } catch (error) {
      console.error('Error recording scan attempt:', error);
      throw error;
    }
  }

  /**
   * Check for suspicious activity based on failed scan attempts
   * @param qrCodeId The QR code ID to check
   * @param ipAddress The IP address to check
   */
  private async checkForSuspiciousActivity(qrCodeId: string, ipAddress: string): Promise<void> {
    try {
      // Calculate the timestamp for the start of the time window
      const timeWindowStart = new Date(Date.now() - this.suspiciousTimeWindow);
      
      const result = await sql`
        SELECT COUNT(*) as failed_attempts 
        FROM qr_scan_attempts 
        WHERE qr_code_id = ${qrCodeId} 
        AND ip_address = ${ipAddress} 
        AND success = false 
        AND timestamp > ${timeWindowStart}
      `;

      const failedAttempts = parseInt(result[0].failed_attempts, 10);
      
      if (failedAttempts >= this.suspiciousThreshold) {
        // Log the suspicious activity
        await this.logSuspiciousActivity(qrCodeId, ipAddress, failedAttempts);
        
        // Send an alert
        await sendAlert({
          alertType: 'SUSPICIOUS_QR_SCAN_ACTIVITY',
          severity: 'HIGH',
          message: `Detected ${failedAttempts} failed scan attempts for QR code ${qrCodeId} from IP ${ipAddress} within ${this.suspiciousTimeWindow / 60000} minutes`,
          details: {
            qrCodeId,
            ipAddress,
            failedAttempts,
            timeWindow: `${this.suspiciousTimeWindow / 60000} minutes`
          }
        });
      }
    } catch (error) {
      console.error('Error checking for suspicious activity:', error);
    }
  }

  /**
   * Log suspicious activity to the database
   * @param qrCodeId The QR code ID
   * @param ipAddress The IP address
   * @param failedAttempts The number of failed attempts
   */
  private async logSuspiciousActivity(qrCodeId: string, ipAddress: string, failedAttempts: number): Promise<void> {
    try {
      await sql`
        INSERT INTO suspicious_qr_activities 
        (qr_code_id, ip_address, failed_attempts, detected_at, status) 
        VALUES (${qrCodeId}, ${ipAddress}, ${failedAttempts}, NOW(), 'DETECTED')
      `;
    } catch (error) {
      console.error('Error logging suspicious activity:', error);
      throw error;
    }
  }

  /**
   * Generate usage statistics report
   * @param timeframe The timeframe to analyze ('daily', 'weekly', 'monthly')
   */
  async generateUsageStatistics(timeframe: 'daily' | 'weekly' | 'monthly'): Promise<any> {
    try {
      let intervalSql;
      
      switch (timeframe) {
        case 'daily':
          intervalSql = "date_trunc('day', timestamp)";
          break;
        case 'weekly':
          intervalSql = "date_trunc('week', timestamp)";
          break;
        case 'monthly':
          intervalSql = "date_trunc('month', timestamp)";
          break;
        default:
          intervalSql = "date_trunc('day', timestamp)";
      }
      
      const result = await sql`
        SELECT 
          ${intervalSql} as period,
          COUNT(*) as total_scans,
          COUNT(CASE WHEN success = true THEN 1 END) as successful_scans,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_scans,
          COUNT(DISTINCT qr_code_id) as unique_codes_scanned,
          COUNT(DISTINCT ip_address) as unique_users
        FROM qr_scan_attempts
        GROUP BY period
        ORDER BY period DESC
      `;

      return result;
    } catch (error) {
      console.error('Error generating usage statistics:', error);
      throw error;
    }
  }

  /**
   * Detect unusual activity by analyzing scan patterns
   * @param lookbackDays Number of days to analyze
   */
  async detectUnusualActivity(lookbackDays: number = 30): Promise<any> {
    try {
      // First, get historical daily scan counts to establish a baseline
      const historicalData = await sql`
        SELECT 
          date_trunc('day', timestamp) as day,
          COUNT(*) as scan_count
        FROM qr_scan_attempts
        WHERE timestamp > NOW() - INTERVAL '${lookbackDays} days'
        GROUP BY day
        ORDER BY day
      `;
      
      // Calculate average and standard deviation
      const scanCounts = historicalData.map(row => parseInt(row.scan_count, 10));
      const average = scanCounts.reduce((sum, count) => sum + count, 0) / scanCounts.length;
      
      const variance = scanCounts.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) / scanCounts.length;
      const stdDev = Math.sqrt(variance);
      
      // Threshold for unusual activity
      const upperThreshold = average + (stdDev * this.usageDeviationThreshold);
      const lowerThreshold = Math.max(0, average - (stdDev * this.usageDeviationThreshold));
      
      // Find days with unusual activity
      const unusualDays = historicalData.filter(row => {
        const count = parseInt(row.scan_count, 10);
        return count > upperThreshold || count < lowerThreshold;
      });
      
      // If unusual days detected, generate alerts
      for (const day of unusualDays) {
        const count = parseInt(day.scan_count, 10);
        const deviation = (count - average) / stdDev;
        const direction = count > average ? 'higher' : 'lower';
        
        await sendAlert({
          alertType: 'UNUSUAL_QR_SCAN_VOLUME',
          severity: Math.abs(deviation) > 3 ? 'HIGH' : 'MEDIUM',
          message: `Unusual QR scan activity detected on ${day.day}: ${count} scans, ${Math.abs(deviation).toFixed(2)} standard deviations ${direction} than average`,
          details: {
            date: day.day,
            scanCount: count,
            average,
            standardDeviation: stdDev,
            deviationAmount: deviation
          }
        });
      }
      
      return {
        average,
        standardDeviation: stdDev,
        upperThreshold,
        lowerThreshold,
        unusualDays: unusualDays.map(day => ({
          day: day.day,
          scanCount: parseInt(day.scan_count, 10),
          deviation: (parseInt(day.scan_count, 10) - average) / stdDev
        }))
      };
    } catch (error) {
      console.error('Error detecting unusual activity:', error);
      throw error;
    }
  }

  /**
   * Get recent security events for a specific QR code
   * @param qrCodeId The QR code ID
   * @param limit Maximum number of events to return
   */
  async getSecurityEvents(qrCodeId: string, limit: number = 100): Promise<any> {
    try {
      const result = await sql`
        SELECT * FROM qr_scan_attempts
        WHERE qr_code_id = ${qrCodeId}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;

      return result;
    } catch (error) {
      console.error('Error getting security events:', error);
      throw error;
    }
  }
}

export default QrCodeMonitoringService; 