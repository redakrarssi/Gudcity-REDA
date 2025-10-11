// Environment variables with typed structure
// CRITICAL FIX: API base URL resolver for VERCEL PRODUCTION
// - Domain only (no /api suffix) since endpoints already include /api/ prefix
// - Prevents double /api/api/ prefix that causes 404 errors on Vercel
// - Fallback to localhost only when no window context is available (e.g. tests)
export const API_BASE_URL = (() => {
  const explicit = (import.meta.env.VITE_API_URL || '').trim();
  if (explicit) {
    // Normalize and prevent double /api prefix issues
    const normalized = explicit.replace(/\/$/, '');
    // If explicitly set to "/api" (or ends with it), use same-origin domain only
    // because all callers already prefix endpoints with "/api/..."
    if (normalized === '/api' || normalized.endsWith('/api')) {
      if (typeof window !== 'undefined' && window.location) {
        return window.location.origin.replace(/\/$/, '');
      }
      // Node/test fallback: empty means use relative URLs (handled by proxy/router)
      return '';
    }
    return normalized;
  }

  // Support alternate backend URL keys (deployment flexibility)
  const alt = (import.meta.env.VITE_PUBLIC_API_URL || import.meta.env.VITE_BACKEND_URL || '').trim();
  if (alt) return alt;

  if (typeof window !== 'undefined' && window.location) {
    // CRITICAL FIX: Return domain only (no /api suffix) to prevent double prefix
    // Endpoints already include /api/ prefix, so this prevents /api/api/ URLs
    const origin = window.location.origin.replace(/\/$/, '');
    return origin;  // Fixed: was `${origin}/api` which caused double prefix
  }
  // Node/test fallback
  return 'http://localhost:3000';
})();

// DIAGNOSTIC: Verify API URL configuration is correct
if (typeof window !== 'undefined') {
  const testEndpoint = '/api/auth/login';
  const fullUrl = `${API_BASE_URL}${testEndpoint}`;
  
  // Detect double /api/ prefix
  if (fullUrl.includes('/api/api/')) {
    console.error('🚨 CRITICAL: Double /api/ prefix detected!');
    console.error('❌ Generated URL:', fullUrl);
    console.error('💡 This will cause 404 errors on Vercel production');
    console.error('🔧 Fix: API_BASE_URL should be domain only, not include /api');
  } else {
    console.log('✅ API URL configuration correct:', fullUrl);
  }
}

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