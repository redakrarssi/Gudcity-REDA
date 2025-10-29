import { VercelRequest, VercelResponse } from '@vercel/node';

interface RateLimitEntry {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

// In-memory store (for production, use Redis or Upstash)
const rateLimitStore: Record<string, RateLimitEntry> = {};

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetAt < now) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs?: number;  // Time window in milliseconds
  max?: number;       // Max requests per window
  blockDurationMs?: number; // How long to block after exceeding limit
  keyGenerator?: (req: VercelRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // 100 requests per window
    blockDurationMs = 60 * 1000, // Block for 1 minute
    keyGenerator = (req) => getClientIdentifier(req),
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return function(handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) {
    return async (req: VercelRequest, res: VercelResponse) => {
      const key = keyGenerator(req);
      const now = Date.now();
      
      // Get or create rate limit entry
      let entry = rateLimitStore[key];
      if (!entry || entry.resetAt < now) {
        entry = {
          count: 0,
          resetAt: now + windowMs
        };
        rateLimitStore[key] = entry;
      }
      
      // Check if currently blocked
      if (entry.blockedUntil && entry.blockedUntil > now) {
        const remainingTime = Math.ceil((entry.blockedUntil - now) / 1000);
        return res.status(429).json({
          error: 'Rate limit exceeded - blocked',
          retryAfter: remainingTime,
          type: 'BLOCKED'
        });
      }
      
      // Check rate limit
      if (entry.count >= max) {
        entry.blockedUntil = now + blockDurationMs;
        const remainingTime = Math.ceil(blockDurationMs / 1000);
        
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: remainingTime,
          type: 'RATE_LIMITED'
        });
      }
      
      // Increment counter
      entry.count++;
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count).toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000).toString());
      
      try {
        // Execute handler
        await handler(req, res);
        
        // If skipSuccessfulRequests is true and response was successful, decrement counter
        if (skipSuccessfulRequests && res.statusCode && res.statusCode < 400) {
          entry.count = Math.max(0, entry.count - 1);
        }
      } catch (error) {
        // If skipFailedRequests is true, decrement counter
        if (skipFailedRequests) {
          entry.count = Math.max(0, entry.count - 1);
        }
        throw error;
      }
    };
  };
}

/**
 * Aggressive rate limiting for sensitive endpoints (auth, etc.)
 */
export function withStrictRateLimit() {
  return withRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 requests per 15 minutes
    blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes
    skipSuccessfulRequests: true // Don't count successful logins against limit
  });
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req: VercelRequest): string {
  // Try to get IP from various headers
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const remoteAddress = req.socket?.remoteAddress;
  
  let ip = 'unknown';
  
  if (forwarded) {
    ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
  } else if (realIP) {
    ip = Array.isArray(realIP) ? realIP[0] : realIP;
  } else if (remoteAddress) {
    ip = remoteAddress;
  }
  
  // Include user agent for better fingerprinting
  const userAgent = req.headers['user-agent'] || '';
  const hash = Buffer.from(`${ip}-${userAgent}`).toString('base64').slice(0, 16);
  
  return `rate-limit:${hash}`;
}
