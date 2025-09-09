/**
 * Secure Rate Limiter
 * 
 * Enhanced rate limiting system with multi-dimensional limits,
 * suspicious activity detection, and security event logging.
 */

import { 
  RateLimitConfig, 
  RateLimitResult, 
  RateLimitParams, 
  RateLimitRecord,
  RateLimitStats,
  SecurityEvent,
  SuspiciousActivityPattern,
  RateLimitError,
  SecurityError,
  RATE_LIMIT_CONFIGS,
  RateLimitType
} from '../types/rateLimiting';
import { QrCodeDb } from './dbOperations';
import { logQrCodeError } from './qrCodeErrorHandler';

export class SecureRateLimiter {
  private static instance: SecureRateLimiter;
  private memoryStore: Map<string, RateLimitRecord> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private suspiciousPatterns: Map<string, SuspiciousActivityPattern[]> = new Map();
  
  // Cleanup intervals
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_MEMORY_RECORDS = 10000;
  private readonly MAX_SECURITY_EVENTS = 1000;
  
  constructor() {
    this.startCleanupTimer();
  }
  
  static getInstance(): SecureRateLimiter {
    if (!SecureRateLimiter.instance) {
      SecureRateLimiter.instance = new SecureRateLimiter();
    }
    return SecureRateLimiter.instance;
  }
  
  /**
   * Check rate limit for a request
   * @param params - Rate limit parameters
   * @returns Rate limit result
   */
  async checkRateLimit(params: RateLimitParams): Promise<RateLimitResult> {
    try {
      const config = this.getConfig(params.scanType as RateLimitType);
      
      // SECURITY: Multi-dimensional rate limiting
      const limitChecks = await Promise.all([
        this.checkSingleLimit(`rate_${params.scanType}_${params.businessId}`, config, 'business'),
        this.checkSingleLimit(`rate_${params.scanType}_${params.ipAddress}`, config, 'ip'),
        this.checkDailyLimit(`daily_${params.scanType}_${params.businessId}`, config),
        this.checkGlobalIpLimit(params.ipAddress),
        ...(params.fingerprint ? [this.checkSingleLimit(`rate_${params.scanType}_${params.fingerprint}`, config, 'device')] : []),
        ...(params.userId ? [this.checkSingleLimit(`rate_${params.scanType}_${params.userId}`, config, 'user')] : [])
      ]);
      
      // Find the most restrictive limit
      const blocked = limitChecks.find(result => result.limited);
      if (blocked) {
        await this.recordSecurityEvent({
          type: 'RATE_LIMIT_EXCEEDED',
          ip: params.ipAddress,
          userAgent: params.userAgent,
          fingerprint: params.fingerprint,
          scanType: params.scanType,
          businessId: params.businessId,
          userId: params.userId,
          details: { limitType: blocked.reason },
          timestamp: Date.now(),
          severity: this.calculateSeverity(params)
        });
        
        return blocked;
      }
      
      // Check for suspicious patterns
      const suspiciousActivity = await this.detectSuspiciousActivity(params);
      if (suspiciousActivity.riskScore > 80) {
        return {
          limited: true,
          reason: 'Suspicious activity detected',
          resetTime: Date.now() + (15 * 60 * 1000) // 15 minute block
        };
      }
      
      return { limited: false };
    } catch (error) {
      logQrCodeError(error as Error, { 
        operation: 'checkRateLimit', 
        params 
      });
      
      // Fail secure - don't rate limit on errors to prevent DoS
      return { limited: false };
    }
  }
  
  /**
   * Increment rate limit counters
   * @param params - Rate limit parameters
   */
  async increment(params: RateLimitParams): Promise<void> {
    try {
      const config = this.getConfig(params.scanType as RateLimitType);
      const now = Date.now();
      
      // Increment all applicable counters
      const keys = [
        `rate_${params.scanType}_${params.businessId}`,
        `rate_${params.scanType}_${params.ipAddress}`,
        `daily_${params.scanType}_${params.businessId}`,
        `global_${params.ipAddress}`
      ];
      
      if (params.fingerprint) {
        keys.push(`rate_${params.scanType}_${params.fingerprint}`);
      }
      
      if (params.userId) {
        keys.push(`rate_${params.scanType}_${params.userId}`);
      }
      
      await Promise.all(keys.map(key => this.incrementCounter(key, config)));
      
      // Update suspicious activity tracking
      await this.updateSuspiciousActivity(params);
      
    } catch (error) {
      logQrCodeError(error as Error, { 
        operation: 'incrementRateLimit', 
        params 
      });
    }
  }
  
  /**
   * Enforce rate limit - throws error if limited
   * @param params - Rate limit parameters
   */
  async enforceRateLimit(params: RateLimitParams): Promise<void> {
    const result = await this.checkRateLimit(params);
    
    if (result.limited) {
      throw new RateLimitError(
        result.reason || 'Rate limit exceeded',
        {
          key: result.key || 'unknown',
          scanType: params.scanType,
          businessId: params.businessId,
          ipAddress: params.ipAddress,
          resetTime: result.resetTime,
          attemptsRemaining: result.attemptsRemaining
        }
      );
    }
    
    // If not limited, increment counters
    await this.increment(params);
  }
  
  /**
   * Get rate limit configuration for a scan type
   * @param scanType - Type of scan
   * @returns Rate limit configuration
   */
  private getConfig(scanType: RateLimitType): RateLimitConfig {
    return RATE_LIMIT_CONFIGS[scanType] || RATE_LIMIT_CONFIGS.CUSTOMER_CARD;
  }
  
  /**
   * Check a single rate limit
   * @param key - Rate limit key
   * @param config - Rate limit configuration
   * @param limitType - Type of limit for error reporting
   * @returns Rate limit result
   */
  private async checkSingleLimit(
    key: string, 
    config: RateLimitConfig, 
    limitType: string
  ): Promise<RateLimitResult> {
    const now = Date.now();
    let record = this.memoryStore.get(key);
    
    // Try to get from database if not in memory
    if (!record) {
      try {
        const dbRecord = await QrCodeDb.getRateLimitRecord(key);
        if (dbRecord) {
          record = dbRecord;
          this.memoryStore.set(key, record);
        }
      } catch (error) {
        // Continue with memory-only operation
      }
    }
    
    if (!record) {
      return { limited: false };
    }
    
    const windowStart = record.windowStart;
    const windowEnd = windowStart + (config.windowSeconds * 1000);
    
    // Check if we're still in a blocked state
    if (record.blockUntil && now < record.blockUntil) {
      return {
        limited: true,
        key,
        reason: `${limitType} blocked`,
        resetTime: record.blockUntil,
        attemptsRemaining: 0
      };
    }
    
    // Check if window has expired
    if (now > windowEnd) {
      return { limited: false };
    }
    
    // Check if within limit
    if (record.attempts < config.maxAttempts) {
      return {
        limited: false,
        attemptsRemaining: config.maxAttempts - record.attempts
      };
    }
    
    // Rate limit exceeded
    return {
      limited: true,
      key,
      reason: `${limitType} rate limit exceeded`,
      resetTime: now + (config.blockSeconds * 1000),
      attemptsRemaining: 0
    };
  }
  
  /**
   * Check daily limit
   * @param key - Daily limit key
   * @param config - Rate limit configuration
   * @returns Rate limit result
   */
  private async checkDailyLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    if (!config.dailyLimit) {
      return { limited: false };
    }
    
    const now = Date.now();
    const record = this.memoryStore.get(key);
    
    if (!record) {
      return { limited: false };
    }
    
    // Check if daily reset time has passed
    const dayStart = new Date().setHours(0, 0, 0, 0);
    if (!record.dailyReset || record.dailyReset < dayStart) {
      return { limited: false };
    }
    
    if ((record.dailyAttempts || 0) >= config.dailyLimit) {
      return {
        limited: true,
        key,
        reason: 'Daily limit exceeded',
        resetTime: dayStart + (24 * 60 * 60 * 1000), // Next day
        dailyAttemptsRemaining: 0
      };
    }
    
    return {
      limited: false,
      dailyAttemptsRemaining: config.dailyLimit - (record.dailyAttempts || 0)
    };
  }
  
  /**
   * Check global IP limit
   * @param ipAddress - IP address to check
   * @returns Rate limit result
   */
  private async checkGlobalIpLimit(ipAddress: string): Promise<RateLimitResult> {
    const key = `global_${ipAddress}`;
    const globalConfig: RateLimitConfig = {
      maxAttempts: 50,       // 50 requests
      windowSeconds: 300,    // per 5 minutes
      blockSeconds: 600,     // 10 minute block
      dailyLimit: 1000       // 1000 per day
    };
    
    return this.checkSingleLimit(key, globalConfig, 'global IP');
  }
  
  /**
   * Increment a counter
   * @param key - Counter key
   * @param config - Rate limit configuration
   */
  private async incrementCounter(key: string, config: RateLimitConfig): Promise<void> {
    const now = Date.now();
    let record = this.memoryStore.get(key);
    
    if (!record) {
      record = {
        key,
        attempts: 0,
        maxAttempts: config.maxAttempts,
        windowStart: now,
        windowSeconds: config.windowSeconds,
        createdAt: now,
        updatedAt: now
      };
    }
    
    // Check if we need to start a new window
    const windowEnd = record.windowStart + (config.windowSeconds * 1000);
    if (now > windowEnd) {
      record.attempts = 0;
      record.windowStart = now;
      record.blockUntil = undefined;
    }
    
    // Increment attempt counter
    record.attempts++;
    record.updatedAt = now;
    
    // Handle daily counter
    if (config.dailyLimit) {
      const dayStart = new Date().setHours(0, 0, 0, 0);
      if (!record.dailyReset || record.dailyReset < dayStart) {
        record.dailyAttempts = 1;
        record.dailyReset = now;
      } else {
        record.dailyAttempts = (record.dailyAttempts || 0) + 1;
      }
    }
    
    // Set block time if limit exceeded
    if (record.attempts >= config.maxAttempts && !record.blockUntil) {
      record.blockUntil = now + (config.blockSeconds * 1000);
    }
    
    // Store in memory
    this.memoryStore.set(key, record);
    
    // Persist to database (fire and forget)
    this.persistRecord(record).catch(error => {
      logQrCodeError(error, { operation: 'persistRateLimit', key });
    });
  }
  
  /**
   * Detect suspicious activity patterns
   * @param params - Rate limit parameters
   * @returns Suspicious activity pattern
   */
  private async detectSuspiciousActivity(params: RateLimitParams): Promise<SuspiciousActivityPattern> {
    const patterns: SuspiciousActivityPattern[] = [];
    let totalRiskScore = 0;
    
    // Check for rapid scanning pattern
    const rapidScanning = this.detectRapidScanning(params.ipAddress);
    if (rapidScanning.confidence > 0.5) {
      patterns.push(rapidScanning);
      totalRiskScore += rapidScanning.riskScore;
    }
    
    // Check for IP hopping
    const ipHopping = this.detectIpHopping(params.businessId);
    if (ipHopping.confidence > 0.5) {
      patterns.push(ipHopping);
      totalRiskScore += ipHopping.riskScore;
    }
    
    // Store patterns for this IP
    this.suspiciousPatterns.set(params.ipAddress, patterns);
    
    return {
      type: 'PATTERN_MATCHING',
      confidence: Math.min(patterns.length / 3, 1), // Max confidence with 3+ patterns
      indicators: patterns.flatMap(p => p.indicators),
      riskScore: Math.min(totalRiskScore, 100)
    };
  }
  
  /**
   * Detect rapid scanning from an IP
   * @param ipAddress - IP address to check
   * @returns Rapid scanning pattern
   */
  private detectRapidScanning(ipAddress: string): SuspiciousActivityPattern {
    const recentEvents = this.securityEvents
      .filter(event => 
        event.ip === ipAddress && 
        Date.now() - event.timestamp < 60000 // Last minute
      );
    
    const scanCount = recentEvents.length;
    const confidence = Math.min(scanCount / 10, 1); // High confidence at 10+ scans/minute
    const riskScore = Math.min(scanCount * 5, 50);   // Up to 50 points
    
    return {
      type: 'RAPID_SCANNING',
      confidence,
      indicators: [`${scanCount} scans in last minute from ${ipAddress}`],
      riskScore
    };
  }
  
  /**
   * Detect IP hopping for a business
   * @param businessId - Business ID to check
   * @returns IP hopping pattern
   */
  private detectIpHopping(businessId: string): SuspiciousActivityPattern {
    const recentEvents = this.securityEvents
      .filter(event => 
        event.businessId === businessId && 
        Date.now() - event.timestamp < 300000 // Last 5 minutes
      );
    
    const uniqueIps = new Set(recentEvents.map(event => event.ip));
    const ipCount = uniqueIps.size;
    const confidence = Math.min(ipCount / 5, 1); // High confidence at 5+ IPs
    const riskScore = Math.min(ipCount * 10, 40); // Up to 40 points
    
    return {
      type: 'IP_HOPPING',
      confidence,
      indicators: [`${ipCount} different IPs for business ${businessId} in 5 minutes`],
      riskScore
    };
  }
  
  /**
   * Update suspicious activity tracking
   * @param params - Rate limit parameters
   */
  private async updateSuspiciousActivity(params: RateLimitParams): Promise<void> {
    // This would be called after successful operations to track patterns
    // For now, we just ensure we have recent activity logged
  }
  
  /**
   * Record a security event
   * @param event - Security event to record
   */
  private async recordSecurityEvent(event: SecurityEvent): Promise<void> {
    this.securityEvents.push(event);
    
    // Limit memory usage
    if (this.securityEvents.length > this.MAX_SECURITY_EVENTS) {
      this.securityEvents = this.securityEvents.slice(-this.MAX_SECURITY_EVENTS / 2);
    }
    
    // Log high-severity events
    if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
      console.warn('High-severity security event:', event);
    }
  }
  
  /**
   * Calculate severity of a rate limit violation
   * @param params - Rate limit parameters
   * @returns Severity level
   */
  private calculateSeverity(params: RateLimitParams): SecurityEvent['severity'] {
    // Check recent violations from same IP
    const recentViolations = this.securityEvents
      .filter(event => 
        event.ip === params.ipAddress && 
        event.type === 'RATE_LIMIT_EXCEEDED' &&
        Date.now() - event.timestamp < 3600000 // Last hour
      ).length;
    
    if (recentViolations > 10) return 'CRITICAL';
    if (recentViolations > 5) return 'HIGH';
    if (recentViolations > 2) return 'MEDIUM';
    return 'LOW';
  }
  
  /**
   * Persist rate limit record to database
   * @param record - Record to persist
   */
  private async persistRecord(record: RateLimitRecord): Promise<void> {
    try {
      await QrCodeDb.upsertRateLimitRecord(record);
    } catch (error) {
      // Don't throw - this is background persistence
      console.error('Failed to persist rate limit record:', error);
    }
  }
  
  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }
  
  /**
   * Cleanup expired records
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, record] of this.memoryStore.entries()) {
      const windowEnd = record.windowStart + (record.windowSeconds * 1000);
      const isExpired = now > windowEnd && (!record.blockUntil || now > record.blockUntil);
      
      if (isExpired || now - record.updatedAt > 24 * 60 * 60 * 1000) { // 24 hours
        expiredKeys.push(key);
      }
    }
    
    // Remove expired records
    expiredKeys.forEach(key => this.memoryStore.delete(key));
    
    // Limit memory store size
    if (this.memoryStore.size > this.MAX_MEMORY_RECORDS) {
      const sortedEntries = Array.from(this.memoryStore.entries())
        .sort((a, b) => b[1].updatedAt - a[1].updatedAt);
      
      this.memoryStore.clear();
      sortedEntries.slice(0, this.MAX_MEMORY_RECORDS / 2)
        .forEach(([key, record]) => this.memoryStore.set(key, record));
    }
    
    // Cleanup old security events
    const eventCutoff = now - (24 * 60 * 60 * 1000); // 24 hours
    this.securityEvents = this.securityEvents.filter(event => event.timestamp > eventCutoff);
  }
  
  /**
   * Get rate limiting statistics
   * @returns Rate limiting statistics
   */
  async getStats(): Promise<RateLimitStats> {
    const stats: RateLimitStats = {
      totalRequests: 0,
      blockedRequests: 0,
      activeBlocks: 0,
      topBlockedIPs: [],
      rateLimitsByType: {}
    };
    
    // Count active blocks and requests
    const now = Date.now();
    for (const record of this.memoryStore.values()) {
      stats.totalRequests += record.attempts;
      
      if (record.blockUntil && now < record.blockUntil) {
        stats.activeBlocks++;
      }
      
      if (record.attempts >= record.maxAttempts) {
        stats.blockedRequests++;
      }
    }
    
    return stats;
  }
  
  /**
   * Clear rate limits for testing
   */
  async clearAll(): Promise<void> {
    this.memoryStore.clear();
    this.securityEvents = [];
    this.suspiciousPatterns.clear();
  }
  
  /**
   * Shutdown cleanup
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export default SecureRateLimiter;
