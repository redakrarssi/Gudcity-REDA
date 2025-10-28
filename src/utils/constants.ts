/**
 * WebSocket event constants
 */
export const WEBSOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  JOIN: 'join',
  
  // Notification events
  NOTIFICATION: 'notification',
  NOTIFICATION_READ: 'notification_read',
  
  // Approval events
  APPROVAL: 'approval',
  APPROVAL_RESPONSE: 'approval_response',
  
  // Transaction events
  POINTS_ADDED: 'points_added',
  POINTS_DEDUCTED: 'points_deducted',
  
  // Program events
  PROGRAM_ENROLLMENT: 'program_enrollment',
  PROGRAM_STATUS_CHANGED: 'program_status_changed',
  
  // QR code scan events
  QR_SCANNED: 'qr_scanned'
};

/**
 * Application constants and fallbacks for browser APIs
 */

// Browser API fallbacks
export const BROWSER_API = {
  // Ensure browser is defined
  BROWSER: typeof window !== 'undefined' ? 
    (window as any).browser || {
      runtime: { 
        sendMessage: () => Promise.resolve(),
        onMessage: { addListener: () => {}, removeListener: () => {} },
        getURL: (path: string) => path,
        lastError: null
      },
      storage: {
        local: { get: () => Promise.resolve({}), set: () => Promise.resolve() }
      }
    } : null,
    
  // Ensure chrome is defined
  CHROME: typeof window !== 'undefined' ? 
    (window as any).chrome || {
      runtime: { 
        sendMessage: () => Promise.resolve(),
        onMessage: { addListener: () => {}, removeListener: () => {} },
        getURL: (path: string) => path,
        lastError: null
      },
      storage: {
        local: { get: () => Promise.resolve({}), set: () => Promise.resolve() }
      }
    } : null
};

// API endpoints
export const API_ENDPOINTS = {
  BUSINESS: '/api/business',
  CUSTOMER: '/api/customer',
  LOYALTY: '/api/loyalty',
  NOTIFICATIONS: '/api/notifications',
  QR_CODE: '/api/qrcode',
  AUTH: '/api/auth'
};

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PROFILE: 'user_profile',
  THEME: 'theme_preference',
  LANGUAGE: 'language_preference'
};

// Default configuration values
export const DEFAULT_CONFIG = {
  API_URL: process.env.API_URL || 'http://localhost:3000',
  SOCKET_URL: process.env.SOCKET_URL || 'http://localhost:3000',
  DEFAULT_LANGUAGE: 'en',
  DEFAULT_THEME: 'light',
  DEFAULT_CURRENCY: 'USD'
};

// Error messages
export const ERROR_MESSAGES = {
  BROWSER_API_UNAVAILABLE: 'Browser extension API is not available',
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  AUTH_REQUIRED: 'Authentication required',
  PERMISSION_DENIED: 'Permission denied',
  SERVER_ERROR: 'Server error occurred. Please try again later.'
};

// Function to safely access browser APIs
export const safeBrowserCall = (path: string[], ...args: any[]) => {
  try {
    let current: any = BROWSER_API.BROWSER;
    
    // Navigate through the path
    for (const key of path) {
      if (!current || typeof current !== 'object') return null;
      current = current[key];
    }
    
    // Call the function if it exists
    if (typeof current === 'function') {
      return current(...args);
    }
    
    return null;
  } catch (error) {
    console.warn(`Error accessing browser API at ${path.join('.')}:`, error);
    return null;
  }
};

// Export a safe browser object
export const safeBrowser = {
  runtime: {
    sendMessage: (...args: any[]) => safeBrowserCall(['runtime', 'sendMessage'], ...args) || Promise.resolve(null),
    getURL: (path: string) => safeBrowserCall(['runtime', 'getURL'], path) || path,
    onMessage: {
      addListener: (callback: Function) => safeBrowserCall(['runtime', 'onMessage', 'addListener'], callback),
      removeListener: (callback: Function) => safeBrowserCall(['runtime', 'onMessage', 'removeListener'], callback)
    }
  },
  storage: {
    local: {
      get: (keys: any) => safeBrowserCall(['storage', 'local', 'get'], keys) || Promise.resolve({}),
      set: (items: object) => safeBrowserCall(['storage', 'local', 'set'], items) || Promise.resolve()
    }
  }
};

export default {
  BROWSER_API,
  API_ENDPOINTS,
  STORAGE_KEYS,
  DEFAULT_CONFIG,
  ERROR_MESSAGES,
  safeBrowser
}; 