/**
 * This script specifically addresses "browser is not defined" errors from content scripts
 * It must be loaded very early in the page lifecycle
 */

(function() {
  console.log('Applying content script fixes');
  
  // Create the browser global with the bare minimum needed by content scripts
  if (typeof window !== 'undefined') {
    // Define browser object if it doesn't exist
    window.browser = window.browser || {};
    
    // Make sure critical content script properties exist
    const contentScriptAPI = {
      runtime: {
        sendMessage: function() { return Promise.resolve(); },
        onMessage: { 
          addListener: function() {}, 
          removeListener: function() {},
          hasListener: function() { return false; }
        },
        connect: function() { 
          return { 
            onMessage: { addListener: function() {} },
            onDisconnect: { addListener: function() {} },
            postMessage: function() {}
          }; 
        }
      },
      tabs: {
        sendMessage: function() { return Promise.resolve(); },
        query: function() { return Promise.resolve([]); }
      },
      storage: {
        local: { get: function() { return Promise.resolve({}); } },
        sync: { get: function() { return Promise.resolve({}); } }
      }
    };
    
    // Apply the content script API properties
    for (const key in contentScriptAPI) {
      window.browser[key] = window.browser[key] || contentScriptAPI[key];
    }
    
    // Chrome compatibility (used by many content scripts)
    window.chrome = window.chrome || {};
    window.chrome.runtime = window.chrome.runtime || window.browser.runtime;
    window.chrome.tabs = window.chrome.tabs || window.browser.tabs;
    window.chrome.storage = window.chrome.storage || window.browser.storage;
    
    // Special flag for content scripts to detect
    window.__CONTENT_SCRIPT_HOST__ = true;
    
    // Add error handler to intercept and suppress content script errors
    window.addEventListener('error', function(event) {
      // Check if this is a content script error
      if (event && event.error && event.error.message && 
          (event.error.message.includes('browser is not defined') || 
           event.error.message.includes('chrome is not defined'))) {
        // Prevent the error from propagating
        event.preventDefault();
        event.stopPropagation();
        console.warn('Suppressed content script error:', event.error.message);
        return false;
      }
    }, true);
    
    console.log('Content script fixes applied');
  }

  // Fix for "browser is not defined" errors in content scripts
  if (typeof window !== 'undefined' && typeof browser === 'undefined') {
    // Create a browser polyfill if it doesn't exist
    window.browser = {
      // Add basic browser API polyfills
      runtime: {
        sendMessage: function() {
          console.log('Browser API polyfill: sendMessage called');
          return Promise.resolve();
        },
        onMessage: {
          addListener: function() {
            console.log('Browser API polyfill: onMessage.addListener called');
          },
          removeListener: function() {
            console.log('Browser API polyfill: onMessage.removeListener called');
          }
        },
        getURL: function(path) {
          console.log('Browser API polyfill: getURL called with', path);
          return path;
        }
      },
      tabs: {
        query: function() {
          console.log('Browser API polyfill: tabs.query called');
          return Promise.resolve([]);
        },
        sendMessage: function() {
          console.log('Browser API polyfill: tabs.sendMessage called');
          return Promise.resolve();
        }
      },
      storage: {
        local: {
          get: function() {
            console.log('Browser API polyfill: storage.local.get called');
            return Promise.resolve({});
          },
          set: function() {
            console.log('Browser API polyfill: storage.local.set called');
            return Promise.resolve();
          }
        }
      }
    };
    
    console.log('Browser API polyfill installed');
  }
})(); 