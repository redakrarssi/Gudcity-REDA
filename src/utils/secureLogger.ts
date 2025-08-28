/**
 * Secure Logging Utility
 * Prevents information disclosure and provides comprehensive security monitoring
 */

import { v4 as uuidv4 } from 'uuid';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  SECURITY = 'security'
}

// Log categories
export enum LogCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  API_ACCESS = 'api_access',
  DATA_ACCESS = 'data_access',
  FILE_UPLOAD = 'file_upload',
  RATE_LIMIT = 'rate_limit',
  SECURITY_EVENT = 'security_event',
  SYSTEM = 'system',
  USER_ACTION = 'user_action',
  ERROR = 'error'
}

// Sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /credential/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /credit_card/i,
  /ssn/i,
  /social_security/i,
  /api_key/i,
  /private_key/i,
  /database_url/i,
  /connection_string/i,
  /jwt_secret/i,
  /qr_secret/i,
  /neondb_owner/i,
  /npg_rpc6Nh5oKGzt/i
];

// Log entry interface
interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: any;
  metadata?: Record<string, any>;
  requestId?: string;
}

// Security event types
export enum SecurityEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_LOCKOUT = 'account_lockout',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  FILE_UPLOAD_ATTEMPT = 'file_upload_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  CSRF_ATTEMPT = 'csrf_attempt',
  API_ABUSE = 'api_abuse',
  DATA_EXFILTRATION_ATTEMPT = 'data_exfiltration_attempt'
}

// Security event interface
interface SecurityEvent {
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  payload?: any;
  metadata?: Record<string, any>;
}

// In-memory log store (use proper logging service in production)
const logStore: LogEntry[] = [];
const securityEvents: SecurityEvent[] = [];

// Maximum log entries to keep in memory
const MAX_LOG_ENTRIES = 10000;
const MAX_SECURITY_EVENTS = 5000;

/**
 * Sanitize sensitive data
 */
function sanitizeData(data: any): any {
  if (typeof data === 'string') {
    let sanitized = data;
    SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    return sanitized;
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      const isSensitive = SENSITIVE_PATTERNS.some(pattern => pattern.test(keyLower));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Generate log entry
 */
function createLogEntry(
  level: LogLevel,
  category: LogCategory,
  message: string,
  metadata?: Record<string, any>
): LogEntry {
  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    level,
    category,
    message: sanitizeData(message),
    metadata: metadata ? sanitizeData(metadata) : undefined
  };
}

/**
 * Add log entry to store
 */
function addLogEntry(entry: LogEntry): void {
  logStore.push(entry);
  
  // Remove old entries if limit exceeded
  if (logStore.length > MAX_LOG_ENTRIES) {
    logStore.splice(0, logStore.length - MAX_LOG_ENTRIES);
  }
  
  // Output to console based on environment
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  switch (entry.level) {
    case LogLevel.ERROR:
      console.error(`🔴 [${entry.category.toUpperCase()}] ${entry.message}`, entry.metadata || '');
      break;
    case LogLevel.WARN:
      console.warn(`🟡 [${entry.category.toUpperCase()}] ${entry.message}`, entry.metadata || '');
      break;
    case LogLevel.SECURITY:
      console.error(`🚨 [SECURITY] ${entry.message}`, entry.metadata || '');
      break;
    case LogLevel.INFO:
      console.info(`ℹ️ [${entry.category.toUpperCase()}] ${entry.message}`, entry.metadata || '');
      break;
    case LogLevel.DEBUG:
      if (isDevelopment) {
        console.debug(`🔍 [${entry.category.toUpperCase()}] ${entry.message}`, entry.metadata || '');
      }
      break;
  }
}

/**
 * Add security event
 */
function addSecurityEvent(event: SecurityEvent): void {
  securityEvents.push({
    ...event,
    timestamp: new Date().toISOString()
  });
  
  // Remove old events if limit exceeded
  if (securityEvents.length > MAX_SECURITY_EVENTS) {
    securityEvents.splice(0, securityEvents.length - MAX_SECURITY_EVENTS);
  }
  
  // Log security event
  const severityEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴'
  };
  
  console.error(`${severityEmoji[event.severity]} [SECURITY] ${event.type}: ${event.description}`, {
    userId: event.userId,
    ipAddress: event.ipAddress,
    endpoint: event.endpoint,
    severity: event.severity,
    ...event.metadata
  });
}

/**
 * Main logger class
 */
export class SecureLogger {
  private requestId?: string;
  private userId?: string;
  private sessionId?: string;
  private ipAddress?: string;
  private userAgent?: string;
  
  constructor(context?: {
    requestId?: string;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    this.requestId = context?.requestId;
    this.userId = context?.userId;
    this.sessionId = context?.sessionId;
    this.ipAddress = context?.ipAddress;
    this.userAgent = context?.userAgent;
  }
  
  /**
   * Log error
   */
  error(message: string, metadata?: Record<string, any>): void {
    const entry = createLogEntry(LogLevel.ERROR, LogCategory.ERROR, message, {
      ...metadata,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent
    });
    
    addLogEntry(entry);
  }
  
  /**
   * Log warning
   */
  warn(message: string, metadata?: Record<string, any>): void {
    const entry = createLogEntry(LogLevel.WARN, LogCategory.SYSTEM, message, {
      ...metadata,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent
    });
    
    addLogEntry(entry);
  }
  
  /**
   * Log info
   */
  info(message: string, category: LogCategory = LogCategory.SYSTEM, metadata?: Record<string, any>): void {
    const entry = createLogEntry(LogLevel.INFO, category, message, {
      ...metadata,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent
    });
    
    addLogEntry(entry);
  }
  
  /**
   * Log debug
   */
  debug(message: string, metadata?: Record<string, any>): void {
    const entry = createLogEntry(LogLevel.DEBUG, LogCategory.SYSTEM, message, {
      ...metadata,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent
    });
    
    addLogEntry(entry);
  }
  
  /**
   * Log security event
   */
  security(
    eventType: SecurityEventType,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    metadata?: Record<string, any>
  ): void {
    // Log as security event
    const securityEvent: SecurityEvent = {
      type: eventType,
      severity,
      description,
      userId: this.userId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      metadata
    };
    
    addSecurityEvent(securityEvent);
    
    // Also log as regular log entry
    const entry = createLogEntry(LogLevel.SECURITY, LogCategory.SECURITY_EVENT, description, {
      eventType,
      severity,
      ...metadata,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent
    });
    
    addLogEntry(entry);
  }
  
  /**
   * Log API access
   */
  apiAccess(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const entry = createLogEntry(LogLevel.INFO, LogCategory.API_ACCESS, 'API Access', {
      method,
      endpoint,
      statusCode,
      duration,
      ...metadata,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent
    });
    
    addLogEntry(entry);
  }
  
  /**
   * Log authentication event
   */
  authEvent(
    eventType: SecurityEventType,
    description: string,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const severity = success ? 'low' : 'high';
    
    this.security(eventType, description, severity, {
      success,
      ...metadata
    });
  }
  
  /**
   * Log suspicious activity
   */
  suspiciousActivity(
    description: string,
    evidence: Record<string, any>,
    metadata?: Record<string, any>
  ): void {
    this.security(SecurityEventType.SUSPICIOUS_ACTIVITY, description, 'high', {
      evidence,
      ...metadata
    });
  }
}

/**
 * Create logger with request context
 */
export function createRequestLogger(req: any): SecureLogger {
  return new SecureLogger({
    requestId: req.headers['x-request-id'] || uuidv4(),
    userId: req.user?.id,
    sessionId: req.session?.id,
    ipAddress: req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']
  });
}

/**
 * Create logger with user context
 */
export function createUserLogger(userId: string, sessionId?: string): SecureLogger {
  return new SecureLogger({
    requestId: uuidv4(),
    userId,
    sessionId
  });
}

/**
 * Get log statistics
 */
export function getLogStats(): {
  totalLogs: number;
  totalSecurityEvents: number;
  logsByLevel: Record<LogLevel, number>;
  logsByCategory: Record<LogCategory, number>;
  securityEventsByType: Record<SecurityEventType, number>;
  securityEventsBySeverity: Record<string, number>;
} {
  const logsByLevel: Record<LogLevel, number> = {
    [LogLevel.ERROR]: 0,
    [LogLevel.WARN]: 0,
    [LogLevel.INFO]: 0,
    [LogLevel.DEBUG]: 0,
    [LogLevel.SECURITY]: 0
  };
  
  const logsByCategory: Record<LogCategory, number> = {
    [LogCategory.AUTHENTICATION]: 0,
    [LogCategory.AUTHORIZATION]: 0,
    [LogCategory.API_ACCESS]: 0,
    [LogCategory.DATA_ACCESS]: 0,
    [LogCategory.FILE_UPLOAD]: 0,
    [LogCategory.RATE_LIMIT]: 0,
    [LogCategory.SECURITY_EVENT]: 0,
    [LogCategory.SYSTEM]: 0,
    [LogCategory.USER_ACTION]: 0,
    [LogCategory.ERROR]: 0
  };
  
  const securityEventsByType: Record<SecurityEventType, number> = {} as any;
  const securityEventsBySeverity: Record<string, number> = {};
  
  // Count logs
  logStore.forEach(log => {
    logsByLevel[log.level]++;
    logsByCategory[log.category]++;
  });
  
  // Count security events
  securityEvents.forEach(event => {
    securityEventsByType[event.type] = (securityEventsByType[event.type] || 0) + 1;
    securityEventsBySeverity[event.severity] = (securityEventsBySeverity[event.severity] || 0) + 1;
  });
  
  return {
    totalLogs: logStore.length,
    totalSecurityEvents: securityEvents.length,
    logsByLevel,
    logsByCategory,
    securityEventsByType,
    securityEventsBySeverity
  };
}

/**
 * Get recent logs
 */
export function getRecentLogs(limit: number = 100): LogEntry[] {
  return logStore.slice(-limit);
}

/**
 * Get recent security events
 */
export function getRecentSecurityEvents(limit: number = 50): SecurityEvent[] {
  return securityEvents.slice(-limit);
}

/**
 * Clear logs (for testing)
 */
export function clearLogs(): void {
  logStore.length = 0;
  securityEvents.length = 0;
}

// Default logger instance
export const logger = new SecureLogger();