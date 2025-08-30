// Environment variables with typed structure
// Robust API base URL resolver:
// - Prefer explicit VITE_API_URL when provided
// - In browsers, default to same-origin '/api' to avoid CORS and localhost issues in production
// - Fallback to localhost only when no window context is available (e.g. tests)
export const API_BASE_URL = (() => {
  const explicit = (import.meta.env.VITE_API_URL || '').trim();
  if (explicit) return explicit;

  // Support alternate backend URL keys (deployment flexibility)
  const alt = (import.meta.env.VITE_PUBLIC_API_URL || import.meta.env.VITE_BACKEND_URL || '').trim();
  if (alt) return alt;

  if (typeof window !== 'undefined' && window.location) {
    // Use same-origin API path to prevent cross-origin CORS errors in production
    const origin = window.location.origin.replace(/\/$/, '');
    return `${origin}/api`;
  }
  // Node/test fallback
  return 'http://localhost:3000';
})();

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
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
  // SECURITY: Debug features only in development
  debugMode: import.meta.env.VITE_DEBUG === 'true' && import.meta.env.VITE_APP_ENV === 'development'
}; 