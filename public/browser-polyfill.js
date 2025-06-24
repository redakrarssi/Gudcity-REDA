/**
 * Browser API polyfill for cross-browser compatibility
 * This provides a consistent browser API across environments
 */

(function() {
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
      },
      // Add lastError handling to prevent errors
      lastError: null
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
    // Use a try-catch to handle potential errors when setting global objects
    try {
      // Check if browser is already defined
      if (!window.browser) {
        window.browser = browserPolyfill;
        console.log('Browser polyfill applied');
      }
      
      // Also define it as a global variable outside window
      if (typeof globalThis !== 'undefined' && !globalThis.browser) {
        globalThis.browser = browserPolyfill;
      }
    } catch (error) {
      console.warn('Error setting up browser polyfill:', error);
    }
  }

  // For CommonJS environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = browserPolyfill;
  }
  
  // Make sure browser is defined before any content scripts run
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof window !== 'undefined' && !window.browser) {
      window.browser = browserPolyfill;
      console.log('Browser polyfill applied on DOMContentLoaded');
    }
  });
})(); 