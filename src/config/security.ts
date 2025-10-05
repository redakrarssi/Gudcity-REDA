/**
 * Security Configuration
 * Centralized security settings for the GudCity Loyalty Platform
 */

export const SECURITY_CONFIG = {
  // JWT Configuration
  JWT: {
    // Minimum secret length requirements
    MIN_SECRET_LENGTH: 32,
    // Token expiration times
    ACCESS_TOKEN_EXPIRY: '1h',
    REFRESH_TOKEN_EXPIRY: '7d',
    // Algorithm
    ALGORITHM: 'HS256',
    // Issuer and audience for additional security
    ISSUER: 'gudcity-loyalty-platform',
    AUDIENCE: 'gudcity-users'
  },

  // Password Policy
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_LOWERCASE: true,
    REQUIRE_UPPERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    // Prevent common weak passwords
    BLOCK_COMMON_PASSWORDS: true,
    // Prevent repeated characters
    MAX_REPEATED_CHARS: 2,
    // Prevent sequential characters
    BLOCK_SEQUENTIAL_CHARS: true
  },

  // Rate Limiting
  RATE_LIMITING: {
    // General API rate limits
    GENERAL: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 100
    },
    // Authentication rate limits (stricter)
    AUTH: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 5,
      LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
      PROGRESSIVE_LOCKOUT: true
    },
    // QR code scanning rate limits
    QR_SCANNING: {
      WINDOW_MS: 60 * 1000, // 1 minute
      MAX_REQUESTS: 20
    }
  },

  // CORS Configuration
  CORS: {
    // Production origins (restrictive)
    PRODUCTION_ORIGINS: [
      'https://gudcity.com',
      'https://www.gudcity.com',
      'https://app.gudcity.com'
    ],
    // Development origins
    DEVELOPMENT_ORIGINS: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ],
    // Allowed methods
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    // Allowed headers
    ALLOWED_HEADERS: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key'
    ],
    // Exposed headers
    EXPOSED_HEADERS: ['X-Total-Count', 'X-Page-Count'],
    // Credentials
    ALLOW_CREDENTIALS: true,
    // Max age
    MAX_AGE: 86400 // 24 hours
  },

  // Content Security Policy
  // SECURITY FIX: Removed 'unsafe-inline' and 'unsafe-eval' to prevent XSS attacks
  CSP: {
    // Production CSP (strict - no unsafe directives)
    PRODUCTION_DIRECTIVES: {
      'default-src': ["'self'"],
      'script-src': ["'self'"], // SECURITY: Removed 'unsafe-inline' and 'unsafe-eval'
      'style-src': ["'self'", "https://fonts.googleapis.com"], // SECURITY: Removed 'unsafe-inline' for production
      'img-src': ["'self'", "data:", "https:", "blob:"], // Allow data: for QR codes
      'connect-src': ["'self'", "https:", "wss:"],
      'font-src': ["'self'", "https://fonts.gstatic.com"],
      'object-src': ["'none'"],
      'media-src': ["'self'", "https:"],
      'frame-src': ["'none'"], // Prevent clickjacking
      'worker-src': ["'self'", "blob:"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'manifest-src': ["'self'"],
      'frame-ancestors': ["'none'"], // Additional clickjacking protection
      'upgrade-insecure-requests': [] // Force HTTPS
    },
    // Development CSP (more permissive for hot reload)
    DEVELOPMENT_DIRECTIVES: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "localhost:*", "127.0.0.1:*"],
      'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      'img-src': ["'self'", "data:", "https:", "blob:"],
      'connect-src': ["'self'", "https:", "wss:", "ws:", "localhost:*", "127.0.0.1:*"],
      'font-src': ["'self'", "https://fonts.gstatic.com"],
      'object-src': ["'none'"],
      'media-src': ["'self'", "https:"],
      'frame-src': ["'none'"],
      'worker-src': ["'self'", "blob:"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'manifest-src': ["'self'"]
    },
    // Legacy fallback for gradual migration (to be removed)
    DIRECTIVES: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      'img-src': ["'self'", "data:", "https:", "blob:"],
      'connect-src': ["'self'", "https:", "wss:"],
      'font-src': ["'self'", "https://fonts.gstatic.com"],
      'object-src': ["'none'"],
      'media-src': ["'self'", "https:"],
      'frame-src': ["'none'"],
      'worker-src': ["'self'", "blob:"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'manifest-src': ["'self'"]
    }
  },

  // Security Headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Origin-Agent-Cluster': '?1'
  },

  // Session Security
  SESSION: {
    // Cookie settings
    COOKIE: {
      HTTP_ONLY: true,
      SECURE: true, // Only send over HTTPS
      SAME_SITE: 'strict',
      MAX_AGE: 24 * 60 * 60 * 1000 // 24 hours
    },
    // Session timeout
    TIMEOUT: 30 * 60 * 1000, // 30 minutes
    // Regenerate session ID
    REGENERATE_ID: true
  },

  // Input Validation
  INPUT_VALIDATION: {
    // Maximum string lengths
    MAX_STRING_LENGTH: 10000,
    // Maximum array length
    MAX_ARRAY_LENGTH: 1000,
    // Maximum object depth
    MAX_OBJECT_DEPTH: 10,
    // Sanitize HTML
    SANITIZE_HTML: true,
    // Block SQL injection patterns
    BLOCK_SQL_INJECTION: true,
    // Block XSS patterns
    BLOCK_XSS: true
  },

  // Logging and Monitoring
  LOGGING: {
    // Log security events
    SECURITY_EVENTS: true,
    // Log authentication attempts
    AUTH_ATTEMPTS: true,
    // Log rate limit violations
    RATE_LIMIT_VIOLATIONS: true,
    // Log suspicious activities
    SUSPICIOUS_ACTIVITIES: true,
    // Sanitize sensitive data in logs
    SANITIZE_LOGS: true
  },

  // Environment-specific overrides
  ENVIRONMENT: {
    PRODUCTION: {
      // Stricter settings for production
      DEBUG_MODE: false,
      SHOW_ERROR_DETAILS: false,
      ALLOW_INSECURE_CONNECTIONS: false,
      REQUIRE_HTTPS: true,
      STRICT_CORS: true
    },
    DEVELOPMENT: {
      // More permissive for development
      DEBUG_MODE: true,
      SHOW_ERROR_DETAILS: true,
      ALLOW_INSECURE_CONNECTIONS: true,
      REQUIRE_HTTPS: false,
      STRICT_CORS: false
    }
  }
};

/**
 * Get security configuration for current environment
 */
export function getSecurityConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseConfig = SECURITY_CONFIG;
  
  if (isProduction) {
    return {
      ...baseConfig,
      ...baseConfig.ENVIRONMENT.PRODUCTION
    };
  }
  
  return {
    ...baseConfig,
    ...baseConfig.ENVIRONMENT.DEVELOPMENT
  };
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getSecurityConfig();
  
  // Validate JWT configuration
  if (config.JWT.MIN_SECRET_LENGTH < 32) {
    errors.push('JWT minimum secret length must be at least 32 characters');
  }
  
  // Validate password policy
  if (config.PASSWORD.MIN_LENGTH < 8) {
    errors.push('Password minimum length must be at least 8 characters');
  }
  
  // Validate rate limiting
  if (config.RATE_LIMITING.AUTH.MAX_REQUESTS > 10) {
    errors.push('Authentication rate limit should not exceed 10 requests per window');
  }
  
  // Validate CORS
  if (config.CORS.PRODUCTION_ORIGINS.length === 0) {
    errors.push('Production CORS origins must be configured');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
