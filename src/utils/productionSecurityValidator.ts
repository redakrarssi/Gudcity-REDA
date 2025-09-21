/**
 * Production Security Validator
 * Validates production environment security settings and configuration
 */

import { getSecurityConfig } from '../config/security';

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface DatabaseSecurityCheck {
  hasSSL: boolean;
  hasConnectionLimits: boolean;
  hasTimeout: boolean;
  isServerOnly: boolean;
}

export interface JWTSecurityCheck {
  hasValidLength: boolean;
  isDifferentFromDefault: boolean;
  hasRefreshSecret: boolean;
  secretsAreDifferent: boolean;
}

/**
 * Validate JWT secrets for production security
 */
export function validateJWTSecrets(): JWTSecurityCheck {
  const jwtSecret = process.env.JWT_SECRET || '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || '';
  
  const defaultSecrets = [
    'your_secure_jwt_secret_minimum_32_characters_long',
    'development_secret',
    'test_secret'
  ];

  return {
    hasValidLength: jwtSecret.length >= 64 && refreshSecret.length >= 64,
    isDifferentFromDefault: !defaultSecrets.includes(jwtSecret),
    hasRefreshSecret: refreshSecret.length > 0,
    secretsAreDifferent: jwtSecret !== refreshSecret
  };
}

/**
 * Validate database configuration for production
 */
export function validateDatabaseSecurity(): DatabaseSecurityCheck {
  const dbUrl = process.env.DATABASE_URL || '';
  const serverDbUrl = process.env.SERVER_DATABASE_URL || '';
  
  return {
    hasSSL: dbUrl.includes('sslmode=require'),
    hasConnectionLimits: dbUrl.includes('pool_max=') || dbUrl.includes('poolSize='),
    hasTimeout: dbUrl.includes('connect_timeout=') || dbUrl.includes('connectionTimeoutMillis='),
    isServerOnly: serverDbUrl.length > 0 && !serverDbUrl.startsWith('postgres://localhost')
  };
}

/**
 * Validate QR security configuration
 */
export function validateQRSecurity(): { isValid: boolean; details: string[] } {
  const qrSecret = process.env.QR_SECRET_KEY || '';
  const qrEncryption = process.env.QR_ENCRYPTION_KEY || '';
  
  const details: string[] = [];
  let isValid = true;

  if (qrSecret.length < 64) {
    details.push('QR_SECRET_KEY must be at least 64 characters');
    isValid = false;
  }

  if (qrEncryption.length < 64) {
    details.push('QR_ENCRYPTION_KEY must be at least 64 characters');
    isValid = false;
  }

  if (qrSecret === qrEncryption) {
    details.push('QR_SECRET_KEY and QR_ENCRYPTION_KEY must be different');
    isValid = false;
  }

  return { isValid, details };
}

/**
 * Validate CORS configuration for production
 */
export function validateCORSConfiguration(): { isValid: boolean; details: string[] } {
  const corsOrigins = process.env.CORS_ORIGINS || process.env.VITE_CORS_ORIGINS || '';
  const details: string[] = [];
  let isValid = true;

  if (corsOrigins.includes('localhost')) {
    details.push('CORS origins should not include localhost in production');
    isValid = false;
  }

  if (corsOrigins.includes('*')) {
    details.push('CORS origins should not use wildcard (*) in production');
    isValid = false;
  }

  if (!corsOrigins.includes('https://')) {
    details.push('CORS origins should use HTTPS in production');
    isValid = false;
  }

  return { isValid, details };
}

/**
 * Validate production security settings
 */
export function validateProductionSecurity(): SecurityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    warnings.push('NODE_ENV is not set to "production"');
  }

  // JWT Security Validation
  const jwtCheck = validateJWTSecrets();
  if (!jwtCheck.hasValidLength) {
    errors.push('JWT secrets must be at least 64 characters long');
  }
  if (!jwtCheck.isDifferentFromDefault) {
    errors.push('JWT secrets must not use default/placeholder values');
  }
  if (!jwtCheck.secretsAreDifferent) {
    errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }

  // Database Security Validation
  const dbCheck = validateDatabaseSecurity();
  if (!dbCheck.hasSSL) {
    errors.push('Database connection must use SSL (sslmode=require)');
  }
  if (!dbCheck.hasConnectionLimits) {
    warnings.push('Consider setting database connection pool limits');
  }
  if (!dbCheck.isServerOnly) {
    recommendations.push('Use separate SERVER_DATABASE_URL for server-side operations');
  }

  // QR Security Validation
  const qrCheck = validateQRSecurity();
  if (!qrCheck.isValid) {
    errors.push(...qrCheck.details);
  }

  // CORS Validation
  const corsCheck = validateCORSConfiguration();
  if (!corsCheck.isValid) {
    errors.push(...corsCheck.details);
  }

  // Security Headers Validation
  if (process.env.SECURITY_HEADERS_ENABLED !== 'true') {
    errors.push('Security headers must be enabled in production');
  }

  if (process.env.CSP_ENABLED !== 'true') {
    warnings.push('Content Security Policy should be enabled');
  }

  if (process.env.HSTS_ENABLED !== 'true') {
    warnings.push('HTTP Strict Transport Security should be enabled');
  }

  // Debug Mode Validation
  if (process.env.VITE_DEBUG === 'true') {
    errors.push('Debug mode must be disabled in production');
  }

  if (process.env.VITE_MOCK_AUTH === 'true' || process.env.VITE_MOCK_DATA === 'true') {
    errors.push('Mock authentication and data must be disabled in production');
  }

  // HTTPS Validation
  if (process.env.FORCE_HTTPS !== 'true') {
    errors.push('HTTPS must be enforced in production');
  }

  // Rate Limiting Validation
  const rateLimit = parseInt(process.env.RATE_LIMIT_MAX || '100');
  if (rateLimit > 100) {
    warnings.push('Consider stricter rate limiting for production');
  }

  const authRateLimit = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10');
  if (authRateLimit > 5) {
    warnings.push('Authentication rate limit should be stricter (≤5 requests)');
  }

  // Security Monitoring Validation
  if (process.env.SECURITY_LOGGING_ENABLED !== 'true') {
    recommendations.push('Enable security logging for monitoring');
  }

  if (process.env.AUDIT_LOGGING_ENABLED !== 'true') {
    recommendations.push('Enable audit logging for compliance');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations
  };
}

/**
 * Display security validation report
 */
export function displaySecurityReport(): void {
  const result = validateProductionSecurity();
  
  console.log('🔒 PRODUCTION SECURITY VALIDATION REPORT');
  console.log('='.repeat(60));
  
  if (result.isValid) {
    console.log('✅ Security validation passed!');
  } else {
    console.log('❌ Security validation failed!');
  }

  if (result.errors.length > 0) {
    console.log('\n🚨 CRITICAL ERRORS (must fix):');
    result.errors.forEach(error => console.log(`  ❌ ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️ WARNINGS (should fix):');
    result.warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
  }

  if (result.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    result.recommendations.forEach(rec => console.log(`  💡 ${rec}`));
  }

  console.log('\n📋 SECURITY CHECKLIST:');
  console.log('  [ ] All JWT secrets are 64+ characters');
  console.log('  [ ] Database uses SSL connection');
  console.log('  [ ] CORS configured for production domains');
  console.log('  [ ] Security headers enabled');
  console.log('  [ ] Debug mode disabled');
  console.log('  [ ] HTTPS enforced');
  console.log('  [ ] Rate limiting configured');
  console.log('  [ ] Security monitoring enabled');
}

export default {
  validateProductionSecurity,
  validateJWTSecrets,
  validateDatabaseSecurity,
  validateQRSecurity,
  validateCORSConfiguration,
  displaySecurityReport
};