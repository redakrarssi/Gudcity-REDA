/**
 * Environment Validation Utility
 * Ensures all required security variables are properly configured
 */

import env from './env';
import { log, logUtils } from './logger';

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
 * Log security validation results with environment-aware verbosity
 */
export function logSecurityValidation(): void {
  const result = validateSecurityEnvironment();
  const isProduction = env.isProduction();
  
  // Always log critical security issues prominently
  if (result.criticalIssues.length > 0) {
    log.security('CRITICAL SECURITY ISSUES DETECTED', {
      criticalIssuesCount: result.criticalIssues.length,
      issues: result.criticalIssues,
      environment: env.APP_ENV
    });
    
    // Individual critical issues for immediate attention
    result.criticalIssues.forEach(issue => {
      log.error(`Critical security issue: ${issue}`, null, { securityLevel: 'critical' });
    });
    
    if (isProduction) {
      log.error('IMMEDIATE ACTION REQUIRED: Fix critical security issues before deployment');
    }
  }
  
  // Log errors with appropriate verbosity
  if (result.errors.length > 0) {
    if (isProduction) {
      // Minimal production logging - just count and summary
      log.error('Security configuration errors detected', null, {
        errorCount: result.errors.length,
        environment: env.APP_ENV
      });
    } else {
      // Detailed development logging
      log.error('Security configuration errors detected', null, {
        errorCount: result.errors.length,
        errors: result.errors,
        environment: env.APP_ENV
      });
      
      // Individual errors in development
      logUtils.devOnly('warn', 'Security errors detail', { errors: result.errors });
    }
  }
  
  // Handle warnings based on environment
  if (result.warnings.length > 0) {
    if (isProduction) {
      // Minimal production warning - just count
      logUtils.prodOnly('warn', 'Security warnings detected', {
        warningCount: result.warnings.length
      });
    } else {
      // Detailed development warnings
      log.warn('Security configuration warnings', {
        warningCount: result.warnings.length,
        warnings: result.warnings,
        environment: env.APP_ENV
      });
    }
  }
  
  // Summary logging
  if (result.isValid) {
    if (isProduction) {
      log.security('Security environment validation passed', {
        status: 'secure',
        environment: env.APP_ENV
      });
    } else {
      log.security('Security environment validation passed', {
        status: 'secure',
        criticalIssues: 0,
        errors: result.errors.length,
        warnings: result.warnings.length,
        environment: env.APP_ENV
      });
    }
  } else {
    log.security('Security environment validation failed', {
      status: 'failed',
      criticalIssuesCount: result.criticalIssues.length,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      environment: env.APP_ENV
    });
  }
  
  // Development-only detailed validation summary
  logUtils.devOnly('info', 'Security validation summary', {
    isValid: result.isValid,
    criticalIssues: result.criticalIssues.length,
    errors: result.errors.length,
    warnings: result.warnings.length,
    details: {
      criticalIssues: result.criticalIssues,
      errors: result.errors,
      warnings: result.warnings
    }
  });
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
 * Get security status summary with structured logging
 */
export function getSecurityStatus(): {
  status: 'SECURE' | 'WARNING' | 'CRITICAL';
  message: string;
  score: number;
} {
  const result = validateSecurityEnvironment();
  
  if (result.criticalIssues.length > 0) {
    const status = {
      status: 'CRITICAL' as const,
      message: `${result.criticalIssues.length} critical security issues detected`,
      score: 0
    };
    
    // Log critical status with structured data
    log.security('Security status check: CRITICAL', {
      status: 'CRITICAL',
      criticalIssuesCount: result.criticalIssues.length,
      score: 0,
      environment: env.APP_ENV
    });
    
    return status;
  }
  
  if (result.errors.length > 0) {
    const status = {
      status: 'WARNING' as const,
      message: `${result.errors.length} security errors detected`,
      score: 50
    };
    
    logUtils.prodOnly('warn', 'Security status check: WARNING (errors)', {
      status: 'WARNING',
      errorCount: result.errors.length,
      score: 50
    });
    
    return status;
  }
  
  if (result.warnings.length > 0) {
    const status = {
      status: 'WARNING' as const,
      message: `${result.warnings.length} security warnings detected`,
      score: 75
    };
    
    logUtils.devOnly('warn', 'Security status check: WARNING (warnings)', {
      status: 'WARNING',
      warningCount: result.warnings.length,
      score: 75
    });
    
    return status;
  }
  
  const status = {
    status: 'SECURE' as const,
    message: 'All security validations passed',
    score: 100
  };
  
  logUtils.devOnly('info', 'Security status check: SECURE', {
    status: 'SECURE',
    score: 100,
    environment: env.APP_ENV
  });
  
  return status;
}

/**
 * Lightweight security validation for production monitoring
 * Only checks critical issues without detailed logging
 */
export function validateCriticalSecurity(): {
  hasCriticalIssues: boolean;
  criticalCount: number;
  canStart: boolean;
} {
  const result = validateSecurityEnvironment();
  const hasCriticalIssues = result.criticalIssues.length > 0;
  
  return {
    hasCriticalIssues,
    criticalCount: result.criticalIssues.length,
    canStart: !hasCriticalIssues
  };
}

/**
 * Log only critical security issues (production-optimized)
 */
export function logCriticalSecurityIssues(): void {
  const result = validateSecurityEnvironment();
  
  if (result.criticalIssues.length > 0) {
    // Always log critical issues regardless of environment
    log.security('Critical security validation failure', {
      criticalIssuesCount: result.criticalIssues.length,
      environment: env.APP_ENV,
      canStart: false
    });
    
    // Individual critical issues with minimal data
    result.criticalIssues.forEach((issue, index) => {
      log.error(`Critical security issue #${index + 1}: ${issue}`, null, {
        securityLevel: 'critical',
        issueIndex: index + 1,
        totalIssues: result.criticalIssues.length
      });
    });
  } else {
    // Minimal success logging in production
    if (env.isProduction()) {
      logUtils.prodOnly('info', 'Critical security validation passed', {
        status: 'secure',
        environment: env.APP_ENV
      });
    } else {
      log.security('Critical security validation passed', {
        status: 'secure',
        environment: env.APP_ENV,
        totalWarnings: result.warnings.length,
        totalErrors: result.errors.length
      });
    }
  }
}
