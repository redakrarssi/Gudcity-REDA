/**
 * Enhanced Rate Limiter
 * 
 * Provides rate limiting with improved error handling and database resilience.
 * Uses the database for distributed rate limiting across multiple instances.
 */
import QrCodeDb from './dbOperations';
import { QrRateLimitError } from './qrCodeErrorHandler';

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
  maxAttempts: number;      // Maximum attempts allowed
  windowSeconds: number;    // Time window in seconds
  blockSeconds: number;     // How long to block after max attempts reached
}

/**
 * Rate limiter for QR code scanning operations
 */
export class EnhancedRateLimiter {
  private readonly defaultConfig: RateLimitConfig;
  private readonly configByType: Record<string, RateLimitConfig>;
  
  /**
   * Create a new rate limiter with configuration
   */
  constructor() {
    // Default rate limit configuration
    this.defaultConfig = {
      maxAttempts: 5,         // 5 attempts
      windowSeconds: 60,       // per minute
      blockSeconds: 300        // 5 minute block after limit reached
    };
    
    // Configure different limits by scan type
    this.configByType = {
      'CUSTOMER_CARD': {
        maxAttempts: 10,       // 10 attempts
        windowSeconds: 60,      // per minute
        blockSeconds: 120       // 2 minute block
      },
      'PROMO_CODE': {
        maxAttempts: 3,         // 3 attempts
        windowSeconds: 30,       // per 30 seconds
        blockSeconds: 600        // 10 minute block
      },
      'LOYALTY_CARD': {
        maxAttempts: 5,         // 5 attempts
        windowSeconds: 60,       // per minute
        blockSeconds: 300        // 5 minute block
      }
    };
  }
  
  /**
   * Get rate limit configuration for a scan type
   */
  private getConfig(scanType?: string): RateLimitConfig {
    if (scanType && this.configByType[scanType]) {
      return this.configByType[scanType];
    }
    return this.defaultConfig;
  }
  
  /**
   * Generate a rate limit key
   */
  private generateKey(params: {
    businessId: number | string;
    ipAddress?: string;
    scanType?: string;
    customerId?: number | string;
  }): string {
    const { businessId, ipAddress, scanType, customerId } = params;
    
    // Create different keys for different scenarios
    if (customerId) {
      // Rate limit by business-customer pair (prevents business scanning same customer repeatedly)
      return `qrscan:biz-${businessId}:cust-${customerId}`;
    } else if (scanType) {
      // Rate limit by business-scantype pair (limits specific scan types)
      return `qrscan:biz-${businessId}:type-${scanType}:ip-${ipAddress || 'unknown'}`;
    } else {
      // General rate limit by business/IP
      return `qrscan:biz-${businessId}:ip-${ipAddress || 'unknown'}`;
    }
  }
  
  /**
   * Check if a requester is rate limited
   * 
   * @returns Object with rate limit status and information
   */
  async checkRateLimit(params: {
    businessId: number | string;
    ipAddress?: string;
    scanType?: string;
    customerId?: number | string;
  }): Promise<{
    limited: boolean;
    key: string;
    config: RateLimitConfig;
    message?: string;
  }> {
    const { scanType } = params;
    const config = this.getConfig(scanType);
    const key = this.generateKey(params);
    
    try {
      // Check if rate limited
      const isLimited = await QrCodeDb.isRateLimited(key, { scanType });
      
      if (isLimited) {
        return {
          limited: true,
          key,
          config,
          message: `Rate limit exceeded. Please try again later.`
        };
      }
      
      return {
        limited: false,
        key,
        config
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      
      // Don't rate limit on errors to prevent blocking legitimate users
      return {
        limited: false,
        key,
        config,
        message: 'Rate limit check error, allowing operation.'
      };
    }
  }
  
  /**
   * Increment rate limit counter
   */
  async increment(params: {
    businessId: number | string;
    ipAddress?: string;
    scanType?: string;
    customerId?: number | string;
  }): Promise<void> {
    const { scanType } = params;
    const config = this.getConfig(scanType);
    const key = this.generateKey(params);
    
    try {
      // Increment rate limit counter
      await QrCodeDb.incrementRateLimit(key, config.maxAttempts, config.blockSeconds, { scanType });
    } catch (error) {
      console.error('Error incrementing rate limit:', error);
      // Don't throw on errors - rate limit tracking should be non-blocking
    }
  }
  
  /**
   * Check and throw if rate limited
   * 
   * @throws QrRateLimitError if rate limited
   */
  async enforceRateLimit(params: {
    businessId: number | string;
    ipAddress?: string;
    scanType?: string;
    customerId?: number | string;
  }): Promise<void> {
    const status = await this.checkRateLimit(params);
    
    if (status.limited) {
      throw new QrRateLimitError(
        status.message || 'Rate limit exceeded',
        {
          key: status.key,
          scanType: params.scanType,
          businessId: params.businessId,
          ipAddress: params.ipAddress,
          customerId: params.customerId
        }
      );
    }
    
    // Increment the counter
    await this.increment(params);
  }
}

export default EnhancedRateLimiter; 