// Environment variables using Vite's import.meta.env
// SECURITY: Separate client-side and server-side environment variables

import { defineEnv } from './defineEnv';

// Client-side environment variables (safe to expose in browser)
const clientEnv = defineEnv({
  // Application
  API_URL: import.meta.env.VITE_API_URL || '',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
  NODE_ENV: import.meta.env.MODE || 'development',
  PORT: parseInt(import.meta.env.VITE_PORT || '3000', 10),
  APP_URL: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
  
  // Feature flags (safe for client)
  DEBUG: import.meta.env.VITE_DEBUG === 'true' && import.meta.env.MODE !== 'production',
  MOCK_AUTH: import.meta.env.VITE_MOCK_AUTH === 'true' && import.meta.env.MODE !== 'production',
  MOCK_DATA: import.meta.env.VITE_MOCK_DATA === 'true' && import.meta.env.MODE !== 'production',
  
  // Rate limiting (client-side limits)
  RATE_LIMIT_WINDOW_MS: parseInt(import.meta.env.VITE_RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(import.meta.env.VITE_RATE_LIMIT_MAX || '100', 10),
  
  // Fallback behavior settings
  FALLBACK_ENABLED: import.meta.env.VITE_FALLBACK_ENABLED === 'true' || true,
  FALLBACK_TIMEOUT_MS: parseInt(import.meta.env.VITE_FALLBACK_TIMEOUT_MS || '5000', 10),
  FALLBACK_RETRY_ATTEMPTS: parseInt(import.meta.env.VITE_FALLBACK_RETRY_ATTEMPTS || '3', 10),
  FALLBACK_SHOW_INDICATOR: import.meta.env.VITE_FALLBACK_SHOW_INDICATOR !== 'false',
  FALLBACK_MOCK_DATA: import.meta.env.VITE_FALLBACK_MOCK_DATA === 'true' || true,
  
  // QR Code settings (non-sensitive)
  QR_TOKEN_ROTATION_DAYS: parseInt(import.meta.env.VITE_QR_TOKEN_ROTATION_DAYS || '30'),
  QR_RATE_LIMIT_MAX: parseInt(import.meta.env.VITE_QR_RATE_LIMIT_MAX || '20'),
  QR_RATE_LIMIT_WINDOW_MS: parseInt(import.meta.env.VITE_QR_RATE_LIMIT_WINDOW_MS || '60000'),
  
  // Helpers
  isDevelopment: () => clientEnv.NODE_ENV === 'development',
  isProduction: () => clientEnv.NODE_ENV === 'production',
  isTest: () => clientEnv.NODE_ENV === 'test',
});

// Server-side environment variables (NOT exposed to client)
// These are only available when running on the server
const serverEnv = {
  // Database (server-only)
  DATABASE_URL: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '',
  
  // Authentication secrets (server-only)
  JWT_SECRET: process.env.JWT_SECRET || process.env.VITE_JWT_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.VITE_JWT_REFRESH_SECRET || '',
  JWT_EXPIRY: process.env.JWT_EXPIRY || process.env.VITE_JWT_EXPIRY || '1h',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || process.env.VITE_JWT_REFRESH_EXPIRY || '7d',
  
  // QR Code Security (server-only)
  QR_SECRET_KEY: process.env.QR_SECRET_KEY || process.env.VITE_QR_SECRET_KEY || '',
  
  // Email settings (server-only)
  EMAIL_HOST: process.env.EMAIL_HOST || process.env.VITE_EMAIL_HOST || '',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || process.env.VITE_EMAIL_PORT || '587', 10),
  EMAIL_USER: process.env.EMAIL_USER || process.env.VITE_EMAIL_USER || '',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || process.env.VITE_EMAIL_PASSWORD || '',
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.VITE_EMAIL_FROM || '',
};

// Export client-side environment variables
export default clientEnv;

// Export server-side environment variables (only available on server)
export const serverEnvironment = serverEnv;

// Export API rate limit configuration (safe for client)
export const API_RATE_LIMIT = {
  maxRequests: parseInt(import.meta.env.VITE_API_RATE_LIMIT_MAX || '100', 10),
  windowMs: parseInt(import.meta.env.VITE_API_RATE_LIMIT_WINDOW || '60000', 10)
};

// Export constants for features
export const FEATURES = {
  enableAnimations: import.meta.env.VITE_ENABLE_ANIMATIONS !== 'false',
  // SECURITY: Debug features only in development
  debugMode: import.meta.env.VITE_DEBUG === 'true' && import.meta.env.MODE === 'development',
  showMockNotice: import.meta.env.VITE_SHOW_MOCK_NOTICE !== 'false',
  fallback: {
    enabled: clientEnv.FALLBACK_ENABLED,
    showIndicator: clientEnv.FALLBACK_SHOW_INDICATOR,
    timeout: clientEnv.FALLBACK_TIMEOUT_MS,
    retryAttempts: clientEnv.FALLBACK_RETRY_ATTEMPTS,
    useMockData: clientEnv.FALLBACK_MOCK_DATA
  },
  mockData: clientEnv.MOCK_DATA
};

// Function to validate required environment variables (server-side only)
export function validateServerEnv(): boolean {
  // Only run on server side
  if (typeof window !== 'undefined') {
    console.warn('Environment validation should only run on server side');
    return true;
  }
  
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'QR_SECRET_KEY'
  ];
  
  const missingVars = requiredVars.filter(
    (varName) => !serverEnv[varName as keyof typeof serverEnv] || serverEnv[varName as keyof typeof serverEnv] === ''
  );
  
  if (missingVars.length > 0) {
    console.error('Error: Missing required server environment variables:');
    missingVars.forEach((varName) => {
      console.error(`- ${varName}`);
      if (varName === 'QR_SECRET_KEY') {
        console.error('⚠️ QR_SECRET_KEY is not defined. This is a security risk!');
      }
    });
    return false;
  }
  
  // Production specific validations
  if (clientEnv.isProduction()) {
    // CRITICAL: Enforce JWT secrets in production
    if (!serverEnv.JWT_SECRET || !serverEnv.JWT_REFRESH_SECRET) {
      console.error('CRITICAL ERROR: JWT secrets are required in production!');
      console.error('Please set JWT_SECRET and JWT_REFRESH_SECRET environment variables.');
      return false;
    }
    
    // Check for email configuration in production (for user verification)
    if (!serverEnv.EMAIL_HOST || !serverEnv.EMAIL_USER || !serverEnv.EMAIL_PASSWORD) {
      console.warn('Warning: Email configuration is incomplete in production.');
    }
  }
  
  return true;
}

// Function to validate client environment variables
export function validateClientEnv(): boolean {
  const requiredClientVars = [
    'API_URL'
  ];
  
  const missingVars = requiredClientVars.filter(
    (varName) => !clientEnv[varName as keyof typeof clientEnv] || clientEnv[varName as keyof typeof clientEnv] === ''
  );
  
  if (missingVars.length > 0) {
    console.warn('Warning: Missing optional client environment variables:');
    missingVars.forEach((varName) => {
      console.warn(`- ${varName}`);
    });
  }
  
  return true;
}

// Legacy export for backward compatibility (client-side only)
export const env = clientEnv; 