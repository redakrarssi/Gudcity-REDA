/**
 * SECURE Helmet polyfill with enhanced security headers
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
 * SECURITY: Generate nonce for inline scripts/styles
 */
function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Helmet middleware polyfill for browser environment with SECURITY enhancements
 * @param options Helmet configuration options
 * @returns Middleware function
 */
function helmet(options: HelmetOptions = {}) {
  console.log('SECURE Helmet polyfill initialized with options:', options);
  
  return function helmetMiddleware(req: Request, res: Response, next: NextFunction) {
    // SECURITY: Generate nonce for this request
    const nonce = generateNonce();
    
    // SECURITY: Store nonce in request for use in templates
    (req as any).nonce = nonce;
    
    // SECURITY: Strengthened CSP directives without unsafe-inline
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'nonce-" + nonce + "'",
      "style-src 'self' 'nonce-" + nonce + "'", // SECURITY: Use nonce instead of unsafe-inline
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'", // SECURITY: Block potentially dangerous objects
      "media-src 'self'",
      "frame-src 'none'", // SECURITY: Block iframes to prevent clickjacking
      "base-uri 'self'", // SECURITY: Restrict base URI
      "form-action 'self'", // SECURITY: Restrict form submissions
      "frame-ancestors 'none'", // SECURITY: Block embedding in iframes
      "upgrade-insecure-requests" // SECURITY: Force HTTPS
    ].join('; ');

    // SECURITY: Enhanced security headers
    const securityHeaders: Record<string, string> = {
      'Content-Security-Policy': cspDirectives,
      'X-Content-Type-Options': 'nosniff', // SECURITY: Prevent MIME type sniffing
      'X-Frame-Options': 'DENY', // SECURITY: Block iframe embedding
      'X-XSS-Protection': '1; mode=block', // SECURITY: Enable XSS protection
      'Referrer-Policy': 'strict-origin-when-cross-origin', // SECURITY: Control referrer information
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()', // SECURITY: Restrict permissions
      'Cross-Origin-Embedder-Policy': 'require-corp', // SECURITY: Prevent cross-origin embedding
      'Cross-Origin-Opener-Policy': 'same-origin', // SECURITY: Isolate browsing context
      'Cross-Origin-Resource-Policy': 'same-origin' // SECURITY: Restrict resource loading
    };

    // SECURITY: Only set HSTS on HTTPS with secure configuration
    const isHttps = (req as any).protocol === 'https' || (req.headers['x-forwarded-proto'] as string) === 'https';
    if (isHttps) {
      securityHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }

    // SECURITY: Set all security headers
    Object.entries(securityHeaders).forEach(([header, value]) => {
      try { 
        res.setHeader(header, value); 
      } catch (error) {
        console.warn(`Failed to set security header ${header}:`, error);
      }
    });

    // SECURITY: Remove server information headers
    try {
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');
    } catch (error) {
      // Ignore errors if headers don't exist
    }

    next();
  };
}

// Export the helmet function
export default helmet; 