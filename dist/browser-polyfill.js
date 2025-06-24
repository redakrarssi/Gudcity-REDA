/**
 * Browser API polyfill for cross-browser compatibility
 * This provides a consistent browser API across environments
 */

// Define a global browser object for extension compatibility
const browserPolyfill = {
  // Basic extension API structure
  runtime: {
    sendMessage: function() {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        return chrome.runtime.sendMessage.apply(chrome.runtime, arguments);
      }
      console.warn('Browser runtime API not available');
      return Promise.resolve(null);
    },
    onMessage: {
      addListener: function(callback) {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.onMessage.addListener(callback);
        }
      },
      removeListener: function(callback) {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.onMessage.removeListener(callback);
        }
      }
    },
    getURL: function(path) {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        return chrome.runtime.getURL(path);
      }
      return path; // Fallback to relative path
    }
  },
  
  // Storage API
  storage: {
    local: {
      get: function(keys) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          return chrome.storage.local.get(keys);
        }
        return Promise.resolve({});
      },
      set: function(items) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          return chrome.storage.local.set(items);
        }
        return Promise.resolve();
      }
    }
  }
};

// Define browser globally
if (typeof window !== 'undefined') {
  window.browser = browserPolyfill;
}

// For CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = browserPolyfill;
} 