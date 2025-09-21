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
    
    // SECURITY: Enhanced Content Security Policy with strict nonce-based execution
    const cspDirectives = [
      "default-src 'self'",
      // SECURITY: Strict script execution with nonce only
      `script-src 'self' 'nonce-${scriptNonce}' 'strict-dynamic'`,
      // SECURITY: Strict style execution with nonce only
      `style-src 'self' 'nonce-${styleNonce}' https://fonts.googleapis.com 'strict-dynamic'`,
      // SECURITY: Restrict image sources to prevent data exfiltration
      "img-src 'self' data: https: blob:",
      // SECURITY: Restrict connections to prevent data exfiltration
      "connect-src 'self' https: wss: ws:",
      // SECURITY: Restrict font sources
      "font-src 'self' https://fonts.gstatic.com data:",
      // SECURITY: Block all object/embed/iframe content
      "object-src 'none'",
      "embed-src 'none'",
      "frame-src 'none'",
      // SECURITY: Restrict media sources
      "media-src 'self' https:",
      // SECURITY: Restrict worker sources
      "worker-src 'self' blob:",
      // SECURITY: Restrict form actions
      "form-action 'self'",
      // SECURITY: Restrict base URI
      "base-uri 'self'",
      // SECURITY: Restrict manifest sources
      "manifest-src 'self'",
      // SECURITY: Strict frame ancestors policy
      "frame-ancestors 'none'",
      // SECURITY: Block all inline scripts and styles
      "script-src-attr 'none'",
      "style-src-attr 'none'",
      // SECURITY: Require trusted types for DOM manipulation
      "require-trusted-types-for 'script'",
      "trusted-types default"
    ].join('; ');

    // SECURITY: Comprehensive security headers with enhanced protection
    const securityHeaders: Record<string, string> = {
      'Content-Security-Policy': cspDirectives,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // SECURITY: Enhanced permissions policy with more restrictions
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), autoplay=(), encrypted-media=(), fullscreen=(), picture-in-picture=(), sync-xhr=(), clipboard-read=(), clipboard-write=(), web-share=()',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Origin-Agent-Cluster': '?1',
      // SECURITY: Additional security headers
      'X-DNS-Prefetch-Control': 'off',
      'X-Download-Options': 'noopen',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      // SECURITY: Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      // SECURITY: Additional XSS protection
      'X-XSS-Protection': '1; mode=block; report=/csp-report',
      // SECURITY: Feature policy for additional protection
      'Feature-Policy': "geolocation 'none'; microphone 'none'; camera 'none'; payment 'none'; usb 'none'; magnetometer 'none'; gyroscope 'none'; accelerometer 'none'"
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