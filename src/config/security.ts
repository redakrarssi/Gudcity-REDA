/**
 * Security Configuration
 * Centralized security settings and policies for the application
 */

// Security configuration interface
export interface SecurityConfig {
  // Authentication settings
  AUTH: {
    jwtSecret: string;
    jwtRefreshSecret: string;
    jwtExpiry: string;
    jwtRefreshExpiry: string;
    passwordMinLength: number;
    passwordMaxLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSpecialChars: boolean;
    maxLoginAttempts: number;
    lockoutDuration: number;
    sessionTimeout: number;
    sessionRefreshThreshold: number;
  };
  
  // Rate limiting settings
  RATE_LIMIT: {
    authWindowMs: number;
    authMaxRequests: number;
    apiWindowMs: number;
    apiMaxRequests: number;
    uploadWindowMs: number;
    uploadMaxRequests: number;
    qrGenerationWindowMs: number;
    qrGenerationMaxRequests: number;
    pointsAwardWindowMs: number;
    pointsAwardMaxRequests: number;
    adminWindowMs: number;
    adminMaxRequests: number;
  };
  
  // CORS settings
  CORS: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    credentials: boolean;
    maxAge: number;
  };
  
  // File upload settings
  FILE_UPLOAD: {
    maxFileSize: number;
    allowedImageTypes: string[];
    allowedDocumentTypes: string[];
    allowedQrTypes: string[];
    scanForMalware: boolean;
    validateFileContent: boolean;
    secureStorage: boolean;
  };
  
  // Input validation settings
  VALIDATION: {
    maxInputLength: number;
    maxArrayLength: number;
    maxObjectDepth: number;
    sanitizeInputs: boolean;
    validateTypes: boolean;
    blockSuspiciousPatterns: boolean;
  };
  
  // Logging and monitoring
  LOGGING: {
    logLevel: string;
    logSecurityEvents: boolean;
    logSensitiveData: boolean;
    logPerformance: boolean;
    logUserActions: boolean;
    retentionDays: number;
  };
  
  // Session security
  SESSION: {
    secure: boolean;
    httpOnly: boolean;
    sameSite: string;
    maxAge: number;
    regenerateId: boolean;
  };
  
  // Headers security
  HEADERS: {
    contentSecurityPolicy: string;
    xFrameOptions: string;
    xContentTypeOptions: string;
    xXSSProtection: string;
    strictTransportSecurity: string;
    referrerPolicy: string;
  };
  
  // Database security
  DATABASE: {
    useSSL: boolean;
    connectionTimeout: number;
    queryTimeout: number;
    maxConnections: number;
    encryptData: boolean;
    auditQueries: boolean;
  };
  
  // API security
  API: {
    requireAuthentication: boolean;
    validateRequests: boolean;
    sanitizeResponses: boolean;
    rateLimitByIP: boolean;
    rateLimitByUser: boolean;
    logAllRequests: boolean;
  };
  
  // QR code security
  QR_SECURITY: {
    secretKey: string;
    tokenRotationDays: number;
    validateSignatures: boolean;
    encryptData: boolean;
    rateLimitGeneration: boolean;
    auditUsage: boolean;
  };
}

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  AUTH: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
    jwtExpiry: process.env.JWT_EXPIRY || '1h',
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    passwordMinLength: 8,
    passwordMaxLength: 128,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    maxLoginAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    sessionRefreshThreshold: 5 * 60 * 1000 // 5 minutes
  },
  
  RATE_LIMIT: {
    authWindowMs: 15 * 60 * 1000, // 15 minutes
    authMaxRequests: 5,
    apiWindowMs: 60 * 1000, // 1 minute
    apiMaxRequests: 100,
    uploadWindowMs: 60 * 1000, // 1 minute
    uploadMaxRequests: 10,
    qrGenerationWindowMs: 60 * 1000, // 1 minute
    qrGenerationMaxRequests: 20,
    pointsAwardWindowMs: 60 * 1000, // 1 minute
    pointsAwardMaxRequests: 50,
    adminWindowMs: 60 * 1000, // 1 minute
    adminMaxRequests: 30
  },
  
  CORS: {
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'http://localhost:5173']
      : ['http://localhost:5173', 'http://localhost:3000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 
      'Authorization', 'X-CSRF-Token', 'X-API-Key'
    ],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 86400 // 24 hours
  },
  
  FILE_UPLOAD: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    allowedDocumentTypes: ['application/pdf', 'text/plain'],
    allowedQrTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    scanForMalware: true,
    validateFileContent: true,
    secureStorage: true
  },
  
  VALIDATION: {
    maxInputLength: 10000,
    maxArrayLength: 1000,
    maxObjectDepth: 10,
    sanitizeInputs: true,
    validateTypes: true,
    blockSuspiciousPatterns: true
  },
  
  LOGGING: {
    logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    logSecurityEvents: true,
    logSensitiveData: false,
    logPerformance: true,
    logUserActions: true,
    retentionDays: 90
  },
  
  SESSION: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    regenerateId: true
  },
  
  HEADERS: {
    contentSecurityPolicy: process.env.NODE_ENV === 'production'
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none';"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;",
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    xXSSProtection: '1; mode=block',
    strictTransportSecurity: process.env.NODE_ENV === 'production' ? 'max-age=31536000; includeSubDomains' : '',
    referrerPolicy: 'strict-origin-when-cross-origin'
  },
  
  DATABASE: {
    useSSL: process.env.NODE_ENV === 'production',
    connectionTimeout: 30000, // 30 seconds
    queryTimeout: 60000, // 60 seconds
    maxConnections: 20,
    encryptData: process.env.NODE_ENV === 'production',
    auditQueries: true
  },
  
  API: {
    requireAuthentication: true,
    validateRequests: true,
    sanitizeResponses: true,
    rateLimitByIP: true,
    rateLimitByUser: true,
    logAllRequests: true
  },
  
  QR_SECURITY: {
    secretKey: process.env.QR_SECRET_KEY || '',
    tokenRotationDays: 30,
    validateSignatures: true,
    encryptData: true,
    rateLimitGeneration: true,
    auditUsage: true
  }
};

// Security validation functions
export function validateSecurityConfig(config: SecurityConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate JWT secrets
  if (!config.AUTH.jwtSecret || config.AUTH.jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }
  
  if (!config.AUTH.jwtRefreshSecret || config.AUTH.jwtRefreshSecret.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be at least 32 characters long');
  }
  
  // Validate QR secret key
  if (!config.QR_SECURITY.secretKey || config.QR_SECURITY.secretKey.length < 32) {
    errors.push('QR_SECRET_KEY must be at least 32 characters long');
  }
  
  // Validate password policy
  if (config.AUTH.passwordMinLength < 8) {
    warnings.push('Password minimum length should be at least 8 characters');
  }
  
  if (config.AUTH.passwordMaxLength > 128) {
    warnings.push('Password maximum length should not exceed 128 characters');
  }
  
  // Validate rate limits
  if (config.RATE_LIMIT.authMaxRequests > 10) {
    warnings.push('Auth rate limit should not exceed 10 attempts per window');
  }
  
  if (config.RATE_LIMIT.apiMaxRequests > 1000) {
    warnings.push('API rate limit should not exceed 1000 requests per minute');
  }
  
  // Validate CORS settings
  if (config.CORS.allowedOrigins.includes('*')) {
    errors.push('CORS allowedOrigins should not include wildcard (*)');
  }
  
  // Validate file upload settings
  if (config.FILE_UPLOAD.maxFileSize > 50 * 1024 * 1024) {
    warnings.push('File upload size should not exceed 50MB');
  }
  
  // Validate session settings
  if (!config.SESSION.secure && process.env.NODE_ENV === 'production') {
    errors.push('Session cookies must be secure in production');
  }
  
  // Validate headers
  if (!config.HEADERS.contentSecurityPolicy) {
    warnings.push('Content Security Policy should be configured');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Get security configuration for current environment
export function getSecurityConfig(): SecurityConfig {
  const config = { ...defaultSecurityConfig };
  
  // Override with environment-specific settings
  if (process.env.NODE_ENV === 'production') {
    // Production overrides
    config.LOGGING.logLevel = 'warn';
    config.SESSION.secure = true;
    config.DATABASE.useSSL = true;
    config.DATABASE.encryptData = true;
  } else if (process.env.NODE_ENV === 'development') {
    // Development overrides
    config.LOGGING.logLevel = 'debug';
    config.LOGGING.logSensitiveData = true;
    config.SESSION.secure = false;
    config.DATABASE.useSSL = false;
    config.DATABASE.encryptData = false;
  }
  
  return config;
}

// Security utility functions
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

// Export the current security configuration
export const securityConfig = getSecurityConfig();

// Validate the configuration on load
const validation = validateSecurityConfig(securityConfig);
if (!validation.isValid) {
  console.error('❌ Security configuration validation failed:');
  validation.errors.forEach(error => console.error(`   - ${error}`));
  validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
  
  if (isProduction()) {
    throw new Error('Security configuration validation failed in production');
  }
} else if (validation.warnings.length > 0) {
  console.warn('⚠️  Security configuration warnings:');
  validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
}
