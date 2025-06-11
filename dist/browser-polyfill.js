/**
 * Browser API polyfill
 * This script provides a fallback for browser extension APIs
 */
(function() {
  // Define browser globally if it doesn't exist
  if (typeof window !== 'undefined' && typeof window.browser === 'undefined') {
    window.browser = {
      // Add empty implementation of common browser extension APIs
      runtime: {
        sendMessage: function() { return Promise.resolve(); },
        onMessage: { 
          addListener: function() {},
          removeListener: function() {}
        },
        getManifest: function() { return {}; },
        getURL: function(path) { return path; }
      },
      storage: {
        local: {
          get: function() { return Promise.resolve({}); },
          set: function() { return Promise.resolve(); },
          remove: function() { return Promise.resolve(); }
        },
        sync: {
          get: function() { return Promise.resolve({}); },
          set: function() { return Promise.resolve(); },
          remove: function() { return Promise.resolve(); }
        }
      },
      tabs: {
        query: function() { return Promise.resolve([]); },
        create: function() { return Promise.resolve({}); },
        update: function() { return Promise.resolve(); }
      }
    };
    
    // Make chrome API compatible with browser API
    if (typeof window.chrome !== 'undefined') {
      if (!window.chrome.runtime) window.chrome.runtime = {};
      // Add promise-based wrappers for chrome APIs
      const chromeAPIs = ['tabs', 'runtime', 'storage', 'extension'];
      chromeAPIs.forEach(function(api) {
        if (window.chrome[api]) {
          Object.keys(window.chrome[api]).forEach(function(method) {
            if (typeof window.chrome[api][method] === 'function' && !window.browser[api][method]) {
              window.browser[api][method] = function() {
                return new Promise(function(resolve) {
                  window.chrome[api][method].apply(window.chrome[api], [...arguments, resolve]);
                });
              };
            }
          });
        }
      });
    }
    
    console.log('Browser API polyfill loaded');
  }
})(); 