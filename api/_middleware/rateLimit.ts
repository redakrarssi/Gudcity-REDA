/**
 * Rate Limiting Middleware
 * Protects API endpoints from excessive requests
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface RateLimitOptions {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Maximum requests per window
  keyGenerator?: (req: VercelRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Create a rate limiter middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return {
    check: (req: VercelRequest, res: VercelResponse): boolean => {
      const key = keyGenerator(req);
      const now = Date.now();
      const entry = rateLimitStore.get(key);

      if (!entry || now > entry.resetAt) {
        // Create new entry
        rateLimitStore.set(key, {
          count: 1,
          resetAt: now + windowMs,
        });
        
        setRateLimitHeaders(res, 1, max, now + windowMs);
        return true;
      }

      // Increment counter
      entry.count++;

      if (entry.count > max) {
        // Rate limit exceeded
        setRateLimitHeaders(res, entry.count, max, entry.resetAt);
        res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
        
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
            details: {
              limit: max,
              windowMs,
              retryAfter: Math.ceil((entry.resetAt - now) / 1000),
            },
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        
        return false;
      }

      setRateLimitHeaders(res, entry.count, max, entry.resetAt);
      return true;
    },
    
    reset: (req: VercelRequest) => {
      const key = keyGenerator(req);
      rateLimitStore.delete(key);
    },
  };
}

/**
 * Default key generator uses IP address
 */
function defaultKeyGenerator(req: VercelRequest): string {
  const ip = 
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown';
  
  return `ratelimit:${ip}:${req.url}`;
}

/**
 * Set rate limit headers
 */
function setRateLimitHeaders(
  res: VercelResponse,
  current: number,
  max: number,
  resetAt: number
): void {
  res.setHeader('X-RateLimit-Limit', max);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));
}

/**
 * Predefined rate limiters
 */

// Standard rate limit: 100 requests per minute
export const standardRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
});

// Sensitive operations: 10 requests per minute
export const sensitiveRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
});

// Authentication: 5 attempts per 15 minutes
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
});

// Strict rate limit for critical operations: 5 requests per minute
export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
});

/**
 * Rate limit middleware wrapper
 */
export function rateLimitMiddleware(
  limiter: ReturnType<typeof createRateLimiter>,
  req: VercelRequest,
  res: VercelResponse,
  next?: () => void
): boolean {
  const allowed = limiter.check(req, res);
  if (allowed && next) {
    next();
  }
  return allowed;
}

