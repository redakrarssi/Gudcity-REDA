/**
 * Browser-compatible rate limiter to replace express-rate-limit
 * This provides a simplified version that works in both Node.js and browser environments
 */

import { Request, Response, NextFunction } from 'express';

// Simple in-memory store for rate limiting
class MemoryStore {
  private hits: Record<string, { count: number, resetTime: number }> = {};
  
  // Increment the hit counter for a key
  increment(key: string, windowMs: number): { totalHits: number, resetTime: number } {
    const now = Date.now();
    
    // Initialize or reset if expired
    if (!this.hits[key] || now > this.hits[key].resetTime) {
      this.hits[key] = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    
    // Increment the counter
    this.hits[key].count += 1;
    
    return {
      totalHits: this.hits[key].count,
      resetTime: this.hits[key].resetTime
    };
  }
  
  // Reset a key
  reset(key: string): void {
    delete this.hits[key];
  }
  
  // Clean up expired entries periodically
  startCleanup(interval: number, windowMs: number): NodeJS.Timeout {
    const cleanup = () => {
      const now = Date.now();
      Object.keys(this.hits).forEach(key => {
        if (now > this.hits[key].resetTime) {
          delete this.hits[key];
        }
      });
    };
    
    return setInterval(cleanup, interval);
  }
}

// Options for the rate limiter
interface RateLimitOptions {
  windowMs?: number;        // Milliseconds for the sliding window
  max?: number;             // Maximum number of requests in the window
  message?: string | object; // Response message when rate limit is exceeded
  statusCode?: number;      // Status code for rate limit responses
  keyGenerator?: (req: Request) => string; // Function to generate keys
  skip?: (req: Request) => boolean; // Function to skip requests
  requestWasSuccessful?: (req: Request, res: Response) => boolean; // Function to determine if request was successful
  store?: any;              // Store to use (defaults to MemoryStore)
  standardHeaders?: boolean; // Whether to send standard rate limit headers
  legacyHeaders?: boolean;  // Whether to send legacy rate limit headers
  handler?: (req: Request, res: Response, next: NextFunction, options: RateLimitOptions) => void; // Custom handler
}

// Default options
const defaultOptions: RateLimitOptions = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  statusCode: 429, // Too Many Requests
  keyGenerator: (req) => {
    // Try to get IP from various headers or default to a random string
    const ip = 
      (req.headers['x-forwarded-for'] as string) || 
      (req.headers['x-real-ip'] as string) || 
      req.ip || 
      req.connection?.remoteAddress || 
      'unknown';
    
    return `${ip}:${req.method}:${req.originalUrl || req.url}`;
  },
  skip: () => false,
  requestWasSuccessful: (_req, res) => res.statusCode < 400,
  standardHeaders: true,
  legacyHeaders: false,
};

// Create the rate limiter middleware
function rateLimit(options?: RateLimitOptions) {
  // Merge options with defaults
  const opts = { ...defaultOptions, ...options };
  
  // Use provided store or create a new MemoryStore
  const store = opts.store || new MemoryStore();
  
  // Start cleanup if using MemoryStore
  if (!opts.store) {
    (store as MemoryStore).startCleanup(
      Math.min(opts.windowMs! / 2, 30 * 1000), // Clean up at most every 30 seconds
      opts.windowMs!
    );
  }
  
  // Return the middleware function
  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    // Skip if needed
    if (opts.skip!(req)) {
      return next();
    }
    
    // Get key for this request
    const key = opts.keyGenerator!(req);
    
    // Increment the counter
    const { totalHits, resetTime } = store.increment(key, opts.windowMs!);
    
    // Set headers if enabled
    if (opts.standardHeaders) {
      res.setHeader('RateLimit-Limit', opts.max!);
      res.setHeader('RateLimit-Remaining', Math.max(0, opts.max! - totalHits));
      res.setHeader('RateLimit-Reset', Math.ceil(resetTime / 1000)); // in seconds
    }
    
    if (opts.legacyHeaders) {
      res.setHeader('X-RateLimit-Limit', opts.max!);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, opts.max! - totalHits));
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000)); // in seconds
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
  };
}

// Export as both default and named export for compatibility
export { rateLimit };
export default rateLimit; 