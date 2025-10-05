/**
 * Secure Environment Configuration
 * 
 * SECURITY: Properly separates client-side and server-side environment variables
 * This prevents accidental exposure of sensitive credentials to the browser
 * 
 * RULES:
 * 1. NEVER use VITE_ prefix for sensitive data (database, secrets, passwords)
 * 2. VITE_ prefix = exposed to client (bundled into JavaScript)
 * 3. No VITE_ prefix = server-only (process.env in Node.js)
 */

/**
 * Check if code is running on server (Node.js) or client (browser)
 */
const isServer = typeof window === 'undefined';
const isClient = !isServer;

/**
 * SERVER-ONLY Environment Variables
 * These are NEVER accessible from client-side code
 * These variables should NOT have VITE_ prefix
 */
export const SERVER_ENV = isServer ? {
  // Database Configuration (CRITICAL - SERVER ONLY)
  DATABASE_URL: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
  
  // Authentication Secrets (CRITICAL - SERVER ONLY)
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  COOKIE_ENCRYPTION_KEY: process.env.COOKIE_ENCRYPTION_KEY || '',
  SESSION_SECRET: process.env.SESSION_SECRET || '',
  
  // QR Code Security (CRITICAL - SERVER ONLY)
  QR_SECRET_KEY: process.env.QR_SECRET_KEY || '',
  QR_ENCRYPTION_KEY: process.env.QR_ENCRYPTION_KEY || '',
  
  // Email Credentials (SENSITIVE - SERVER ONLY)
  EMAIL_HOST: process.env.EMAIL_HOST || '',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
  EMAIL_FROM: process.env.EMAIL_FROM || '',
  
  // API Keys (SENSITIVE - SERVER ONLY)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  
  // Server Configuration
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
} : {
  // Client-side: All sensitive variables return empty/null
  DATABASE_URL: '',
  JWT_SECRET: '',
  JWT_REFRESH_SECRET: '',
  COOKIE_ENCRYPTION_KEY: '',
  SESSION_SECRET: '',
  QR_SECRET_KEY: '',
  QR_ENCRYPTION_KEY: '',
  EMAIL_HOST: '',
  EMAIL_PORT: 0,
  EMAIL_USER: '',
  EMAIL_PASSWORD: '',
  EMAIL_FROM: '',
  STRIPE_SECRET_KEY: '',
  SENDGRID_API_KEY: '',
  AWS_SECRET_ACCESS_KEY: '',
  PORT: 3000,
  NODE_ENV: 'development',
};

/**
 * CLIENT-SAFE Environment Variables
 * These can be safely exposed to the browser
 * These variables SHOULD have VITE_ prefix for Vite to bundle them
 */
export const CLIENT_ENV = {
  // API Configuration (Public - safe to expose)
  API_URL: import.meta.env.VITE_API_URL || '',
  APP_URL: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
  
  // Feature Flags (Public - safe to expose)
  DEBUG: import.meta.env.VITE_DEBUG === 'true',
  MOCK_AUTH: import.meta.env.VITE_MOCK_AUTH === 'true',
  MOCK_DATA: import.meta.env.VITE_MOCK_DATA === 'true',
  ENABLE_ANIMATIONS: import.meta.env.VITE_ENABLE_ANIMATIONS !== 'false',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
  
  // Public Configuration (Not sensitive)
  DEFAULT_LANGUAGE: import.meta.env.VITE_DEFAULT_LANGUAGE || 'en',
  MAPBOX_ACCESS_TOKEN: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '', // Public token
  
  // JWT Settings (Public - timeouts only, NOT secrets)
  JWT_EXPIRY: import.meta.env.VITE_JWT_EXPIRY || '1h',
  JWT_REFRESH_EXPIRY: import.meta.env.VITE_JWT_REFRESH_EXPIRY || '7d',
  
  // QR Settings (Public - limits only, NOT secrets)
  QR_TOKEN_ROTATION_DAYS: parseInt(import.meta.env.VITE_QR_TOKEN_ROTATION_DAYS || '30'),
  QR_RATE_LIMIT_MAX: parseInt(import.meta.env.VITE_QR_RATE_LIMIT_MAX || '20'),
  QR_RATE_LIMIT_WINDOW_MS: parseInt(import.meta.env.VITE_QR_RATE_LIMIT_WINDOW_MS || '60000'),
  
  // Rate Limiting (Public settings)
  RATE_LIMIT_WINDOW_MS: parseInt(import.meta.env.VITE_RATE_LIMIT_WINDOW_MS || '900000'),
  RATE_LIMIT_MAX: parseInt(import.meta.env.VITE_RATE_LIMIT_MAX || '100'),
};

/**
 * Combined environment (context-aware)
 * Automatically provides server or client values based on execution context
 */
export const env = {
  ...SERVER_ENV,
  ...CLIENT_ENV,
  
  // Environment helpers
  isServer,
  isClient,
  isDevelopment: SERVER_ENV.NODE_ENV === 'development',
  isProduction: SERVER_ENV.NODE_ENV === 'production',
  isTest: SERVER_ENV.NODE_ENV === 'test',
};

/**
 * Validate that required server-side variables are set
 * Call this at server startup
 */
export function validateServerEnvironment(): { valid: boolean; errors: string[] } {
  if (isClient) {
    return { valid: true, errors: [] };
  }
  
  const errors: string[] = [];
  const required: Record<string, string> = {
    DATABASE_URL: SERVER_ENV.DATABASE_URL,
    JWT_SECRET: SERVER_ENV.JWT_SECRET,
    JWT_REFRESH_SECRET: SERVER_ENV.JWT_REFRESH_SECRET,
  };
  
  // Check required variables
  for (const [key, value] of Object.entries(required)) {
    if (!value || value.trim() === '') {
      errors.push(`${key} is not set (required for server)`);
    }
  }
  
  // Check JWT secret lengths
  if (SERVER_ENV.JWT_SECRET && SERVER_ENV.JWT_SECRET.length < 32) {
    errors.push(`JWT_SECRET is too short (${SERVER_ENV.JWT_SECRET.length} chars, minimum 64 recommended)`);
  }
  
  if (SERVER_ENV.JWT_REFRESH_SECRET && SERVER_ENV.JWT_REFRESH_SECRET.length < 32) {
    errors.push(`JWT_REFRESH_SECRET is too short (${SERVER_ENV.JWT_REFRESH_SECRET.length} chars, minimum 64 recommended)`);
  }
  
  // Check for dangerous patterns (VITE_ prefix on sensitive data)
  const dangerous = Object.keys(process.env).filter(key =>
    key.startsWith('VITE_') && (
      key.includes('DATABASE') ||
      key.includes('SECRET') ||
      key.includes('PASSWORD') ||
      key.includes('KEY') && !key.includes('PUBLIC') ||
      key.includes('ENCRYPTION')
    )
  );
  
  if (dangerous.length > 0) {
    errors.push(`Sensitive variables with VITE_ prefix detected: ${dangerous.join(', ')}`);
    errors.push('Remove VITE_ prefix from sensitive variables - they will be exposed to client!');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Get a server-only variable (throws error if accessed from client)
 */
export function getServerVar(key: keyof typeof SERVER_ENV): string | number {
  if (isClient) {
    throw new Error(
      `SECURITY ERROR: Attempted to access server-only variable '${key}' from client-side code. ` +
      `This is blocked for security. Use API endpoints to access server data.`
    );
  }
  
  return SERVER_ENV[key];
}

/**
 * Check if a variable name is sensitive
 */
export function isSensitiveVariable(name: string): boolean {
  const sensitivePatterns = [
    'DATABASE',
    'SECRET',
    'PASSWORD',
    'PASS',
    'KEY',
    'TOKEN',
    'ENCRYPTION',
    'CREDENTIAL',
    'API_KEY',
    'PRIVATE',
  ];
  
  const upperName = name.toUpperCase();
  return sensitivePatterns.some(pattern => upperName.includes(pattern));
}

/**
 * Log environment configuration status (safe for production)
 */
export function logEnvironmentStatus(): void {
  if (isClient) {
    console.log('📱 Running in CLIENT mode');
    console.log('✅ Sensitive variables protected (not accessible from browser)');
    return;
  }
  
  console.log('🖥️  Running in SERVER mode');
  console.log('📋 Environment:', SERVER_ENV.NODE_ENV);
  console.log('🔌 Database:', SERVER_ENV.DATABASE_URL ? '✅ Configured' : '❌ Not configured');
  console.log('🔐 JWT Secret:', SERVER_ENV.JWT_SECRET ? '✅ Configured' : '❌ Not configured');
  console.log('🔑 JWT Refresh Secret:', SERVER_ENV.JWT_REFRESH_SECRET ? '✅ Configured' : '❌ Not configured');
  
  // Validate environment
  const validation = validateServerEnvironment();
  if (!validation.valid) {
    console.error('⚠️  Environment validation errors:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
  } else {
    console.log('✅ Environment validation passed');
  }
}

export default env;
