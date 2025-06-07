// Environment variables using Vite's import.meta.env

// Get environment variables with defaults
export const env = {
  // Database
  DATABASE_URL: import.meta.env.VITE_DATABASE_URL || '',
  
  // Authentication
  JWT_SECRET: import.meta.env.VITE_JWT_SECRET || 'default-jwt-secret-change-in-production',
  JWT_REFRESH_SECRET: import.meta.env.VITE_JWT_REFRESH_SECRET || 'default-jwt-refresh-secret-change-in-production',
  JWT_EXPIRY: import.meta.env.VITE_JWT_EXPIRY || '1h',
  JWT_REFRESH_EXPIRY: import.meta.env.VITE_JWT_REFRESH_EXPIRY || '7d',
  
  // Application
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
  
  // Helpers
  isDevelopment: () => env.NODE_ENV === 'development',
  isProduction: () => env.NODE_ENV === 'production',
  isTest: () => env.NODE_ENV === 'test',
};

// Function to validate required environment variables
export function validateEnv(): boolean {
  const requiredVars: Array<keyof typeof env> = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];
  
  const missingVars = requiredVars.filter(
    (varName) => !env[varName] || env[varName] === ''
  );
  
  if (missingVars.length > 0) {
    console.error('Error: Missing required environment variables:');
    missingVars.forEach((varName) => {
      console.error(`- ${varName}`);
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