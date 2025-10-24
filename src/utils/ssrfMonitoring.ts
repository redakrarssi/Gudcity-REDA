/**
 * SSRF Monitoring and Alerting
 * 
 * Comprehensive monitoring system for SSRF attempts and security events
 * with real-time alerting and audit trail maintenance.
 */

import { sql } from '../dev-only/db';
import { SSRFProtection } from './ssrfProtection';

export interface SSRFAttempt {
  url: string;
  userId?: string;
  reason: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  blocked: boolean;
}

export interface SecurityEvent {
  eventType: string;
  userId?: string;
  details: any;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * SSRF monitoring and alerting system
 */
export class SSRFMonitoring {
  private static readonly ALERT_THRESHOLD = 5; // Alert after 5 attempts
  private static readonly ALERT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
  
  /**
   * Log SSRF attempt
   */
  static async logSSRFAttempt(
    url: string,
    userId: string | undefined,
    reason: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const sanitizedUrl = SSRFProtection.sanitizeUrlForLogging(url);
      
      await sql`
        INSERT INTO security_events (
          event_type, user_id, details, ip_address, user_agent, created_at
        ) VALUES (
          'ssrf_attempt', ${userId || null}, ${JSON.stringify({
            url: sanitizedUrl,
            reason,
            timestamp: new Date().toISOString(),
            blocked: true
          })}, ${ipAddress}, ${userAgent || null}, NOW()
        )
      `;
      
      console.log(`🚨 SSRF attempt blocked: ${sanitizedUrl} from ${ipAddress} (${reason})`);
      
      // Check for multiple attempts from same IP
      await this.checkForAlert(ipAddress);
      
    } catch (error) {
      console.error('❌ Failed to log SSRF attempt:', error);
    }
  }
  
  /**
   * Log legitimate external request
   */
  static async logLegitimateRequest(
    url: string,
    userId: string | undefined,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const sanitizedUrl = SSRFProtection.sanitizeUrlForLogging(url);
      
      await sql`
        INSERT INTO security_events (
          event_type, user_id, details, ip_address, user_agent, created_at
        ) VALUES (
          'legitimate_request', ${userId || null}, ${JSON.stringify({
            url: sanitizedUrl,
            timestamp: new Date().toISOString(),
            allowed: true
          })}, ${ipAddress}, ${userAgent || null}, NOW()
        )
      `;
      
      console.log(`✅ Legitimate request allowed: ${sanitizedUrl} from ${ipAddress}`);
      
    } catch (error) {
      console.error('❌ Failed to log legitimate request:', error);
    }
  }
  
  /**
   * Check for alert threshold
   */
  private static async checkForAlert(ipAddress: string): Promise<void> {
    try {
      const recentAttempts = await sql`
        SELECT COUNT(*) as count
        FROM security_events
        WHERE event_type = 'ssrf_attempt'
        AND ip_address = ${ipAddress}
        AND created_at > NOW() - INTERVAL '1 hour'
      `;
      
      const attemptCount = recentAttempts[0]?.count || 0;
      
      if (attemptCount >= this.ALERT_THRESHOLD) {
        console.error(`🚨 SSRF ALERT: ${attemptCount} attempts from ${ipAddress} in the last hour`);
        
        // Send security alert
        await this.sendSecurityAlert(ipAddress, attemptCount);
        
        // Optionally block IP temporarily
        await this.temporarilyBlockIP(ipAddress);
      }
      
    } catch (error) {
      console.error('❌ Failed to check for alert:', error);
    }
  }
  
  /**
   * Send security alert
   */
  private static async sendSecurityAlert(ipAddress: string, attemptCount: number): Promise<void> {
    try {
      // Log the alert
      await sql`
        INSERT INTO security_events (
          event_type, user_id, details, ip_address, created_at
        ) VALUES (
          'security_alert', null, ${JSON.stringify({
            alertType: 'ssrf_attack',
            ipAddress,
            attemptCount,
            timestamp: new Date().toISOString(),
            severity: 'high'
          })}, ${ipAddress}, NOW()
        )
      `;
      
      // In a real implementation, you would:
      // 1. Send email to security team
      // 2. Send Slack notification
      // 3. Create incident in security system
      // 4. Trigger automated response
      
      console.error(`🚨 SECURITY ALERT: ${attemptCount} SSRF attempts from ${ipAddress}`);
      
      // Example: Send to external monitoring service
      // await this.sendToMonitoringService({
      //   type: 'ssrf_attack',
      //   ip: ipAddress,
      //   count: attemptCount,
      //   timestamp: new Date().toISOString()
      // });
      
    } catch (error) {
      console.error('❌ Failed to send security alert:', error);
    }
  }
  
  /**
   * Temporarily block IP address
   */
  private static async temporarilyBlockIP(ipAddress: string): Promise<void> {
    try {
      // Block IP for 1 hour
      const blockUntil = new Date(Date.now() + 60 * 60 * 1000);
      
      await sql`
        INSERT INTO blocked_ips (
          ip_address, blocked_until, reason, created_at
        ) VALUES (
          ${ipAddress}, ${blockUntil}, 'SSRF attack detected', NOW()
        )
        ON CONFLICT (ip_address) 
        DO UPDATE SET 
          blocked_until = ${blockUntil},
          reason = 'SSRF attack detected',
          updated_at = NOW()
      `;
      
      console.log(`🚫 IP ${ipAddress} temporarily blocked until ${blockUntil.toISOString()}`);
      
    } catch (error) {
      console.error('❌ Failed to block IP:', error);
    }
  }
  
  /**
   * Check if IP is blocked
   */
  static async isIPBlocked(ipAddress: string): Promise<boolean> {
    try {
      const result = await sql`
        SELECT 1 FROM blocked_ips 
        WHERE ip_address = ${ipAddress} 
        AND blocked_until > NOW()
        LIMIT 1
      `;
      
      return result.length > 0;
    } catch (error) {
      console.error('❌ Failed to check IP block status:', error);
      return false; // Fail open for availability
    }
  }
  
  /**
   * Get security statistics
   */
  static async getSecurityStats(): Promise<{
    totalSSRFAttempts: number;
    recentSSRFAttempts: number;
    blockedIPs: number;
    topAttackIPs: Array<{ ip: string; count: number }>;
    recentAlerts: Array<{ ip: string; count: number; timestamp: Date }>;
  }> {
    try {
      const [
        totalResult,
        recentResult,
        blockedResult,
        topIPsResult,
        alertsResult
      ] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM security_events WHERE event_type = 'ssrf_attempt'`,
        sql`SELECT COUNT(*) as count FROM security_events WHERE event_type = 'ssrf_attempt' AND created_at > NOW() - INTERVAL '24 hours'`,
        sql`SELECT COUNT(*) as count FROM blocked_ips WHERE blocked_until > NOW()`,
        sql`
          SELECT ip_address as ip, COUNT(*) as count 
          FROM security_events 
          WHERE event_type = 'ssrf_attempt' 
          AND created_at > NOW() - INTERVAL '7 days'
          GROUP BY ip_address 
          ORDER BY count DESC 
          LIMIT 10
        `,
        sql`
          SELECT ip_address as ip, COUNT(*) as count, MAX(created_at) as timestamp
          FROM security_events 
          WHERE event_type = 'ssrf_attempt' 
          AND created_at > NOW() - INTERVAL '24 hours'
          GROUP BY ip_address 
          ORDER BY count DESC 
          LIMIT 5
        `
      ]);
      
      return {
        totalSSRFAttempts: totalResult[0]?.count || 0,
        recentSSRFAttempts: recentResult[0]?.count || 0,
        blockedIPs: blockedResult[0]?.count || 0,
        topAttackIPs: topIPsResult.map(r => ({ ip: r.ip, count: r.count })),
        recentAlerts: alertsResult.map(r => ({ 
          ip: r.ip, 
          count: r.count, 
          timestamp: new Date(r.timestamp) 
        }))
      };
    } catch (error) {
      console.error('❌ Failed to get security stats:', error);
      return {
        totalSSRFAttempts: 0,
        recentSSRFAttempts: 0,
        blockedIPs: 0,
        topAttackIPs: [],
        recentAlerts: []
      };
    }
  }
  
  /**
   * Clean up old security events
   */
  static async cleanupOldEvents(): Promise<number> {
    try {
      // Keep events for 90 days
      const result = await sql`
        DELETE FROM security_events 
        WHERE created_at < NOW() - INTERVAL '90 days'
      `;
      
      const deletedCount = result.length;
      console.log(`🧹 Cleaned up ${deletedCount} old security events`);
      
      return deletedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup old events:', error);
      return 0;
    }
  }
  
  /**
   * Unblock IP address
   */
  static async unblockIP(ipAddress: string): Promise<boolean> {
    try {
      await sql`
        DELETE FROM blocked_ips 
        WHERE ip_address = ${ipAddress}
      `;
      
      console.log(`✅ IP ${ipAddress} unblocked`);
      return true;
    } catch (error) {
      console.error('❌ Failed to unblock IP:', error);
      return false;
    }
  }
  
  /**
   * Get blocked IPs
   */
  static async getBlockedIPs(): Promise<Array<{
    ip: string;
    blockedUntil: Date;
    reason: string;
    createdAt: Date;
  }>> {
    try {
      const result = await sql`
        SELECT ip_address as ip, blocked_until as blockedUntil, reason, created_at as createdAt
        FROM blocked_ips 
        WHERE blocked_until > NOW()
        ORDER BY created_at DESC
      `;
      
      return result.map(r => ({
        ip: r.ip,
        blockedUntil: new Date(r.blockedUntil),
        reason: r.reason,
        createdAt: new Date(r.createdAt)
      }));
    } catch (error) {
      console.error('❌ Failed to get blocked IPs:', error);
      return [];
    }
  }
  
  /**
   * Schedule periodic cleanup
   */
  static scheduleCleanup(): void {
    // Run cleanup every 24 hours
    setInterval(async () => {
      try {
        await this.cleanupOldEvents();
      } catch (error) {
        console.error('❌ Scheduled cleanup failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    console.log('🕐 Security events cleanup scheduled (every 24 hours)');
  }
}
