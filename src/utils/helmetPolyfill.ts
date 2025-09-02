/**
 * Enhanced Helmet polyfill with strengthened security headers
 * This provides a production-ready security headers implementation with nonce-based CSP
 */

import type { Request, Response, NextFunction } from './expressPolyfill';
import crypto from 'crypto';

// Extend Request interface to include CSP nonce
declare module './expressPolyfill' {
  interface Request {
    cspNonce?: string;
  }
}

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
 * Generate a cryptographically secure nonce for CSP
 * @returns A base64-encoded random nonce string
 */
function generateCSPNonce(): string {
  try {
    return crypto.randomBytes(16).toString('base64');
  } catch (error) {
    console.warn('Failed to generate crypto nonce, using fallback:', error);
    // Fallback to timestamp + random for environments without crypto
    return Buffer.from(`${Date.now()}_${Math.random().toString(36).slice(2)}`).toString('base64');
  }
}

/**
 * Enhanced Helmet middleware polyfill with production-ready security
 * @param options Helmet configuration options
 * @returns Middleware function
 */
function helmet(options: HelmetOptions = {}) {
  console.log('Enhanced Helmet polyfill initialized with options:', options);
  
  return function helmetMiddleware(req: Request, res: Response, next: NextFunction) {
    // SECURITY: Generate cryptographically secure nonce for each request
    const styleNonce = generateCSPNonce();
    const scriptNonce = generateCSPNonce();
    
    // Make nonces available for use in templates
    req.cspNonce = styleNonce;
    (req as any).scriptNonce = scriptNonce;
    
    // SECURITY: Enhanced Content Security Policy with nonce-based inline styles
    const cspDirectives = [
      "default-src 'self'",
      // SECURITY: Use nonce for scripts instead of unsafe-eval
      `script-src 'self' 'nonce-${scriptNonce}'`,
      // SECURITY: Use nonce for styles instead of unsafe-inline
      `style-src 'self' 'nonce-${styleNonce}' https://fonts.googleapis.com`,
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https: wss:",
      "font-src 'self' https://fonts.gstatic.com",
      "object-src 'none'",
      "media-src 'self' https:",
      "frame-src 'none'",
      "worker-src 'self' blob:",
      "form-action 'self'",
      "base-uri 'self'",
      "manifest-src 'self'",
      // Clickjacking protection beyond X-Frame-Options
      "frame-ancestors 'none'"
    ].join('; ');

    // SECURITY: Comprehensive security headers
    const securityHeaders: Record<string, string> = {
      'Content-Security-Policy': cspDirectives,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Origin-Agent-Cluster': '?1'
    };

    // SECURITY: Only set HSTS on HTTPS with enhanced settings
    const isHttps = (req as any).protocol === 'https' || 
                    (req.headers['x-forwarded-proto'] as string) === 'https' ||
                    (req.headers['x-forwarded-ssl'] as string) === 'on';
    
    if (isHttps) {
      securityHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }

    // SECURITY: Hide server information
    securityHeaders['X-Powered-By'] = 'GudCity Platform';

    // SECURITY: Apply all security headers
    Object.entries(securityHeaders).forEach(([header, value]) => {
      try { 
        res.setHeader(header, value); 
      } catch (error) {
        console.warn(`Failed to set security header ${header}:`, error);
      }
    });

    next();
  };
}

/**
 * Utility function to generate CSP nonces for use in templates
 * Usage in HTML templates:
 * <style nonce="${req.cspNonce}">...</style>
 * <script nonce="${req.scriptNonce}">...</script>
 */
export { generateCSPNonce };

// Export the helmet function
export default helmet; 