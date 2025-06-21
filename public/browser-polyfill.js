/**
 * Browser API Polyfill for GudCity
 * This provides fallbacks for browser extension APIs to prevent "browser is not defined" errors
 */

(function() {
  console.log('Loading browser polyfill');
  
  // Create browser global if it doesn't exist
  if (typeof window !== 'undefined' && !window.browser) {
    window.browser = {
      runtime: {
        sendMessage: function() { return Promise.resolve(); },
        onMessage: { addListener: function() {}, removeListener: function() {} },
        getManifest: function() { return {}; },
        getURL: function(path) { return path; },
        lastError: null
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
      },
      webRequest: {
        onBeforeRequest: { addListener: function() {} },
        onCompleted: { addListener: function() {} },
        onErrorOccurred: { addListener: function() {} }
      },
      extension: {
        getURL: function(path) { return path; }
      },
      i18n: {
        getMessage: function() { return ''; }
      }
    };
    
    console.log('Browser polyfill installed');
  }
})(); 