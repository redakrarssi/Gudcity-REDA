/**
 * Environment Validation Utility
 * Ensures all required security variables are properly configured
 * SECURITY: This file should only run on the server side
 */

import { serverEnvironment, validateServerEnv } from './env';

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
 * SECURITY: This function should only run on the server side
 */
export function validateSecurityEnvironment(): SecurityValidationResult {
  // SECURITY: Only run on server side
  if (typeof window !== 'undefined') {
    console.warn('Environment validation should only run on server side');
    return {
      isValid: true,
      errors: [],
      warnings: ['Environment validation skipped on client side'],
      criticalIssues: []
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const criticalIssues: string[] = [];

  // CRITICAL: JWT Secrets validation
  if (!serverEnvironment.JWT_SECRET || serverEnvironment.JWT_SECRET.trim() === '') {
    criticalIssues.push('JWT_SECRET is not configured');
    errors.push('JWT_SECRET is required for authentication');
  } else if (serverEnvironment.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long for security');
  }

  if (!serverEnvironment.JWT_REFRESH_SECRET || serverEnvironment.JWT_REFRESH_SECRET.trim() === '') {
    criticalIssues.push('JWT_REFRESH_SECRET is not configured');
    errors.push('JWT_REFRESH_SECRET is required for token refresh');
  } else if (serverEnvironment.JWT_REFRESH_SECRET.length < 32) {
    warnings.push('JWT_REFRESH_SECRET should be at least 32 characters long for security');
  }

  // CRITICAL: Database URL validation
  if (!serverEnvironment.DATABASE_URL || serverEnvironment.DATABASE_URL.trim() === '') {
    criticalIssues.push('DATABASE_URL is not configured');
    errors.push('DATABASE_URL is required for database connectivity');
  } else {
    // Check for hardcoded credentials in database URL
    if (serverEnvironment.DATABASE_URL.includes('neondb_owner:npg_rpc6Nh5oKGzt')) {
      criticalIssues.push('DATABASE_URL contains hardcoded credentials - SECURITY RISK');
      errors.push('Remove hardcoded database credentials immediately');
    }
  }

  // CRITICAL: QR Secret Key validation
  if (!serverEnvironment.QR_SECRET_KEY || serverEnvironment.QR_SECRET_KEY.trim() === '') {
    criticalIssues.push('QR_SECRET_KEY is not configured');
    errors.push('QR_SECRET_KEY is required for QR code security');
  } else if (serverEnvironment.QR_SECRET_KEY.length < 32) {
    warnings.push('QR_SECRET_KEY should be at least 32 characters long for security');
  }

  // Production environment specific validations
  if (process.env.NODE_ENV === 'production') {
    // SECURITY: Ensure production environment is properly configured
    if (process.env.APP_ENV !== 'production') {
      criticalIssues.push('APP_ENV is not set to production in production environment');
      errors.push('Set APP_ENV=production in production');
    }

    // SECURITY: Disable debug mode in production
    if (process.env.VITE_DEBUG === 'true') {
      criticalIssues.push('DEBUG mode is enabled in production - SECURITY RISK');
      errors.push('Disable DEBUG mode in production environment');
    }

    // SECURITY: Ensure HTTPS in production
    if (!serverEnvironment.API_URL || !serverEnvironment.API_URL.startsWith('https://')) {
      warnings.push('API_URL should use HTTPS in production for security');
    }

    // SECURITY: Email configuration in production
    if (!serverEnvironment.EMAIL_HOST || !serverEnvironment.EMAIL_USER || !serverEnvironment.EMAIL_PASSWORD) {
      warnings.push('Email configuration is incomplete in production');
    }
  }

  // Development environment validations
  if (process.env.NODE_ENV === 'development') {
    // SECURITY: Warn about development defaults
    if (serverEnvironment.JWT_SECRET === 'default-jwt-secret-change-in-production') {
      warnings.push('Using default JWT secret in development - change for production');
    }
    
    if (serverEnvironment.JWT_REFRESH_SECRET === 'default-jwt-refresh-secret-change-in-production') {
      warnings.push('Using default JWT refresh secret in development - change for production');
    }
  }

  // Rate limiting validation
  const rateLimitMax = parseInt(process.env.VITE_RATE_LIMIT_MAX || '100', 10);
  if (rateLimitMax > 1000) {
    warnings.push('RATE_LIMIT_MAX is very high - consider reducing for security');
  }

  return {
    isValid: criticalIssues.length === 0,
    errors,
    warnings,
    criticalIssues
  };
}

/**
 * Check if the environment can start safely
 * SECURITY: This function should only run on the server side
 */
export function canStartSafely(): boolean {
  // SECURITY: Only run on server side
  if (typeof window !== 'undefined') {
    console.warn('Environment safety check should only run on server side');
    return true;
  }

  const validation = validateSecurityEnvironment();
  return validation.isValid;
}

/**
 * Log security validation results
 * SECURITY: This function should only run on the server side
 */
export function logSecurityValidation(): void {
  // SECURITY: Only run on server side
  if (typeof window !== 'undefined') {
    console.warn('Security validation logging should only run on server side');
    return;
  }

  const validation = validateSecurityEnvironment();
  
  if (validation.criticalIssues.length > 0) {
    console.error('🚨 CRITICAL SECURITY ISSUES:');
    validation.criticalIssues.forEach(issue => {
      console.error(`   - ${issue}`);
    });
  }
  
  if (validation.errors.length > 0) {
    console.error('❌ SECURITY ERRORS:');
    validation.errors.forEach(error => {
      console.error(`   - ${error}`);
    });
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ SECURITY WARNINGS:');
    validation.warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
  }
  
  if (validation.isValid) {
    console.log('✅ Security validation passed');
  } else {
    console.error('❌ Security validation failed');
  }
}

/**
 * Get environment validation status
 * SECURITY: This function should only run on the server side
 */
export function getEnvironmentStatus(): {
  isValid: boolean;
  hasCriticalIssues: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  summary: string;
} {
  // SECURITY: Only run on server side
  if (typeof window !== 'undefined') {
    return {
      isValid: true,
      hasCriticalIssues: false,
      hasErrors: false,
      hasWarnings: false,
      summary: 'Environment validation not available on client side'
    };
  }

  const validation = validateSecurityEnvironment();
  
  return {
    isValid: validation.isValid,
    hasCriticalIssues: validation.criticalIssues.length > 0,
    hasErrors: validation.errors.length > 0,
    hasWarnings: validation.warnings.length > 0,
    summary: validation.isValid 
      ? 'Environment is properly configured'
      : `Environment has ${validation.criticalIssues.length} critical issues, ${validation.errors.length} errors, and ${validation.warnings.length} warnings`
  };
}

// Export the main validation function for backward compatibility
export const validateEnvironment = validateSecurityEnvironment;
