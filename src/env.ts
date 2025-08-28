// Environment variables with typed structure
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Other environment configurations
export const APP_ENV = import.meta.env.VITE_APP_ENV || 'development';
export const DEFAULT_LANGUAGE = import.meta.env.VITE_DEFAULT_LANGUAGE || 'en';
export const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

// API rate limits
export const API_RATE_LIMIT = {
  maxRequests: parseInt(import.meta.env.VITE_API_RATE_LIMIT_MAX || '100'),
  windowMs: parseInt(import.meta.env.VITE_API_RATE_LIMIT_WINDOW || '60000')
};

// JWT token settings
export const JWT_SETTINGS = {
  expiryTime: parseInt(import.meta.env.VITE_JWT_EXPIRY || '86400'),
  refreshTime: parseInt(import.meta.env.VITE_JWT_REFRESH || '3600')
};

// Feature flags - SECURITY: Disable debug features in production
export const FEATURES = {
  enableFeedback: import.meta.env.VITE_ENABLE_FEEDBACK !== 'false',
  enableAnimations: import.meta.env.VITE_ENABLE_ANIMATIONS !== 'false',
<<<<<<< Current (Your changes)
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false'
=======
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
  // SECURITY: Debug features only in development
  debugMode: import.meta.env.VITE_DEBUG === 'true' && import.meta.env.VITE_APP_ENV === 'development'
>>>>>>> Incoming (Background Agent changes)
}; 