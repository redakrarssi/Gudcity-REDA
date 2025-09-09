/**
 * Rate Limiting Types
 * 
 * Type definitions for the secure rate limiting system
 */

export interface RateLimitConfig {
  maxAttempts: number;     // Maximum attempts allowed
  windowSeconds: number;   // Time window in seconds
  blockSeconds: number;    // How long to block after max attempts reached
  dailyLimit?: number;     // Optional daily limit
}

export interface RateLimitResult {
  limited: boolean;
  key?: string;
  reason?: string;
  resetTime?: number;      // When the limit resets (timestamp)
  attemptsRemaining?: number;
  dailyAttemptsRemaining?: number;
}

export interface RateLimitParams {
  businessId: string;
  ipAddress: string;
  scanType: string;
  fingerprint?: string;    // Device fingerprint
  userId?: string;         // Optional user ID
  userAgent?: string;      // Browser user agent
}

export interface RateLimitRecord {
  key: string;
  attempts: number;
  maxAttempts: number;
  windowStart: number;     // Window start timestamp
  windowSeconds: number;
  blockUntil?: number;     // Block until timestamp
  dailyAttempts?: number;
  dailyReset?: number;     // Daily reset timestamp
  createdAt: number;
  updatedAt: number;
}

export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  activeBlocks: number;
  topBlockedIPs: Array<{
    ip: string;
    count: number;
  }>;
  rateLimitsByType: Record<string, {
    requests: number;
    blocks: number;
  }>;
}

export interface RateLimitCleanupOptions {
  expiredOnly?: boolean;
  olderThanHours?: number;
  maxRecords?: number;
}

export type RateLimitType = 
  | 'CUSTOMER_CARD' 
  | 'PROMO_CODE' 
  | 'LOYALTY_CARD' 
  | 'BUSINESS_QR' 
  | 'API_GENERAL'
  | 'AUTH_LOGIN'
  | 'AUTH_REGISTER'
  | 'PASSWORD_RESET';

// Predefined rate limit configurations for different operation types
export const RATE_LIMIT_CONFIGS: Record<RateLimitType, RateLimitConfig> = {
  CUSTOMER_CARD: {
    maxAttempts: 5,        // 5 attempts
    windowSeconds: 60,     // per minute
    blockSeconds: 300,     // 5 minute block
    dailyLimit: 50         // 50 per day
  },
  PROMO_CODE: {
    maxAttempts: 2,        // 2 attempts
    windowSeconds: 60,     // per minute  
    blockSeconds: 900,     // 15 minute block
    dailyLimit: 10         // 10 per day
  },
  LOYALTY_CARD: {
    maxAttempts: 5,        // 5 attempts
    windowSeconds: 60,     // per minute
    blockSeconds: 300,     // 5 minute block
    dailyLimit: 100        // 100 per day
  },
  BUSINESS_QR: {
    maxAttempts: 10,       // 10 attempts
    windowSeconds: 60,     // per minute
    blockSeconds: 180,     // 3 minute block
    dailyLimit: 200        // 200 per day
  },
  API_GENERAL: {
    maxAttempts: 100,      // 100 requests
    windowSeconds: 900,    // per 15 minutes
    blockSeconds: 300,     // 5 minute block
    dailyLimit: 5000       // 5000 per day
  },
  AUTH_LOGIN: {
    maxAttempts: 5,        // 5 attempts
    windowSeconds: 900,    // per 15 minutes
    blockSeconds: 1800,    // 30 minute block
    dailyLimit: 20         // 20 login attempts per day
  },
  AUTH_REGISTER: {
    maxAttempts: 3,        // 3 attempts
    windowSeconds: 3600,   // per hour
    blockSeconds: 3600,    // 1 hour block
    dailyLimit: 5          // 5 registrations per day
  },
  PASSWORD_RESET: {
    maxAttempts: 3,        // 3 attempts
    windowSeconds: 3600,   // per hour
    blockSeconds: 3600,    // 1 hour block
    dailyLimit: 5          // 5 password resets per day
  }
};

export interface SecurityEvent {
  type: 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_ACTIVITY' | 'POTENTIAL_ATTACK';
  ip: string;
  userAgent?: string;
  fingerprint?: string;
  scanType: string;
  businessId?: string;
  userId?: string;
  details: Record<string, any>;
  timestamp: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SuspiciousActivityPattern {
  type: 'RAPID_SCANNING' | 'IP_HOPPING' | 'PATTERN_MATCHING' | 'BRUTE_FORCE';
  confidence: number; // 0-1 scale
  indicators: string[];
  riskScore: number;  // 0-100 scale
}

// Error types for rate limiting
export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly details: {
      key: string;
      scanType?: string;
      businessId?: string;
      ipAddress?: string;
      resetTime?: number;
      attemptsRemaining?: number;
    }
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class SecurityError extends Error {
  constructor(
    message: string,
    public readonly event: SecurityEvent
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}
