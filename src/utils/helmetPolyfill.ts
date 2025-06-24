/**
 * Browser-compatible Helmet polyfill
 * This provides a minimal implementation of Helmet for browser environments
 */

import type { Request, Response, NextFunction } from './expressPolyfill';

// Define the HelmetOptions interface
interface HelmetOptions {
  contentSecurityPolicy?: boolean | { directives: Record<string, any> };
  crossOriginEmbedderPolicy?: boolean | { policy?: string };
  crossOriginOpenerPolicy?: boolean | { policy?: string };
  crossOriginResourcePolicy?: boolean | { policy?: string };
  dnsPrefetchControl?: boolean | { allow?: boolean };
  expectCt?: boolean | { maxAge?: number; enforce?: boolean; reportUri?: string };
  frameguard?: boolean | { action?: 'deny' | 'sameorigin'; domain?: string };
  hidePoweredBy?: boolean | { setTo?: string };
  hsts?: boolean | { maxAge?: number; includeSubDomains?: boolean; preload?: boolean };
  ieNoOpen?: boolean;
  noSniff?: boolean;
  originAgentCluster?: boolean;
  permittedCrossDomainPolicies?: boolean | { permittedPolicies?: string };
  referrerPolicy?: boolean | { policy?: string | string[] };
  xssFilter?: boolean | { reportUri?: string };
}

/**
 * Helmet middleware polyfill for browser environment
 * @param options Helmet configuration options
 * @returns Middleware function
 */
function helmet(options: HelmetOptions = {}) {
  console.log('Helmet polyfill initialized with options:', options);
  
  return function helmetMiddleware(req: Request, res: Response, next: NextFunction) {
    // Set default security headers
    const securityHeaders = {
      'Content-Security-Policy': "default-src 'self'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'no-referrer',
      'Strict-Transport-Security': 'max-age=15552000; includeSubDomains'
    };
    
    // Apply headers to response
    Object.entries(securityHeaders).forEach(([header, value]) => {
      res.setHeader(header, value);
    });
    
    console.log('Helmet polyfill: Applied security headers');
    next();
  };
}

// Export the helmet function
export default helmet; 