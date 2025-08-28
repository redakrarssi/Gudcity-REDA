/**
 * Secure Rate Limiting Utility
 * Prevents brute force attacks and API abuse
 */

import { v4 as uuidv4 } from 'uuid';

// Rate limit configurations
const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    blockDuration: 30 * 60 * 1000, // 30 minutes block after max attempts
    progressiveDelay: true
  },
  
  // API endpoints
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    blockDuration: 5 * 60 * 1000, // 5 minutes block
    progressiveDelay: false
  },
  
  // File upload endpoints
  UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 uploads per minute
    blockDuration: 10 * 60 * 1000, // 10 minutes block
    progressiveDelay: true
  },
  
  // QR code generation
  QR_GENERATION: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 QR codes per minute
    blockDuration: 5 * 60 * 1000, // 5 minutes block
    progressiveDelay: false
  },
  
  // Points awarding
  POINTS_AWARD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50, // 50 point awards per minute
    blockDuration: 5 * 60 * 1000, // 5 minutes block
    progressiveDelay: false
  },
  
  // Admin endpoints
  ADMIN: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    blockDuration: 15 * 60 * 1000, // 15 minutes block
    progressiveDelay: false
  }
};

// In-memory store for rate limiting (use Redis in production)
interface RateLimitEntry {
  count: number;
  resetAt: number;
  blockedUntil?: number;
  lastRequestTime: number;
  progressiveDelayMs: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now && (!entry.blockedUntil || entry.blockedUntil < now)) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Generate rate limit key
 */
function generateRateLimitKey(
  identifier: string,
  endpoint: string,
  config: keyof typeof RATE_LIMIT_CONFIGS
): string {
  return `${config}:${endpoint}:${identifier}`;
}

/**
 * Get client identifier
 */
function getClientIdentifier(req: any): string {
  // Try to get from user ID first
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  
  // Try to get from API key
  if (req.headers['x-api-key']) {
    return `api:${req.headers['x-api-key']}`;
  }
  
  // Use IP address as fallback
  const ip = req.headers['x-forwarded-for'] || 
             req.connection?.remoteAddress || 
             req.socket?.remoteAddress || 
             req.ip || 
             'unknown';
  
  return `ip:${ip}`;
}

/**
 * Calculate progressive delay
 */
function calculateProgressiveDelay(attempts: number, baseDelay: number = 1000): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s (max)
  const delay = Math.min(baseDelay * Math.pow(2, attempts - 1), 60000);
  return delay;
}

/**
 * Check rate limit
 */
export function checkRateLimit(
  req: any,
  config: keyof typeof RATE_LIMIT_CONFIGS,
  endpoint: string = req.path
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  blockedUntil?: number;
} {
  const clientId = getClientIdentifier(req);
  const key = generateRateLimitKey(clientId, endpoint, config);
  const now = Date.now();
  const limitConfig = RATE_LIMIT_CONFIGS[config];
  
  let entry = rateLimitStore.get(key);
  
  if (!entry) {
    // Create new entry
    entry = {
      count: 0,
      resetAt: now + limitConfig.windowMs,
      lastRequestTime: now,
      progressiveDelayMs: 0
    };
    rateLimitStore.set(key, entry);
  }
  
  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      blockedUntil: entry.blockedUntil
    };
  }
  
  // Reset counter if window has passed
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + limitConfig.windowMs;
    entry.progressiveDelayMs = 0;
  }
  
  // Check if limit exceeded
  if (entry.count >= limitConfig.maxRequests) {
    // Block the client
    entry.blockedUntil = now + limitConfig.blockDuration;
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      blockedUntil: entry.blockedUntil
    };
  }
  
  // Calculate progressive delay if enabled
  let retryAfter: number | undefined;
  if (limitConfig.progressiveDelay && entry.count > 0) {
    entry.progressiveDelayMs = calculateProgressiveDelay(entry.count);
    retryAfter = entry.progressiveDelayMs;
  }
  
  // Increment counter
  entry.count++;
  entry.lastRequestTime = now;
  
  return {
    allowed: true,
    remaining: limitConfig.maxRequests - entry.count,
    resetTime: entry.resetAt,
    retryAfter
  };
}

/**
 * Rate limit middleware factory
 */
export function createRateLimitMiddleware(
  config: keyof typeof RATE_LIMIT_CONFIGS,
  endpoint?: string
) {
  return (req: any, res: any, next: any) => {
    try {
      const result = checkRateLimit(req, config, endpoint);
      
      if (!result.allowed) {
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', RATE_LIMIT_CONFIGS[config].maxRequests);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
        
        if (result.blockedUntil) {
          res.setHeader('X-RateLimit-Blocked-Until', new Date(result.blockedUntil).toISOString());
        }
        
        if (result.retryAfter) {
          res.setHeader('Retry-After', Math.ceil(result.retryAfter / 1000));
        }
        
        return res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: result.retryAfter ? Math.ceil(result.retryAfter / 1000) : undefined,
          blockedUntil: result.blockedUntil ? new Date(result.blockedUntil).toISOString() : undefined
        });
      }
      
      // Set rate limit headers for successful requests
      res.setHeader('X-RateLimit-Limit', RATE_LIMIT_CONFIGS[config].maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      
      // Add progressive delay if needed
      if (result.retryAfter) {
        setTimeout(() => {
          next();
        }, result.retryAfter);
      } else {
        next();
      }
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // Allow request to proceed if rate limiting fails
      next();
    }
  };
}

/**
 * Get rate limit status for a client
 */
export function getRateLimitStatus(
  clientId: string,
  config: keyof typeof RATE_LIMIT_CONFIGS,
  endpoint: string
): {
  isBlocked: boolean;
  remaining: number;
  resetTime: number;
  blockedUntil?: number;
  attempts: number;
} {
  const key = generateRateLimitKey(clientId, endpoint, config);
  const entry = rateLimitStore.get(key);
  const now = Date.now();
  
  if (!entry) {
    return {
      isBlocked: false,
      remaining: RATE_LIMIT_CONFIGS[config].maxRequests,
      resetTime: now + RATE_LIMIT_CONFIGS[config].windowMs,
      attempts: 0
    };
  }
  
  const isBlocked = entry.blockedUntil ? now < entry.blockedUntil : false;
  const remaining = isBlocked ? 0 : Math.max(0, RATE_LIMIT_CONFIGS[config].maxRequests - entry.count);
  
  return {
    isBlocked,
    remaining,
    resetTime: entry.resetAt,
    blockedUntil: entry.blockedUntil,
    attempts: entry.count
  };
}

/**
 * Reset rate limit for a client
 */
export function resetRateLimit(
  clientId: string,
  config: keyof typeof RATE_LIMIT_CONFIGS,
  endpoint: string
): boolean {
  const key = generateRateLimitKey(clientId, endpoint, config);
  return rateLimitStore.delete(key);
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats(): {
  totalEntries: number;
  blockedEntries: number;
  activeEntries: number;
  configs: Record<string, any>;
} {
  const now = Date.now();
  let blockedEntries = 0;
  let activeEntries = 0;
  
  for (const entry of rateLimitStore.values()) {
    if (entry.blockedUntil && now < entry.blockedUntil) {
      blockedEntries++;
    } else {
      activeEntries++;
    }
  }
  
  return {
    totalEntries: rateLimitStore.size,
    blockedEntries,
    activeEntries,
    configs: RATE_LIMIT_CONFIGS
  };
}

/**
 * Predefined rate limit middlewares
 */
export const rateLimitMiddlewares = {
  auth: createRateLimitMiddleware('AUTH'),
  api: createRateLimitMiddleware('API'),
  upload: createRateLimitMiddleware('UPLOAD'),
  qrGeneration: createRateLimitMiddleware('QR_GENERATION'),
  pointsAward: createRateLimitMiddleware('POINTS_AWARD'),
  admin: createRateLimitMiddleware('ADMIN')
};

/**
 * Custom rate limit middleware
 */
export function customRateLimit(
  windowMs: number,
  maxRequests: number,
  blockDuration?: number,
  progressiveDelay?: boolean
) {
  const config = {
    windowMs,
    maxRequests,
    blockDuration: blockDuration || windowMs * 2,
    progressiveDelay: progressiveDelay || false
  };
  
  return (req: any, res: any, next: any) => {
    const clientId = getClientIdentifier(req);
    const key = `custom:${req.path}:${clientId}`;
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    if (!entry) {
      entry = {
        count: 0,
        resetAt: now + config.windowMs,
        lastRequestTime: now,
        progressiveDelayMs: 0
      };
      rateLimitStore.set(key, entry);
    }
    
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.'
      });
    }
    
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + config.windowMs;
      entry.progressiveDelayMs = 0;
    }
    
    if (entry.count >= config.maxRequests) {
      entry.blockedUntil = now + config.blockDuration;
      
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.'
      });
    }
    
    entry.count++;
    entry.lastRequestTime = now;
    
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', config.maxRequests - entry.count);
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetAt).toISOString());
    
    next();
  };
}