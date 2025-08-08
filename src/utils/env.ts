// Environment variables using Vite's import.meta.env

import { defineEnv } from './defineEnv';

// Define environment variables with proper types
const env = defineEnv({
  // Database
  DATABASE_URL: import.meta.env.VITE_DATABASE_URL || '',
  
  // Authentication
  JWT_SECRET: import.meta.env.VITE_JWT_SECRET || 'default-jwt-secret-change-in-production',
  JWT_REFRESH_SECRET: import.meta.env.VITE_JWT_REFRESH_SECRET || 'default-jwt-refresh-secret-change-in-production',
  JWT_EXPIRY: import.meta.env.VITE_JWT_EXPIRY || '1h',
  JWT_REFRESH_EXPIRY: import.meta.env.VITE_JWT_REFRESH_EXPIRY || '7d',
  
  // QR Code Security
  QR_SECRET_KEY: import.meta.env.VITE_QR_SECRET_KEY || '',
  QR_TOKEN_ROTATION_DAYS: parseInt(import.meta.env.VITE_QR_TOKEN_ROTATION_DAYS || '30'),
  QR_RATE_LIMIT_MAX: parseInt(import.meta.env.VITE_QR_RATE_LIMIT_MAX || '20'),
  QR_RATE_LIMIT_WINDOW_MS: parseInt(import.meta.env.VITE_QR_RATE_LIMIT_WINDOW_MS || '60000'), // Default: 1 minute
  
  // Application
  API_URL: import.meta.env.VITE_API_URL || '',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
  DEBUG: import.meta.env.VITE_DEBUG === 'true',
  MOCK_AUTH: import.meta.env.VITE_MOCK_AUTH === 'true',
  MOCK_DATA: import.meta.env.VITE_MOCK_DATA === 'true',
  NODE_ENV: import.meta.env.MODE || 'development',
  PORT: parseInt(import.meta.env.VITE_PORT || '3000', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(import.meta.env.VITE_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX: parseInt(import.meta.env.VITE_RATE_LIMIT_MAX || '100', 10),
  APP_URL: import.meta.env.VITE_APP_URL || 'http://localhost:5173', // Frontend URL for links in emails
  
  // Email
  EMAIL_HOST: import.meta.env.VITE_EMAIL_HOST || '',
  EMAIL_PORT: parseInt(import.meta.env.VITE_EMAIL_PORT || '587', 10),
  EMAIL_USER: import.meta.env.VITE_EMAIL_USER || '',
  EMAIL_PASSWORD: import.meta.env.VITE_EMAIL_PASSWORD || '',
  EMAIL_FROM: import.meta.env.VITE_EMAIL_FROM || '',
  
  // Fallback behavior settings
  FALLBACK_ENABLED: import.meta.env.VITE_FALLBACK_ENABLED === 'true' || true,
  FALLBACK_TIMEOUT_MS: parseInt(import.meta.env.VITE_FALLBACK_TIMEOUT_MS || '5000', 10),
  FALLBACK_RETRY_ATTEMPTS: parseInt(import.meta.env.VITE_FALLBACK_RETRY_ATTEMPTS || '3', 10),
  FALLBACK_SHOW_INDICATOR: import.meta.env.VITE_FALLBACK_SHOW_INDICATOR !== 'false',
  FALLBACK_MOCK_DATA: import.meta.env.VITE_FALLBACK_MOCK_DATA === 'true' || true,
  
  // Helpers
  isDevelopment: () => env.NODE_ENV === 'development',
  isProduction: () => env.NODE_ENV === 'production',
  isTest: () => env.NODE_ENV === 'test',
});

// Export constants for features
export const FEATURES = {
  enableAnimations: import.meta.env.VITE_ENABLE_ANIMATIONS !== 'false',
  debugMode: import.meta.env.VITE_DEBUG === 'true',
  showMockNotice: import.meta.env.VITE_SHOW_MOCK_NOTICE !== 'false',
  fallback: {
    enabled: env.FALLBACK_ENABLED,
    showIndicator: env.FALLBACK_SHOW_INDICATOR,
    timeout: env.FALLBACK_TIMEOUT_MS,
    retryAttempts: env.FALLBACK_RETRY_ATTEMPTS,
    useMockData: env.FALLBACK_MOCK_DATA
  }
};

// Function to validate required environment variables
export function validateEnv(): boolean {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'QR_SECRET_KEY'
  ];
  
  const missingVars = requiredVars.filter(
    (varName) => !env[varName as keyof typeof env] || env[varName as keyof typeof env] === ''
  );
  
  if (missingVars.length > 0) {
    console.error('Error: Missing required environment variables:');
    missingVars.forEach((varName) => {
      console.error(`- ${varName}`);
      if (varName === 'QR_SECRET_KEY') {
        console.error('⚠️ QR_SECRET_KEY is not defined. This is a security risk!');
      }
    });
    return false;
  }
  
  // Production specific validations
  if (env.isProduction()) {
    // Check for default secrets in production
    if (env.JWT_SECRET === 'default-jwt-secret-change-in-production' ||
        env.JWT_REFRESH_SECRET === 'default-jwt-refresh-secret-change-in-production') {
      console.error('Error: Using default JWT secrets in production!');
      return false;
    }
    
    // Check for email configuration in production (for user verification)
    if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASSWORD) {
      console.warn('Warning: Email configuration is incomplete in production.');
    }
  }
  
  return true;
}

export default env; 