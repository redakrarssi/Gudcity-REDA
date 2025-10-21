import sql from '../_lib/db';

export interface SecurityAuditEvent {
  id?: string;
  actionType: string;
  resourceId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

export interface SecurityMetrics {
  totalFailedLogins: number;
  uniqueFailedIPs: number;
  lockedAccounts: number;
  suspiciousActivity: number;
  recentEvents: SecurityAuditEvent[];
}

/**
 * Server-side service for security audit logging
 * All database operations for security audit trails
 */
export class SecurityAuditServerService {
  /**
   * Log a security event
   */
  static async logSecurityEvent(
    eventType: string,
    resourceId: string,
    userId: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
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

      return { success: true };
    } catch (error) {
      console.error('Error logging security event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get security events
   */
  static async getSecurityEvents(
    filters?: {
      userId?: string;
      actionType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<SecurityAuditEvent[]> {
    try {
      let conditions = [];
      const limit = filters?.limit || 100;

      if (filters?.userId) {
        conditions.push(`user_id = '${filters.userId}'`);
      }

      if (filters?.actionType) {
        conditions.push(`action_type = '${filters.actionType}'`);
      }

      if (filters?.startDate) {
        conditions.push(`timestamp >= '${filters.startDate.toISOString()}'`);
      }

      if (filters?.endDate) {
        conditions.push(`timestamp <= '${filters.endDate.toISOString()}'`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await sql.unsafe(`
        SELECT 
          id::text,
          action_type as "actionType",
          resource_id as "resourceId",
          user_id as "userId",
          ip_address as "ipAddress",
          user_agent as "userAgent",
          details,
          timestamp
        FROM security_audit_logs
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `);

      return result as unknown as SecurityAuditEvent[];
    } catch (error) {
      console.error('Error getting security events:', error);
      return [];
    }
  }

  /**
   * Get security metrics
   */
  static async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      const stats = await sql`
        SELECT 
          (SELECT COUNT(*) FROM failed_login_attempts WHERE created_at > NOW() - INTERVAL '24 hours') as total_failed_logins,
          (SELECT COUNT(DISTINCT ip_address) FROM failed_login_attempts WHERE created_at > NOW() - INTERVAL '24 hours') as unique_failed_ips,
          (SELECT COUNT(*) FROM users WHERE account_locked = true) as locked_accounts,
          (SELECT COUNT(*) FROM security_audit_logs WHERE action_type = 'SUSPICIOUS_ACTIVITY' AND timestamp > NOW() - INTERVAL '24 hours') as suspicious_activity
      `;

      const recentEvents = await sql`
        SELECT 
          id::text,
          action_type as "actionType",
          resource_id as "resourceId",
          user_id as "userId",
          ip_address as "ipAddress",
          user_agent as "userAgent",
          details,
          timestamp
        FROM security_audit_logs
        WHERE action_type IN ('FAILED_LOGIN', 'SUSPICIOUS_ACTIVITY', 'ACCOUNT_LOCKED')
        ORDER BY timestamp DESC
        LIMIT 20
      `;

      return {
        totalFailedLogins: parseInt(stats[0].total_failed_logins) || 0,
        uniqueFailedIPs: parseInt(stats[0].unique_failed_ips) || 0,
        lockedAccounts: parseInt(stats[0].locked_accounts) || 0,
        suspiciousActivity: parseInt(stats[0].suspicious_activity) || 0,
        recentEvents: recentEvents as unknown as SecurityAuditEvent[]
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
   * Log failed login attempt
   */
  static async logFailedLogin(
    email: string,
    ipAddress: string,
    reason: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await sql`
        INSERT INTO failed_login_attempts (
          email,
          ip_address,
          reason,
          user_agent,
          created_at
        ) VALUES (
          ${email},
          ${ipAddress},
          ${reason},
          ${userAgent || 'unknown'},
          NOW()
        )
      `;

      // Also log to security audit
      await this.logSecurityEvent(
        'FAILED_LOGIN',
        email,
        'system',
        { reason, email },
        ipAddress,
        userAgent
      );

      return { success: true };
    } catch (error) {
      console.error('Error logging failed login:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if IP address should be blocked due to excessive failed attempts
   */
  static async checkIPBlacklist(ipAddress: string): Promise<{
    blocked: boolean;
    reason?: string;
    attempts?: number;
  }> {
    try {
      const result = await sql`
        SELECT COUNT(*) as attempts
        FROM failed_login_attempts
        WHERE ip_address = ${ipAddress}
        AND created_at > NOW() - INTERVAL '1 hour'
      `;

      const attempts = parseInt(result[0].attempts) || 0;

      // Block if more than 10 failed attempts in last hour
      if (attempts >= 10) {
        return {
          blocked: true,
          reason: 'Too many failed login attempts',
          attempts
        };
      }

      return { blocked: false, attempts };
    } catch (error) {
      console.error('Error checking IP blacklist:', error);
      return { blocked: false };
    }
  }
}

