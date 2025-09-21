/**
 * Security Event Logger
 * Comprehensive security event logging system for the GudCity Loyalty Platform
 * 
 * Features:
 * - Authentication attempt logging with IP and email tracking
 * - Suspicious activity detection with high severity alerts
 * - Audit trails for sensitive operations
 * - Real-time security monitoring and alerting
 * - Integration with existing audit system
 */

import { createAuditLog, getAuditLogs, getAuditLogSummary } from './auditLogger';
import { logger } from './logger';
import { getSecurityConfig } from '../config/security';

/**
 * Security Event Severity Levels
 */
export enum SecuritySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Security Event Types
 */
export enum SecurityEventType {
  // Authentication Events
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // Authorization Events
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  
  // Suspicious Activities
  MULTIPLE_FAILED_LOGINS = 'MULTIPLE_FAILED_LOGINS',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  UNUSUAL_ACCESS_PATTERN = 'UNUSUAL_ACCESS_PATTERN',
  SUSPICIOUS_IP_ACTIVITY = 'SUSPICIOUS_IP_ACTIVITY',
  ACCOUNT_TAKEOVER_ATTEMPT = 'ACCOUNT_TAKEOVER_ATTEMPT',
  
  // Data Access Events
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_DELETION = 'DATA_DELETION',
  BULK_OPERATION = 'BULK_OPERATION',
  
  // System Events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  CSRF_ATTEMPT = 'CSRF_ATTEMPT',
  MALICIOUS_REQUEST = 'MALICIOUS_REQUEST',
  
  // Business Logic Events
  POINTS_MANIPULATION = 'POINTS_MANIPULATION',
  CARD_FRAUD = 'CARD_FRAUD',
  REWARD_ABUSE = 'REWARD_ABUSE',
  ENROLLMENT_FRAUD = 'ENROLLMENT_FRAUD'
}

/**
 * Security Event Interface
 */
export interface SecurityEvent {
  id?: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  businessId?: string;
  customerId?: string;
  programId?: string;
  cardId?: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved?: boolean;
  resolution?: string;
}

/**
 * Security Alert Configuration
 */
interface SecurityAlert {
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  threshold?: number;
  timeWindow?: number; // in minutes
  enabled: boolean;
  notificationChannels: string[];
}

/**
 * Security Logger Class
 */
export class SecurityLogger {
  private static instance: SecurityLogger;
  private securityConfig = getSecurityConfig();
  private failedLoginAttempts = new Map<string, { count: number; lastAttempt: Date; ips: Set<string> }>();
  private suspiciousIPs = new Set<string>();
  private alertConfigs: SecurityAlert[] = [];

  private constructor() {
    this.initializeAlertConfigs();
    this.startPeriodicCleanup();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Initialize security alert configurations
   */
  private initializeAlertConfigs(): void {
    this.alertConfigs = [
      {
        eventType: SecurityEventType.MULTIPLE_FAILED_LOGINS,
        severity: SecuritySeverity.HIGH,
        threshold: 5,
        timeWindow: 15,
        enabled: true,
        notificationChannels: ['console', 'audit']
      },
      {
        eventType: SecurityEventType.BRUTE_FORCE_ATTEMPT,
        severity: SecuritySeverity.CRITICAL,
        threshold: 10,
        timeWindow: 30,
        enabled: true,
        notificationChannels: ['console', 'audit', 'alert']
      },
      {
        eventType: SecurityEventType.SUSPICIOUS_IP_ACTIVITY,
        severity: SecuritySeverity.MEDIUM,
        threshold: 3,
        timeWindow: 60,
        enabled: true,
        notificationChannels: ['console', 'audit']
      },
      {
        eventType: SecurityEventType.UNUSUAL_ACCESS_PATTERN,
        severity: SecuritySeverity.HIGH,
        threshold: 1,
        timeWindow: 0,
        enabled: true,
        notificationChannels: ['console', 'audit']
      }
    ];
  }

  /**
   * Log authentication attempt
   */
  public async logAuthenticationAttempt(
    email: string,
    ipAddress: string,
    success: boolean,
    userAgent?: string,
    sessionId?: string,
    additionalDetails?: Record<string, any>
  ): Promise<void> {
    const eventType = success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILURE;
    const severity = success ? SecuritySeverity.LOW : SecuritySeverity.MEDIUM;

    const event: SecurityEvent = {
      eventType,
      severity,
      userEmail: email,
      ipAddress,
      userAgent,
      sessionId,
      details: {
        success,
        attemptTime: new Date().toISOString(),
        ...additionalDetails
      },
      timestamp: new Date()
    };

    await this.logSecurityEvent(event);

    // Track failed login attempts
    if (!success) {
      await this.trackFailedLoginAttempt(email, ipAddress);
    }
  }

  /**
   * Log suspicious activity
   */
  public async logSuspiciousActivity(
    eventType: SecurityEventType,
    severity: SecuritySeverity,
    userId?: string,
    userEmail?: string,
    ipAddress?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const event: SecurityEvent = {
      eventType,
      severity,
      userId,
      userEmail,
      ipAddress: ipAddress || 'unknown',
      details: details || {},
      timestamp: new Date()
    };

    await this.logSecurityEvent(event);
    await this.checkForAlerts(event);
  }

  /**
   * Log sensitive operation
   */
  public async logSensitiveOperation(
    operation: string,
    userId: string,
    userEmail: string,
    ipAddress: string,
    resourceId?: string,
    businessId?: string,
    customerId?: string,
    programId?: string,
    cardId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const event: SecurityEvent = {
      eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
      severity: SecuritySeverity.MEDIUM,
      userId,
      userEmail,
      ipAddress,
      businessId,
      customerId,
      programId,
      cardId,
      details: {
        operation,
        resourceId,
        ...details
      },
      timestamp: new Date()
    };

    await this.logSecurityEvent(event);
  }

  /**
   * Log points manipulation attempt
   */
  public async logPointsManipulation(
    userId: string,
    userEmail: string,
    ipAddress: string,
    cardId: string,
    pointsAmount: number,
    operation: 'award' | 'deduct' | 'transfer',
    businessId?: string,
    customerId?: string,
    programId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const severity = Math.abs(pointsAmount) > 1000 ? SecuritySeverity.HIGH : SecuritySeverity.MEDIUM;

    const event: SecurityEvent = {
      eventType: SecurityEventType.POINTS_MANIPULATION,
      severity,
      userId,
      userEmail,
      ipAddress,
      businessId,
      customerId,
      programId,
      cardId,
      details: {
        operation,
        pointsAmount,
        ...details
      },
      timestamp: new Date()
    };

    await this.logSecurityEvent(event);
  }

  /**
   * Log reward abuse attempt
   */
  public async logRewardAbuse(
    userId: string,
    userEmail: string,
    ipAddress: string,
    rewardId: string,
    abuseType: string,
    businessId?: string,
    customerId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const event: SecurityEvent = {
      eventType: SecurityEventType.REWARD_ABUSE,
      severity: SecuritySeverity.HIGH,
      userId,
      userEmail,
      ipAddress,
      businessId,
      customerId,
      details: {
        rewardId,
        abuseType,
        ...details
      },
      timestamp: new Date()
    };

    await this.logSecurityEvent(event);
  }

  /**
   * Log security event to database and console
   */
  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Create audit log entry
      await createAuditLog({
        actionType: event.eventType,
        resourceId: event.cardId || event.businessId || event.customerId || 'unknown',
        userId: event.userId || 'anonymous',
        ipAddress: event.ipAddress,
        userAgent: event.userAgent || 'unknown',
        details: {
          ...event.details,
          severity: event.severity,
          userEmail: event.userEmail,
          timestamp: event.timestamp
        }
      });

      // Console logging based on severity
      const logMessage = this.formatSecurityLogMessage(event);
      
      switch (event.severity) {
        case SecuritySeverity.CRITICAL:
          logger.error(`🚨 CRITICAL SECURITY EVENT: ${logMessage}`, event);
          break;
        case SecuritySeverity.HIGH:
          logger.warn(`⚠️ HIGH SECURITY EVENT: ${logMessage}`, event);
          break;
        case SecuritySeverity.MEDIUM:
          logger.warn(`🔍 MEDIUM SECURITY EVENT: ${logMessage}`, event);
          break;
        case SecuritySeverity.LOW:
          logger.info(`ℹ️ LOW SECURITY EVENT: ${logMessage}`, event);
          break;
      }

    } catch (error) {
      logger.error('Failed to log security event', { error, event });
    }
  }

  /**
   * Track failed login attempts
   */
  private async trackFailedLoginAttempt(email: string, ipAddress: string): Promise<void> {
    const now = new Date();
    const key = email.toLowerCase();
    
    if (!this.failedLoginAttempts.has(key)) {
      this.failedLoginAttempts.set(key, {
        count: 0,
        lastAttempt: now,
        ips: new Set()
      });
    }

    const attempt = this.failedLoginAttempts.get(key)!;
    attempt.count++;
    attempt.lastAttempt = now;
    attempt.ips.add(ipAddress);

    // Check for brute force attempts
    if (attempt.count >= 5) {
      await this.logSuspiciousActivity(
        SecurityEventType.MULTIPLE_FAILED_LOGINS,
        SecuritySeverity.HIGH,
        undefined,
        email,
        ipAddress,
        {
          failedAttempts: attempt.count,
          uniqueIPs: attempt.ips.size,
          timeWindow: '15 minutes'
        }
      );
    }

    // Check for brute force from multiple IPs
    if (attempt.ips.size >= 3) {
      await this.logSuspiciousActivity(
        SecurityEventType.BRUTE_FORCE_ATTEMPT,
        SecuritySeverity.CRITICAL,
        undefined,
        email,
        ipAddress,
        {
          failedAttempts: attempt.count,
          uniqueIPs: attempt.ips.size,
          ips: Array.from(attempt.ips)
        }
      );
    }
  }

  /**
   * Check for security alerts
   */
  private async checkForAlerts(event: SecurityEvent): Promise<void> {
    const alertConfig = this.alertConfigs.find(config => 
      config.eventType === event.eventType && config.enabled
    );

    if (alertConfig) {
      await this.triggerSecurityAlert(event, alertConfig);
    }
  }

  /**
   * Trigger security alert
   */
  private async triggerSecurityAlert(event: SecurityEvent, alertConfig: SecurityAlert): Promise<void> {
    const alertMessage = `🚨 SECURITY ALERT: ${event.eventType} - ${event.severity} severity`;
    
    // Console alert
    if (alertConfig.notificationChannels.includes('console')) {
      logger.error(alertMessage, {
        event,
        alertConfig,
        timestamp: new Date().toISOString()
      });
    }

    // Audit log alert
    if (alertConfig.notificationChannels.includes('audit')) {
      await createAuditLog({
        actionType: 'SECURITY_ALERT',
        resourceId: 'security-monitor',
        userId: 'system',
        ipAddress: event.ipAddress,
        userAgent: 'security-logger',
        details: {
          alertType: event.eventType,
          severity: event.severity,
          eventDetails: event.details,
          alertConfig
        }
      });
    }

    // High severity alerts
    if (alertConfig.notificationChannels.includes('alert') && event.severity === SecuritySeverity.CRITICAL) {
      // In a production environment, this would trigger external notifications
      // (email, Slack, PagerDuty, etc.)
      logger.error(`🚨 CRITICAL ALERT REQUIRES IMMEDIATE ATTENTION: ${event.eventType}`, event);
    }
  }

  /**
   * Format security log message
   */
  private formatSecurityLogMessage(event: SecurityEvent): string {
    const parts = [
      `[${event.eventType}]`,
      event.userEmail ? `User: ${event.userEmail}` : '',
      `IP: ${event.ipAddress}`,
      event.businessId ? `Business: ${event.businessId}` : '',
      event.customerId ? `Customer: ${event.customerId}` : '',
      event.cardId ? `Card: ${event.cardId}` : ''
    ].filter(Boolean);

    return parts.join(' | ');
  }

  /**
   * Get security events by criteria
   */
  public async getSecurityEvents(criteria: {
    eventType?: SecurityEventType;
    severity?: SecuritySeverity;
    userId?: string;
    userEmail?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    return await getAuditLogs({
      actionType: criteria.eventType,
      resourceId: criteria.userId,
      userId: criteria.userId,
      ipAddress: criteria.ipAddress,
      startDate: criteria.startDate,
      endDate: criteria.endDate,
      limit: criteria.limit,
      offset: criteria.offset
    });
  }

  /**
   * Get security event summary
   */
  public async getSecurityEventSummary(timeframe: 'daily' | 'weekly' | 'monthly'): Promise<any[]> {
    return await getAuditLogSummary(timeframe);
  }

  /**
   * Get failed login attempts for an email
   */
  public getFailedLoginAttempts(email: string): { count: number; lastAttempt: Date; ips: string[] } | null {
    const key = email.toLowerCase();
    const attempt = this.failedLoginAttempts.get(key);
    
    if (!attempt) return null;

    return {
      count: attempt.count,
      lastAttempt: attempt.lastAttempt,
      ips: Array.from(attempt.ips)
    };
  }

  /**
   * Clear failed login attempts for an email
   */
  public clearFailedLoginAttempts(email: string): void {
    const key = email.toLowerCase();
    this.failedLoginAttempts.delete(key);
  }

  /**
   * Add IP to suspicious list
   */
  public addSuspiciousIP(ipAddress: string): void {
    this.suspiciousIPs.add(ipAddress);
  }

  /**
   * Check if IP is suspicious
   */
  public isSuspiciousIP(ipAddress: string): boolean {
    return this.suspiciousIPs.has(ipAddress);
  }

  /**
   * Start periodic cleanup of old data
   */
  private startPeriodicCleanup(): void {
    // Clean up old failed login attempts every hour
    setInterval(() => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      for (const [email, attempt] of this.failedLoginAttempts.entries()) {
        if (attempt.lastAttempt < oneHourAgo) {
          this.failedLoginAttempts.delete(email);
        }
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Get security statistics
   */
  public getSecurityStats(): {
    totalFailedAttempts: number;
    suspiciousIPs: number;
    activeAlerts: number;
  } {
    let totalFailedAttempts = 0;
    for (const attempt of this.failedLoginAttempts.values()) {
      totalFailedAttempts += attempt.count;
    }

    return {
      totalFailedAttempts,
      suspiciousIPs: this.suspiciousIPs.size,
      activeAlerts: this.alertConfigs.filter(config => config.enabled).length
    };
  }
}

// Export singleton instance
export const securityLogger = SecurityLogger.getInstance();

// Export convenience functions
export const logAuthenticationAttempt = securityLogger.logAuthenticationAttempt.bind(securityLogger);
export const logSuspiciousActivity = securityLogger.logSuspiciousActivity.bind(securityLogger);
export const logSensitiveOperation = securityLogger.logSensitiveOperation.bind(securityLogger);
export const logPointsManipulation = securityLogger.logPointsManipulation.bind(securityLogger);
export const logRewardAbuse = securityLogger.logRewardAbuse.bind(securityLogger);

export default securityLogger;