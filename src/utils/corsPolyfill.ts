/**
 * Browser-compatible CORS polyfill
 * Provides a minimal implementation of the CORS middleware for Express
 * environments in the browser.
 */

import type { Request, Response, NextFunction } from './expressPolyfill';

interface CorsOptions {
  origin?: string | string[] | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
  methods?: string;
  allowedHeaders?: string;
  exposedHeaders?: string;
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

/**
 * CORS middleware polyfill
 * @param options CORS configuration options
 * @returns Middleware function
 */
function cors(options: CorsOptions = {}) {
  // SECURITY: Default to restrictive origins instead of allowing all
  const defaultOrigin = process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'http://localhost:5173']
    : ['http://localhost:5173', 'http://localhost:3000'];
    
  const {
    origin = defaultOrigin,
    methods = 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders = 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token',
    exposedHeaders = '',
    credentials = false,
    maxAge = 86400, // 24 hours
    optionsSuccessStatus = 204,
  } = options;

  return function corsMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
      const requestOrigin = req.headers.origin;
      
      // SECURITY: Validate origin with strict checking
      let allowedOrigin = '';
      if (typeof origin === 'string') {
        // Single origin - exact match only
        if (requestOrigin === origin) {
          allowedOrigin = origin;
        }
      } else if (Array.isArray(origin)) {
        // Multiple origins - check if request origin is in allowed list
        if (requestOrigin && origin.includes(requestOrigin)) {
          allowedOrigin = requestOrigin;
        }
      } else if (typeof origin === 'function') {
        // For function-based origin validation
        origin(requestOrigin, (err, allow) => {
          if (err || !allow) {
            allowedOrigin = '';
          } else {
            allowedOrigin = requestOrigin || '';
          }
        });
      }
      
      // Set CORS headers only if origin is allowed
      if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Access-Control-Allow-Methods', methods);
        res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
        if (exposedHeaders) {
          res.setHeader('Access-Control-Expose-Headers', exposedHeaders);
        }
        if (credentials) {
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        if (maxAge) {
          res.setHeader('Access-Control-Max-Age', String(maxAge));
        }
      }

      // SECURITY: Add additional security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // Add Content Security Policy for production
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Content-Security-Policy', 
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' ws: wss:; " +
          "frame-ancestors 'none';"
        );
      }

      // For preflight requests, respond immediately
      if (req.method === 'OPTIONS') {
        res.status(optionsSuccessStatus).end();
        return;
      }
    } catch (error) {
      console.warn('CORS polyfill encountered an error:', error);
      // SECURITY: Fail closed - don't allow requests if CORS fails
      res.status(403).json({ error: 'CORS policy violation' });
      return;
    }

    next();
  };
}

export default cors; 