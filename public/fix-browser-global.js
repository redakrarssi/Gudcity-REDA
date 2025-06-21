/**
 * Fix for browser global object
 * Ensures the browser global object is properly defined
 * to prevent "browser is not defined" errors
 */

(function() {
  console.log('Applying browser global object fix');
  
  // Create browser global if it doesn't exist
  if (typeof window !== 'undefined' && !window.browser) {
    window.browser = {
      runtime: {
        sendMessage: function() { return Promise.resolve(); },
        onMessage: { 
          addListener: function() {}, 
          removeListener: function() {} 
        },
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
          set: function() { return Promise.resolve(); } 
        }
      },
      tabs: {
        query: function() { return Promise.resolve([]); },
        create: function() { return Promise.resolve({}); },
        update: function() { return Promise.resolve({}); }
      },
      extension: {
        getURL: function(path) { return path; }
      }
    };
  }
  
  // Fix for extension detection
  window.isExtensionContext = false;
  window.isWebPage = true;
  
  console.log('Browser global object fix applied');
})(); 