/**
 * Browser-compatible CORS polyfill with enhanced security
 * Provides a secure CORS middleware implementation with comprehensive
 * origin validation, protocol checking, and subdomain validation.
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
 * Validate if a URL string is properly formatted
 * @param urlString - URL string to validate
 * @returns true if URL is valid, false otherwise
 */
function isValidUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') {
    return false;
  }

  try {
    const url = new URL(urlString);
    
    // SECURITY: Check for basic URL structure requirements
    if (!url.protocol || !url.hostname) {
      return false;
    }
    
    // SECURITY: Reject URLs with suspicious patterns
    const suspiciousPatterns = [
      /\x00/,           // Null bytes
      /[\x01-\x1f]/,    // Control characters
      /[<>]/,           // HTML injection attempts
      /javascript:/i,   // Javascript protocol
      /data:/i,         // Data URLs
      /vbscript:/i,     // VBScript protocol
      /file:/i,         // File protocol
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(urlString)) {
        return false;
      }
    }
    
    // SECURITY: Validate hostname format
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!hostnameRegex.test(url.hostname)) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate if the origin protocol is allowed
 * @param origin - Origin URL to validate
 * @param allowedProtocols - Array of allowed protocols
 * @returns true if protocol is allowed, false otherwise
 */
function validateProtocol(origin: string, allowedProtocols: string[] = ['http:', 'https:']): boolean {
  try {
    const url = new URL(origin);
    return allowedProtocols.includes(url.protocol);
  } catch (error) {
    return false;
  }
}

/**
 * Validate subdomain against allowed domains with comprehensive security checks
 * @param origin - Origin URL to validate
 * @param allowedDomains - Array of explicitly allowed domains
 * @returns true if subdomain is allowed, false otherwise
 */
function validateSubdomain(origin: string, allowedDomains: string[]): boolean {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    
    // SECURITY: Check for exact domain matches first
    if (allowedDomains.includes(hostname)) {
      return true;
    }
    
    // SECURITY: Check for subdomain matches with strict validation
    for (const allowedDomain of allowedDomains) {
      const normalizedDomain = allowedDomain.toLowerCase();
      
      // SECURITY: Ensure subdomain ends with .allowedDomain (not just contains)
      if (hostname.endsWith('.' + normalizedDomain)) {
        // SECURITY: Prevent domain boundary attacks (e.g., evilexample.com)
        const subdomainPart = hostname.substring(0, hostname.length - normalizedDomain.length - 1);
        
        // SECURITY: Validate subdomain part doesn't contain suspicious characters
        const validSubdomainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (validSubdomainRegex.test(subdomainPart)) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Comprehensive origin validation with security checks
 * @param requestOrigin - Origin header from the request
 * @param allowedOrigins - Array of explicitly allowed origins
 * @returns Validated origin string or null if invalid
 */
function validateOrigin(requestOrigin: string | undefined, allowedOrigins: string[]): string | null {
  // SECURITY: Reject if no origin provided
  if (!requestOrigin) {
    return null;
  }
  
  // SECURITY: Sanitize origin header
  const sanitizedOrigin = requestOrigin.trim().toLowerCase();
  
  // SECURITY: Check for length limits to prevent memory attacks
  if (sanitizedOrigin.length > 2048) {
    console.warn('CORS SECURITY: Origin header exceeds maximum length');
    return null;
  }
  
  // SECURITY: Validate URL format
  if (!isValidUrl(sanitizedOrigin)) {
    console.warn('CORS SECURITY: Invalid origin URL format detected');
    return null;
  }
  
  // SECURITY: Validate protocol (only HTTP/HTTPS allowed)
  if (!validateProtocol(sanitizedOrigin)) {
    console.warn('CORS SECURITY: Invalid protocol in origin');
    return null;
  }
  
  // SECURITY: Extract allowed domains from origins for subdomain validation
  const allowedDomains: string[] = [];
  for (const allowedOrigin of allowedOrigins) {
    try {
      const url = new URL(allowedOrigin);
      allowedDomains.push(url.hostname);
    } catch (error) {
      console.warn('CORS CONFIG: Invalid allowed origin URL:', allowedOrigin);
    }
  }
  
  // SECURITY: Check for exact origin matches first
  for (const allowedOrigin of allowedOrigins) {
    if (sanitizedOrigin === allowedOrigin.toLowerCase()) {
      return requestOrigin; // Return original case for proper CORS header
    }
  }
  
  // SECURITY: Check subdomain validation if exact match fails
  if (validateSubdomain(sanitizedOrigin, allowedDomains)) {
    return requestOrigin; // Return original case for proper CORS header
  }
  
  console.warn('CORS SECURITY: Origin not in allowed list:', sanitizedOrigin);
  return null;
}

/**
 * Enhanced CORS middleware polyfill with comprehensive security validation
 * @param options CORS configuration options
 * @returns Middleware function
 */
function cors(options: CorsOptions = {}) {
  // SECURITY: Default to restrictive origins with proper URL format
  const defaultOrigin = process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://app.gudcity.com', 'https://gudcity.com']
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];
    
  const {
    origin = defaultOrigin,
    methods = 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders = 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    exposedHeaders = '',
    credentials = false,
    maxAge = 86400, // 24 hours
    optionsSuccessStatus = 204,
  } = options;

  return function corsMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
      const requestOrigin = req.headers.origin;
      let validatedOrigin: string | null = null;
      
      // SECURITY: Enhanced origin validation with comprehensive security checks
      if (typeof origin === 'string') {
        // Single origin string
        validatedOrigin = validateOrigin(requestOrigin, [origin]);
      } else if (Array.isArray(origin)) {
        // Array of allowed origins - use comprehensive validation
        validatedOrigin = validateOrigin(requestOrigin, origin);
      } else if (typeof origin === 'function') {
        // Function-based origin validation with enhanced security
        let functionResult = false;
        origin(requestOrigin, (err, allow) => {
          if (err) {
            console.warn('CORS SECURITY: Custom origin validator error:', err.message);
            functionResult = false;
          } else {
            functionResult = !!allow;
          }
        });
        
        // Even with function validation, perform additional security checks
        if (functionResult && requestOrigin) {
          // Validate the origin format even if function approves it
          if (isValidUrl(requestOrigin) && validateProtocol(requestOrigin)) {
            validatedOrigin = requestOrigin;
          } else {
            console.warn('CORS SECURITY: Custom validator approved malformed origin');
            validatedOrigin = null;
          }
        }
      } else {
        // SECURITY: Reject if origin configuration is invalid
        console.warn('CORS CONFIG: Invalid origin configuration type');
        validatedOrigin = null;
      }
      
      // SECURITY: Set CORS headers only if origin validation passed
      if (validatedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', validatedOrigin);
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
        
        // SECURITY: Log successful CORS validation for monitoring
        console.log('CORS: Valid origin approved for request');
      } else {
        // SECURITY: Log rejected origins for security monitoring
        console.warn('CORS SECURITY: Origin validation failed for request');
        
        // SECURITY: Don't set any CORS headers for invalid origins
        // This will cause the browser to block the request
      }

      // For preflight requests, respond immediately
      if (req.method === 'OPTIONS') {
        res.status(optionsSuccessStatus).end();
        return;
      }
    } catch (error) {
      console.error('CORS SECURITY: Critical error in CORS middleware:', error instanceof Error ? error.message : 'Unknown error');
      
      // SECURITY: Don't set CORS headers on errors to prevent bypass
      // Let the request fail securely
    }

    next();
  };
}

// Export utility functions for potential reuse in other security contexts
export { isValidUrl, validateProtocol, validateSubdomain, validateOrigin };

export default cors; 