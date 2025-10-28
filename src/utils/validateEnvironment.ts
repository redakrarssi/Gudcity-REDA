/**
 * Environment Validation Utility
 * Ensures all required security variables are properly configured
 */

import env from './env';

/**
 * Critical security validation results
 */
interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  criticalIssues: string[];
}

/**
 * Validate all critical security configurations
 */
export function validateSecurityEnvironment(): SecurityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const criticalIssues: string[] = [];

  // CRITICAL: JWT Secrets validation
  if (!env.JWT_SECRET || env.JWT_SECRET.trim() === '') {
    criticalIssues.push('JWT_SECRET is not configured');
    errors.push('JWT_SECRET is required for authentication');
  } else if (env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long for security');
  }

  if (!env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.trim() === '') {
    criticalIssues.push('JWT_REFRESH_SECRET is not configured');
    errors.push('JWT_REFRESH_SECRET is required for token refresh');
  } else if (env.JWT_REFRESH_SECRET.length < 32) {
    warnings.push('JWT_REFRESH_SECRET should be at least 32 characters long for security');
  }

  // CRITICAL: Database URL validation
  if (!env.DATABASE_URL || env.DATABASE_URL.trim() === '') {
    criticalIssues.push('DATABASE_URL is not configured');
    errors.push('DATABASE_URL is required for database connectivity');
  } else {
    // Check for placeholder, default, or suspicious credential patterns
    const suspiciousPatterns = [
      // Common placeholder patterns
      /username:password/i,
      /user:pass/i,
      /admin:admin/i,
      /root:root/i,
      /test:test/i,
      /demo:demo/i,
      /example:example/i,
      // Simple password patterns
      /:password@/i,
      /:123456@/i,
      /:admin@/i,
      /:test@/i,
      // Development/placeholder indicators
      /localhost.*:.*@/i,
      /127\.0\.0\.1.*:.*@/i,
      // Generic warning patterns for common insecure practices
      /@localhost/i,
      /@127\.0\.0\.1/i
    ];
    
    const foundSuspiciousPattern = suspiciousPatterns.some(pattern => 
      pattern.test(env.DATABASE_URL)
    );
    
    if (foundSuspiciousPattern) {
      criticalIssues.push('DATABASE_URL contains suspicious credential patterns - SECURITY RISK');
      errors.push('Database URL appears to contain placeholder or insecure credentials');
    }
    
    // Additional checks for production environment
    if (env.isProduction() && env.DATABASE_URL.includes('localhost')) {
      criticalIssues.push('DATABASE_URL uses localhost in production environment');
      errors.push('Production database should not use localhost');
    }
  }

  // CRITICAL: QR Secret Key validation
  if (!env.QR_SECRET_KEY || env.QR_SECRET_KEY.trim() === '') {
    criticalIssues.push('QR_SECRET_KEY is not configured');
    errors.push('QR_SECRET_KEY is required for QR code security');
  } else if (env.QR_SECRET_KEY.length < 32) {
    warnings.push('QR_SECRET_KEY should be at least 32 characters long for security');
  }

  // Production environment specific validations
  if (env.isProduction()) {
    // SECURITY: Ensure production environment is properly configured
    if (env.APP_ENV !== 'production') {
      criticalIssues.push('APP_ENV is not set to production in production environment');
      errors.push('Set APP_ENV=production in production');
    }

    // SECURITY: Disable debug mode in production
    if (env.DEBUG) {
      criticalIssues.push('DEBUG mode is enabled in production - SECURITY RISK');
      errors.push('Disable DEBUG mode in production environment');
    }

    // SECURITY: Ensure HTTPS in production
    if (!env.API_URL || !env.API_URL.startsWith('https://')) {
      warnings.push('API_URL should use HTTPS in production for security');
    }

    // SECURITY: Email configuration in production
    if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASSWORD) {
      warnings.push('Email configuration is incomplete in production');
    }
  }

  // Development environment validations
  if (env.isDevelopment()) {
    // SECURITY: Warn about development defaults
    if (env.JWT_SECRET === 'default-jwt-secret-change-in-production') {
      warnings.push('Using default JWT secret in development - change for production');
    }
    
    if (env.JWT_REFRESH_SECRET === 'default-jwt-refresh-secret-change-in-production') {
      warnings.push('Using default JWT refresh secret in development - change for production');
    }
  }

  // Rate limiting validation
  if (env.RATE_LIMIT_MAX > 1000) {
    warnings.push('RATE_LIMIT_MAX is very high - consider reducing for security');
  }

  if (env.RATE_LIMIT_WINDOW_MS < 1000) {
    warnings.push('RATE_LIMIT_WINDOW_MS is very low - may cause performance issues');
  }

  const isValid = criticalIssues.length === 0 && errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    criticalIssues
  };
}

/**
 * Log security validation results
 */
export function logSecurityValidation(): void {
  const result = validateSecurityEnvironment();
  
  console.log('🔒 Security Environment Validation');
  console.log('=====================================');
  
  if (result.criticalIssues.length > 0) {
    console.error('🚨 CRITICAL SECURITY ISSUES:');
    result.criticalIssues.forEach(issue => {
      console.error(`   ❌ ${issue}`);
    });
  }
  
  if (result.errors.length > 0) {
    console.error('❌ Security Errors:');
    result.errors.forEach(error => {
      console.error(`   • ${error}`);
    });
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️ Security Warnings:');
    result.warnings.forEach(warning => {
      console.warn(`   • ${warning}`);
    });
  }
  
  if (result.isValid) {
    console.log('✅ Security environment validation passed');
  } else {
    console.error('❌ Security environment validation failed');
    
    if (result.criticalIssues.length > 0) {
      console.error('');
      console.error('🚨 IMMEDIATE ACTION REQUIRED:');
      console.error('Fix all critical security issues before deployment');
    }
  }
  
  console.log('=====================================');
}

/**
 * Check if application can start safely
 */
export function canStartSafely(): boolean {
  const result = validateSecurityEnvironment();
  
  // Only allow startup if no critical issues
  return result.criticalIssues.length === 0;
}

/**
 * Get security status summary
 */
export function getSecurityStatus(): {
  status: 'SECURE' | 'WARNING' | 'CRITICAL';
  message: string;
  score: number;
} {
  const result = validateSecurityEnvironment();
  
  if (result.criticalIssues.length > 0) {
    return {
      status: 'CRITICAL',
      message: `${result.criticalIssues.length} critical security issues detected`,
      score: 0
    };
  }
  
  if (result.errors.length > 0) {
    return {
      status: 'WARNING',
      message: `${result.errors.length} security errors detected`,
      score: 50
    };
  }
  
  if (result.warnings.length > 0) {
    return {
      status: 'WARNING',
      message: `${result.warnings.length} security warnings detected`,
      score: 75
    };
  }
  
  return {
    status: 'SECURE',
    message: 'All security validations passed',
    score: 100
  };
}
