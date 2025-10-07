/**
 * Security Audit Service
 * Provides comprehensive security logging and monitoring for authentication events
 * following reda.md guidelines for security best practices
 */

import sql from '../utils/db';

export interface SecurityAuditEvent {
  id?: number;
  action_type: string;
  resource_id: string;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  timestamp?: string;
}

export interface SecurityMetrics {
  totalFailedLogins: number;
  uniqueFailedIPs: number;
  lockedAccounts: number;
  suspiciousActivity: number;
  recentEvents: SecurityAuditEvent[];
}

export class SecurityAuditService {
  /**
   * Log a security-related event
   * @param eventType Type of security event
   * @param resourceId ID of the resource involved
   * @param userId User ID involved
   * @param details Additional event details
   * @param ipAddress Client IP address
   * @param userAgent Client user agent
   */
  static async logSecurityEvent(
    eventType: string,
    resourceId: string,
    userId: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await sql`
        INSERT INTO security_audit_logs (
          action_type,
          resource_id,
          user_id,
          ip_address,
          user_agent,
          details,
          timestamp
        ) VALUES (
          ${eventType},
          ${resourceId},
          ${userId},
          ${ipAddress || 'unknown'},
          ${userAgent || 'unknown'},
          ${JSON.stringify(details || {})},
          NOW()
        )
      `;

      console.log(`🔍 Security Event Logged: ${eventType} for user ${userId}`);
    } catch (error) {
      console.error('Error logging security event:', error);
      // Don't throw error - security logging should not break functionality
    }
  }

  /**
   * Log failed login attempt
   * @param email User email
   * @param reason Failure reason
   * @param ipAddress Client IP
   * @param userAgent Client user agent
   * @param additionalDetails Additional context
   */
  static async logFailedLogin(
    email: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
    additionalDetails?: Record<string, any>
  ): Promise<void> {
    const details = {
      reason,
      timestamp: new Date().toISOString(),
      ...additionalDetails
    };

    await this.logSecurityEvent(
      'FAILED_LOGIN',
      'authentication',
      email,
      details,
      ipAddress,
      userAgent
    );
  }

  /**
   * Log successful login
   * @param userId User ID
   * @param email User email
   * @param ipAddress Client IP
   * @param userAgent Client user agent
   */
  static async logSuccessfulLogin(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const details = {
      email,
      loginTime: new Date().toISOString()
    };

    await this.logSecurityEvent(
      'SUCCESSFUL_LOGIN',
      'authentication',
      userId,
      details,
      ipAddress,
      userAgent
    );
  }

  /**
   * Log account lockout event
   * @param email User email
   * @param reason Lockout reason
   * @param duration Lockout duration in minutes
   * @param ipAddress Client IP
   */
  static async logAccountLockout(
    email: string,
    reason: string,
    duration: number,
    ipAddress?: string
  ): Promise<void> {
    const details = {
      reason,
      lockoutDuration: duration,
      lockoutTime: new Date().toISOString()
    };

    await this.logSecurityEvent(
      'ACCOUNT_LOCKOUT',
      'authentication',
      email,
      details,
      ipAddress
    );
  }

  /**
   * Log suspicious activity
   * @param activityType Type of suspicious activity
   * @param resourceId Resource involved
   * @param userId User ID
   * @param details Activity details
   * @param ipAddress Client IP
   * @param userAgent Client user agent
   */
  static async logSuspiciousActivity(
    activityType: string,
    resourceId: string,
    userId: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent(
      `SUSPICIOUS_${activityType.toUpperCase()}`,
      resourceId,
      userId,
      { ...details, suspiciousActivity: true },
      ipAddress,
      userAgent
    );
  }

  /**
   * Get security metrics for monitoring dashboard
   * @param hours Number of hours to look back (default: 24)
   * @returns Security metrics summary
   */
  static async getSecurityMetrics(hours: number = 24): Promise<SecurityMetrics> {
    try {
      // Get failed login count
      const failedLoginsResult = await sql`
        SELECT COUNT(*) as count
        FROM security_audit_logs
        WHERE action_type = 'FAILED_LOGIN'
        AND timestamp >= NOW() - INTERVAL '${hours} hours'
      `;

      // Get unique IPs with failed logins
      const uniqueIPsResult = await sql`
        SELECT COUNT(DISTINCT ip_address) as count
        FROM security_audit_logs
        WHERE action_type = 'FAILED_LOGIN'
        AND timestamp >= NOW() - INTERVAL '${hours} hours'
        AND ip_address != 'unknown'
      `;

      // Get locked accounts
      const lockedAccountsResult = await sql`
        SELECT COUNT(*) as count
        FROM users
        WHERE account_locked_until > NOW()
      `;

      // Get suspicious activity count
      const suspiciousActivityResult = await sql`
        SELECT COUNT(*) as count
        FROM security_audit_logs
        WHERE action_type LIKE 'SUSPICIOUS_%'
        AND timestamp >= NOW() - INTERVAL '${hours} hours'
      `;

      // Get recent security events
      const recentEventsResult = await sql`
        SELECT *
        FROM security_audit_logs
        WHERE timestamp >= NOW() - INTERVAL '${Math.min(hours, 6)} hours'
        ORDER BY timestamp DESC
        LIMIT 20
      `;

      return {
        totalFailedLogins: parseInt(failedLoginsResult[0]?.count || '0'),
        uniqueFailedIPs: parseInt(uniqueIPsResult[0]?.count || '0'),
        lockedAccounts: parseInt(lockedAccountsResult[0]?.count || '0'),
        suspiciousActivity: parseInt(suspiciousActivityResult[0]?.count || '0'),
        recentEvents: recentEventsResult.map(event => ({
          id: event.id,
          action_type: event.action_type,
          resource_id: event.resource_id,
          user_id: event.user_id,
          ip_address: event.ip_address,
          user_agent: event.user_agent,
          details: event.details,
          timestamp: event.timestamp
        }))
      };
    } catch (error) {
      console.error('Error getting security metrics:', error);
      return {
        totalFailedLogins: 0,
        uniqueFailedIPs: 0,
        lockedAccounts: 0,
        suspiciousActivity: 0,
        recentEvents: []
      };
    }
  }

  /**
   * Get failed login attempts by IP address
   * @param hours Number of hours to look back
   * @returns IP addresses with failed login counts
   */
  static async getFailedLoginsByIP(hours: number = 24): Promise<Array<{ip: string, count: number, lastAttempt: string}>> {
    try {
      const result = await sql`
        SELECT 
          ip_address as ip,
          COUNT(*) as count,
          MAX(timestamp) as last_attempt
        FROM security_audit_logs
        WHERE action_type = 'FAILED_LOGIN'
        AND timestamp >= NOW() - INTERVAL '${hours} hours'
        AND ip_address != 'unknown'
        GROUP BY ip_address
        ORDER BY count DESC, last_attempt DESC
        LIMIT 20
      `;

      return result.map(row => ({
        ip: row.ip,
        count: parseInt(row.count),
        lastAttempt: row.last_attempt
      }));
    } catch (error) {
      console.error('Error getting failed logins by IP:', error);
      return [];
    }
  }

  /**
   * Check for brute force patterns
   * @param ipAddress IP address to check
   * @param minutes Time window in minutes
   * @param threshold Number of attempts threshold
   * @returns Whether brute force pattern detected
   */
  static async detectBruteForce(
    ipAddress: string,
    minutes: number = 10,
    threshold: number = 10
  ): Promise<boolean> {
    try {
      const result = await sql`
        SELECT COUNT(*) as attempts
        FROM security_audit_logs
        WHERE action_type = 'FAILED_LOGIN'
        AND ip_address = ${ipAddress}
        AND timestamp >= NOW() - INTERVAL '${minutes} minutes'
      `;

      const attempts = parseInt(result[0]?.attempts || '0');
      
      if (attempts >= threshold) {
        // Log suspicious activity
        await this.logSuspiciousActivity(
          'BRUTE_FORCE',
          'authentication',
          ipAddress,
          { attempts, minutes, threshold }
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error detecting brute force:', error);
      return false;
    }
  }

  /**
   * Get security events for a specific user
   * @param email User email
   * @param hours Number of hours to look back
   * @returns Security events for the user
   */
  static async getUserSecurityEvents(email: string, hours: number = 168): Promise<SecurityAuditEvent[]> {
    try {
      const result = await sql`
        SELECT *
        FROM security_audit_logs
        WHERE user_id = ${email}
        AND timestamp >= NOW() - INTERVAL '${hours} hours'
        ORDER BY timestamp DESC
        LIMIT 50
      `;

      return result.map(event => ({
        id: event.id,
        action_type: event.action_type,
        resource_id: event.resource_id,
        user_id: event.user_id,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        details: event.details,
        timestamp: event.timestamp
      }));
    } catch (error) {
      console.error('Error getting user security events:', error);
      return [];
    }
  }

  /**
   * Clear old security audit logs (maintenance function)
   * @param days Number of days to retain logs
   * @returns Number of records deleted
   */
  static async clearOldLogs(days: number = 90): Promise<number> {
    try {
      const result = await sql`
        DELETE FROM security_audit_logs
        WHERE timestamp < NOW() - INTERVAL '${days} days'
      `;

      const deletedCount = result.length;
      console.log(`🧹 Cleaned up ${deletedCount} old security audit logs (older than ${days} days)`);
      return deletedCount;
    } catch (error) {
      console.error('Error clearing old security logs:', error);
      return 0;
    }
  }
}

export default SecurityAuditService;
