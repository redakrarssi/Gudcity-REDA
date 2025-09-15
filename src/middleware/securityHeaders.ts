/**
 * Security Headers Middleware
 * 
 * Provides comprehensive security headers for HTTP responses,
 * with special handling for QR code endpoints and API routes.
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

export interface SecurityHeadersOptions {
  enableCSP?: boolean;
  enableHSTS?: boolean;
  enableXSSProtection?: boolean;
  enableContentTypeSniffing?: boolean;
  enableFrameProtection?: boolean;
  customCSP?: string;
  isDevelopment?: boolean;
}

/**
 * Enhanced security headers middleware with QR-specific protections
 */
export const securityHeaders = (options: SecurityHeadersOptions = {}) => {
  const {
    enableCSP = true,
    enableHSTS = true,
    enableXSSProtection = true,
    enableContentTypeSniffing = true,
    enableFrameProtection = true,
    isDevelopment = process.env.NODE_ENV === 'development'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // SECURITY: Basic security headers
    if (enableContentTypeSniffing) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    
    if (enableFrameProtection) {
      res.setHeader('X-Frame-Options', 'DENY');
    }
    
    if (enableXSSProtection) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }
    
    // SECURITY: Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // SECURITY: Permissions policy (restrict dangerous features)
    res.setHeader(
      'Permissions-Policy', 
      'geolocation=(), microphone=(), camera=(self), payment=(), usb=(), ' +
      'magnetometer=(), gyroscope=(), accelerometer=(), bluetooth=(), ' +
      'display-capture=(), speaker=()'
    );
    
    // SECURITY: Cross-origin policies
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    
    // SECURITY: Additional security headers
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('X-Download-Options', 'noopen');
    
    // SECURITY: HSTS (only in production with HTTPS)
    if (enableHSTS && !isDevelopment) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }
    
    // SECURITY: Content Security Policy
    if (enableCSP) {
      const csp = buildContentSecurityPolicy(req, isDevelopment);
      res.setHeader('Content-Security-Policy', csp);
    }
    
    // SECURITY: QR code specific headers
    if (isQrCodeEndpoint(req.path)) {
      applyQrCodeSecurityHeaders(res);
    }
    
    // SECURITY: API specific headers
    if (isApiEndpoint(req.path)) {
      applyApiSecurityHeaders(res);
    }
    
    // SECURITY: Admin specific headers (most restrictive)
    if (isAdminEndpoint(req.path)) {
      applyAdminSecurityHeaders(res);
    }
    
    next();
  };
};

/**
 * Build Content Security Policy based on request and environment
 */
function buildContentSecurityPolicy(req: Request, isDevelopment: boolean): string {
  const baseCSP = {
    'default-src': ["'self'"],
    'script-src': isDevelopment 
      ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "localhost:*", "127.0.0.1:*"]
      : ["'self'", "'nonce-{NONCE}'"],
    'style-src': [
      "'self'", 
      "'unsafe-inline'", // Required for CSS-in-JS libraries
      "https://fonts.googleapis.com",
      "https://cdnjs.cloudflare.com"
    ],
    'img-src': [
      "'self'", 
      "data:", 
      "https:", 
      "blob:",
      "*.qr-server.com", // QR code generation services
      "chart.googleapis.com" // Chart images
    ],
    'connect-src': isDevelopment
      ? ["'self'", "ws:", "wss:", "http:", "https:", "localhost:*", "127.0.0.1:*"]
      : ["'self'", "https:", "wss:"],
    'font-src': [
      "'self'", 
      "https://fonts.gstatic.com",
      "https://cdnjs.cloudflare.com"
    ],
    'object-src': ["'none'"],
    'media-src': ["'self'", "https:"],
    'frame-src': ["'none'"],
    'worker-src': ["'self'", "blob:"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'manifest-src': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': []
  };
  
  // SECURITY: Stricter CSP for QR code endpoints
  if (isQrCodeEndpoint(req.path)) {
    baseCSP['script-src'] = ["'self'"]; // No inline scripts for QR endpoints
    baseCSP['object-src'] = ["'none'"];
    baseCSP['frame-src'] = ["'none'"];
    baseCSP['connect-src'] = ["'self'"]; // Only same-origin connections
  }
  
  // Convert CSP object to string
  return Object.entries(baseCSP)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Apply QR code specific security headers
 */
function applyQrCodeSecurityHeaders(res: Response): void {
  // SECURITY: Prevent caching of QR codes
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // SECURITY: QR code integrity headers
  res.setHeader('X-QR-Security-Version', '2.0');
  res.setHeader('X-Content-Security-Policy-Report-Only', 'default-src \'self\'');
  
  // SECURITY: Additional restrictions for QR endpoints
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
}

/**
 * Apply API specific security headers
 */
function applyApiSecurityHeaders(res: Response): void {
  // SECURITY: API response headers
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('Cache-Control', 'no-cache, private');
  
  // SECURITY: Prevent embedding API responses
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // SECURITY: Rate limiting headers (will be set by rate limiter)
  res.setHeader('X-Rate-Limit-Policy', 'enforced');
}

/**
 * Apply admin specific security headers (most restrictive)
 */
function applyAdminSecurityHeaders(res: Response): void {
  // SECURITY: Admin endpoints get maximum protection
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // SECURITY: Stricter frame protection
  res.setHeader('X-Frame-Options', 'DENY');
  
  // SECURITY: Admin-specific headers
  res.setHeader('X-Admin-Endpoint', 'true');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive, noimageindex');
  
  // SECURITY: Additional CSP for admin
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; connect-src 'self'; font-src 'self'; " +
    "object-src 'none'; frame-src 'none'; worker-src 'none'; " +
    "form-action 'self'; base-uri 'self'; frame-ancestors 'none';"
  );
}

/**
 * Check if request is for a QR code endpoint
 */
function isQrCodeEndpoint(path: string): boolean {
  const qrPaths = ['/qr/', '/api/qr/', '/qrcode/', '/api/qrcode/', '/scan/'];
  return qrPaths.some(qrPath => path.includes(qrPath));
}

/**
 * Check if request is for an API endpoint
 */
function isApiEndpoint(path: string): boolean {
  return path.startsWith('/api/');
}

/**
 * Check if request is for an admin endpoint
 */
function isAdminEndpoint(path: string): boolean {
  const adminPaths = ['/admin/', '/api/admin/', '/dashboard/admin/'];
  return adminPaths.some(adminPath => path.includes(adminPath));
}

/**
 * Helmet.js configuration for additional security
 */
export const helmetConfig = helmet({
  // SECURITY: Content Security Policy (handled separately for more control)
  contentSecurityPolicy: false,
  
  // SECURITY: Cross-origin embedder policy
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  
  // SECURITY: DNS prefetch control
  dnsPrefetchControl: { allow: false },
  
  // SECURITY: Frame guard
  frameguard: { action: 'deny' },
  
  // SECURITY: Hide powered by header
  hidePoweredBy: true,
  
  // SECURITY: HSTS (configured based on environment)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // SECURITY: IE no open
  ieNoOpen: true,
  
  // SECURITY: No sniff
  noSniff: true,
  
  // SECURITY: Origin agent cluster
  originAgentCluster: true,
  
  // SECURITY: Permitted cross domain policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  
  // SECURITY: Referrer policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // SECURITY: XSS filter
  xssFilter: true
});

/**
 * Development-specific security headers (more permissive)
 */
export const developmentSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // More permissive headers for development
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Allow same-origin framing
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Development CSP (more permissive)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* 127.0.0.1:* ws: wss:; " +
    "img-src 'self' data: https: localhost:* 127.0.0.1:*; " +
    "connect-src 'self' ws: wss: http: https: localhost:* 127.0.0.1:*;"
  );
  
  next();
};

/**
 * Security headers for static assets
 */
export const staticAssetHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Cache static assets but with security headers
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(req.path);
  
  if (isStaticAsset) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
  
  next();
};

export default securityHeaders;
