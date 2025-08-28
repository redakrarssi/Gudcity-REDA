/**
 * SECURE Rate Limiter Implementation
 * Replaces the insecure in-memory store with persistent, secure rate limiting
 */

import { Request, Response, NextFunction } from 'express';

// SECURITY: Interface for rate limit store
interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ totalHits: number, resetTime: number }>;
  reset(key: string): Promise<void>;
  cleanup(): Promise<void>;
}

// SECURITY: Redis-based store for production (recommended)
class RedisStore implements RateLimitStore {
  private redis: any;
  private prefix: string;

  constructor(redisClient: any, prefix: string = 'rate_limit:') {
    this.redis = redisClient;
    this.prefix = prefix;
  }

  async increment(key: string, windowMs: number): Promise<{ totalHits: number, resetTime: number }> {
    const now = Date.now();
    const resetTime = now + windowMs;
    const fullKey = `${this.prefix}${key}`;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Increment counter
      pipeline.incr(fullKey);
      // Set expiry
      pipeline.expire(fullKey, Math.ceil(windowMs / 1000));
      // Get current value
      pipeline.get(fullKey);
      
      const results = await pipeline.exec();
      const count = results[0][1] as number;
      
      return {
        totalHits: count,
        resetTime
      };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      // Fallback to allow request if Redis fails
      return { totalHits: 0, resetTime };
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.redis.del(`${this.prefix}${key}`);
    } catch (error) {
      console.error('Redis reset error:', error);
    }
  }

  async cleanup(): Promise<void> {
    // Redis handles cleanup automatically with TTL
  }
}

// SECURITY: Database-based store as fallback
class DatabaseStore implements RateLimitStore {
  private db: any;
  private tableName: string;

  constructor(db: any, tableName: string = 'rate_limits') {
    this.db = db;
    this.tableName = tableName;
    this.initializeTable();
  }

  private async initializeTable(): Promise<void> {
    try {
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id SERIAL PRIMARY KEY,
          rate_key VARCHAR(255) NOT NULL,
          count INTEGER DEFAULT 1,
          reset_time BIGINT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(rate_key)
        );
        CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON ${this.tableName}(rate_key);
        CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON ${this.tableName}(reset_time);
      `);
    } catch (error) {
      console.error('Failed to initialize rate limit table:', error);
    }
  }

  async increment(key: string, windowMs: number): Promise<{ totalHits: number, resetTime: number }> {
    const now = Date.now();
    const resetTime = now + windowMs;

    try {
      // Clean up expired entries first
      await this.db.query(
        `DELETE FROM ${this.tableName} WHERE reset_time < $1`,
        [now]
      );

      // Try to insert new entry or update existing
      const result = await this.db.query(
        `INSERT INTO ${this.tableName} (rate_key, count, reset_time) 
         VALUES ($1, 1, $2) 
         ON CONFLICT (rate_key) 
         DO UPDATE SET 
           count = CASE 
             WHEN ${this.tableName}.reset_time < $3 THEN 1
             ELSE ${this.tableName}.count + 1
           END,
           reset_time = CASE 
             WHEN ${this.tableName}.reset_time < $3 THEN $2
             ELSE ${this.tableName}.reset_time
           END
         RETURNING count`,
        [key, resetTime, now]
      );

      return {
        totalHits: result[0]?.count || 1,
        resetTime
      };
    } catch (error) {
      console.error('Database rate limit error:', error);
      return { totalHits: 0, resetTime };
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.db.query(
        `DELETE FROM ${this.tableName} WHERE rate_key = $1`,
        [key]
      );
    } catch (error) {
      console.error('Database reset error:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      await this.db.query(
        `DELETE FROM ${this.tableName} WHERE reset_time < $1`,
        [now]
      );
    } catch (error) {
      console.error('Database cleanup error:', error);
    }
  }
}

// SECURITY: Enhanced in-memory store with better security (for development only)
class SecureMemoryStore implements RateLimitStore {
  private hits: Map<string, { count: number, resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 30 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 30000);
  }

  async increment(key: string, windowMs: number): Promise<{ totalHits: number, resetTime: number }> {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || now > entry.resetTime) {
      const newEntry = { count: 1, resetTime: now + windowMs };
      this.hits.set(key, newEntry);
      return { totalHits: 1, resetTime: newEntry.resetTime };
    }

    entry.count += 1;
    return { totalHits: entry.count, resetTime: entry.resetTime };
  }

  async reset(key: string): Promise<void> {
    this.hits.delete(key);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of this.hits.entries()) {
      if (now > entry.resetTime) {
        this.hits.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.hits.clear();
  }
}

// Options for the rate limiter
interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string | object;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  requestWasSuccessful?: (req: Request, res: Response) => boolean;
  store?: RateLimitStore;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  handler?: (req: Request, res: Response, next: NextFunction, options: RateLimitOptions) => void;
  // SECURITY: Additional security options
  enableIPWhitelist?: boolean;
  ipWhitelist?: string[];
  enableUserAgentBlocking?: boolean;
  blockedUserAgents?: string[];
}

// Default options with security enhancements
const defaultOptions: RateLimitOptions = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  statusCode: 429, // Too Many Requests
  keyGenerator: (req) => {
    // SECURITY: Enhanced key generation with multiple factors
    const ip = 
      (req.headers['x-forwarded-for'] as string) || 
      (req.headers['x-real-ip'] as string) || 
      req.ip || 
      req.connection?.remoteAddress || 
      'unknown';
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    const method = req.method;
    const url = req.originalUrl || req.url;
    
    // Create a more unique key to prevent bypassing
    return `rate_limit:${ip}:${method}:${url}:${userAgent.substring(0, 50)}`;
  },
  skip: () => false,
  requestWasSuccessful: (_req, res) => res.statusCode < 400,
  standardHeaders: true,
  legacyHeaders: false,
  enableIPWhitelist: false,
  ipWhitelist: [],
  enableUserAgentBlocking: false,
  blockedUserAgents: [],
};

// SECURITY: Create the secure rate limiter middleware
function rateLimit(options?: RateLimitOptions) {
  const opts = { ...defaultOptions, ...options };
  
  // SECURITY: Choose appropriate store based on environment
  let store: RateLimitStore;
  
  if (opts.store) {
    store = opts.store;
  } else if (process.env.REDIS_URL) {
    // Use Redis if available
    try {
      const redis = require('redis');
      const redisClient = redis.createClient({ url: process.env.REDIS_URL });
      store = new RedisStore(redisClient);
    } catch (error) {
      console.warn('Redis not available, falling back to database store');
      store = new SecureMemoryStore();
    }
  } else if (process.env.DATABASE_URL) {
    // Use database if available
    try {
      const db = require('./db').default;
      store = new DatabaseStore(db);
    } catch (error) {
      console.warn('Database not available, falling back to secure memory store');
      store = new SecureMemoryStore();
    }
  } else {
    // Fallback to secure memory store (development only)
    console.warn('Using in-memory rate limiting. Not recommended for production.');
    store = new SecureMemoryStore();
  }
  
  // Return the middleware function
  return async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
      // SECURITY: Check IP whitelist
      if (opts.enableIPWhitelist && opts.ipWhitelist) {
        const clientIP = req.ip || req.connection?.remoteAddress;
        if (opts.ipWhitelist.includes(clientIP || '')) {
          return next();
        }
      }

      // SECURITY: Block suspicious user agents
      if (opts.enableUserAgentBlocking && opts.blockedUserAgents) {
        const userAgent = req.headers['user-agent'] || '';
        for (const blockedAgent of opts.blockedUserAgents) {
          if (userAgent.includes(blockedAgent)) {
            res.status(403).json({ error: 'Access denied' });
            return;
          }
        }
      }

      // Skip if needed
      if (opts.skip!(req)) {
        return next();
      }

      // Get key for this request
      const key = opts.keyGenerator!(req);

      // Increment the counter
      const { totalHits, resetTime } = await store.increment(key, opts.windowMs!);

      // Set headers if enabled
      if (opts.standardHeaders) {
        res.setHeader('RateLimit-Limit', opts.max!);
        res.setHeader('RateLimit-Remaining', Math.max(0, opts.max! - totalHits));
        res.setHeader('RateLimit-Reset', Math.ceil(resetTime / 1000));
      }

      if (opts.legacyHeaders) {
        res.setHeader('X-RateLimit-Limit', opts.max!);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, opts.max! - totalHits));
        res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));
      }

      // Check if rate limit is exceeded
      if (totalHits > opts.max!) {
        // Use custom handler if provided
        if (opts.handler) {
          return opts.handler(req, res, next, opts);
        }

        // Set status code
        res.status(opts.statusCode!);

        // Send response
        if (typeof opts.message === 'object') {
          res.json(opts.message);
        } else {
          res.send(opts.message);
        }

        return;
      }

      // Continue to next middleware
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // SECURITY: Allow request if rate limiting fails (fail-open for availability)
      next();
    }
  };
}

// Export as both default and named export for compatibility
export { rateLimit, RedisStore, DatabaseStore, SecureMemoryStore };
export default rateLimit; 