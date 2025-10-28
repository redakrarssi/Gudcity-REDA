/**
 * Enhanced rate limiter with Redis support and improved security
 * This provides a production-ready rate limiting solution with path sanitization
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Redis store interface for production use
interface RedisStore {
  increment(key: string, windowMs: number): Promise<{ totalHits: number, resetTime: number }>;
  reset(key: string): Promise<void>;
}

// Enhanced in-memory store with better security
class MemoryStore {
  private hits: Record<string, { count: number, resetTime: number }> = {};
  private readonly maxKeys = 10000; // Prevent memory exhaustion
  
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
  
  // Clean up expired entries and prevent memory exhaustion
  startCleanup(interval: number, windowMs: number): NodeJS.Timeout {
    const cleanup = () => {
      const now = Date.now();
      const keys = Object.keys(this.hits);
      
      // Remove expired entries
      keys.forEach(key => {
        if (now > this.hits[key].resetTime) {
          delete this.hits[key];
        }
      });
      
      // If we have too many keys, remove oldest ones
      if (keys.length > this.maxKeys) {
        const sortedKeys = keys.sort((a, b) => this.hits[a].resetTime - this.hits[b].resetTime);
        const keysToRemove = sortedKeys.slice(0, keys.length - this.maxKeys);
        keysToRemove.forEach(key => delete this.hits[key]);
      }
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
  store?: RedisStore | MemoryStore; // Store to use (defaults to MemoryStore)
  standardHeaders?: boolean; // Whether to send standard rate limit headers
  legacyHeaders?: boolean;  // Whether to send legacy rate limit headers
  handler?: (req: Request, res: Response, next: NextFunction, options: RateLimitOptions) => void; // Custom handler
}

// Enhanced IP validation and extraction
function extractClientIP(req: Request): string {
  // SECURITY: Use multiple headers for IP detection with validation
  const ipSources = [
    req.headers['x-forwarded-for'] as string,
    req.headers['x-real-ip'] as string,
    req.headers['x-client-ip'] as string,
    req.ip,
    req.connection?.remoteAddress,
    req.socket?.remoteAddress
  ];
  
  // Find the first valid IP address
  for (const ip of ipSources) {
    if (ip && isValidIP(ip)) {
      // If x-forwarded-for contains multiple IPs, take the first one
      return ip.split(',')[0].trim();
    }
  }
  
  // Fallback to a secure default
  return 'unknown';
}

// Validate IP address format
function isValidIP(ip: string): boolean {
  // Basic IP validation (IPv4 and IPv6)
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === 'localhost' || ip === '127.0.0.1';
}

/**
 * Sanitize URL path to prevent key manipulation attacks
 * @param url - The original URL from the request
 * @returns Sanitized path string
 */
function sanitizeUrlPath(url: string): string {
  if (!url || typeof url !== 'string') {
    return '/';
  }

  try {
    // SECURITY: Remove query parameters and fragments to prevent manipulation
    const urlObj = new URL(url, 'http://dummy.com');
    let pathname = urlObj.pathname;

    // SECURITY: Normalize path separators and remove dangerous characters
    pathname = pathname
      .replace(/\/+/g, '/') // Collapse multiple slashes
      .replace(/[^\w\-\/\.]/g, '') // Remove non-alphanumeric chars except safe ones
      .toLowerCase(); // Case normalization

    // SECURITY: Limit path length to prevent excessively long keys
    const MAX_PATH_LENGTH = 100;
    if (pathname.length > MAX_PATH_LENGTH) {
      pathname = pathname.substring(0, MAX_PATH_LENGTH);
    }

    // SECURITY: Ensure path starts with /
    if (!pathname.startsWith('/')) {
      pathname = '/' + pathname;
    }

    return pathname;
  } catch (error) {
    // Fallback for invalid URLs
    console.warn('Invalid URL in rate limiting:', error);
    return '/';
  }
}

/**
 * Create a secure hash of the sanitized path to prevent key manipulation
 * @param sanitizedPath - The sanitized URL path
 * @returns SHA-256 hash of the path (first 16 characters for brevity)
 */
function hashPath(sanitizedPath: string): string {
  try {
    return crypto
      .createHash('sha256')
      .update(sanitizedPath)
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for brevity while maintaining uniqueness
  } catch (error) {
    // Fallback hash for environments without crypto
    console.warn('Crypto unavailable, using fallback hash:', error);
    let hash = 0;
    for (let i = 0; i < sanitizedPath.length; i++) {
      const char = sanitizedPath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 16);
  }
}

// Default options with enhanced security
const defaultOptions: RateLimitOptions = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  statusCode: 429, // Too Many Requests
  keyGenerator: (req) => {
    // SECURITY: Enhanced key generation with comprehensive path sanitization
    const ip = extractClientIP(req);
    const method = req.method;
    const url = req.originalUrl || req.url || '/';
    
    // SECURITY: Sanitize URL path to prevent key manipulation attacks
    const sanitizedPath = sanitizeUrlPath(url);
    
    // SECURITY: Use hash of sanitized path to prevent key manipulation and reduce key length
    const hashedPath = hashPath(sanitizedPath);
    
    return `rate_limit:${ip}:${method}:${hashedPath}`;
  },
  skip: (req) => {
    // Skip health checks and static assets
    return req.path === '/health' || req.path.startsWith('/static/');
  },
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
export { rateLimit, MemoryStore, type RedisStore, sanitizeUrlPath, hashPath };
export default rateLimit; 