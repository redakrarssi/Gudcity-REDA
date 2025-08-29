/**
 * Rate limiter utility for QR code scanning
 * Prevents brute force attacks by limiting the number of scan attempts
 */
import { QR_RATE_LIMIT_MAX, QR_RATE_LIMIT_WINDOW_MS } from './env';

interface RateLimitRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitRecord> = new Map();
  private maxAttempts: number;
  private windowMs: number;
  private cleanupInterval: number;

  constructor() {
    this.maxAttempts = QR_RATE_LIMIT_MAX;
    this.windowMs = QR_RATE_LIMIT_WINDOW_MS;
    this.cleanupInterval = this.windowMs * 2; // Clean up twice the window size
    
    // Set up periodic cleanup
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), this.cleanupInterval);
    }
  }

  /**
   * Check if a user/IP has exceeded their rate limit
   * @param key Identifier (userId, IP address, etc.)
   * @returns Object with limit information
   */
  check(key: string): { limited: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.limits.get(key);

    // If no record exists or window has expired, create new record
    if (!record || now - record.firstAttempt > this.windowMs) {
      this.limits.set(key, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return { 
        limited: false, 
        remaining: this.maxAttempts - 1,
        resetTime: now + this.windowMs
      };
    }

    // Update existing record
    record.count += 1;
    record.lastAttempt = now;
    this.limits.set(key, record);

    // Check if limit exceeded
    const limited = record.count > this.maxAttempts;
    const remaining = Math.max(0, this.maxAttempts - record.count);
    const resetTime = record.firstAttempt + this.windowMs;

    return { limited, remaining, resetTime };
  }

  /**
   * Get current rate limit status without incrementing the counter
   * @param key Identifier (userId, IP address, etc.)
   * @returns Object with limit information
   */
  getStatus(key: string): { limited: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.limits.get(key);

    if (!record || now - record.firstAttempt > this.windowMs) {
      return { 
        limited: false, 
        remaining: this.maxAttempts,
        resetTime: now + this.windowMs
      };
    }

    const limited = record.count >= this.maxAttempts;
    const remaining = Math.max(0, this.maxAttempts - record.count);
    const resetTime = record.firstAttempt + this.windowMs;

    return { limited, remaining, resetTime };
  }

  /**
   * Reset rate limit for a specific key
   * @param key Identifier to reset
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.limits.entries()) {
      if (now - record.lastAttempt > this.windowMs) {
        this.limits.delete(key);
      }
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

export default rateLimiter; 