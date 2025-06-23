/**
 * Browser API Polyfill for GudCity
 * This provides fallbacks for browser extension APIs to prevent "browser is not defined" errors
 */

// Browser API polyfill for web extensions compatibility
(function() {
  // Create a browser polyfill if it doesn't exist
  if (typeof window !== 'undefined' && typeof window.browser === 'undefined') {
    window.browser = {
      // Add basic browser API polyfills
      runtime: {
        sendMessage: function() {
          return Promise.resolve();
        },
        onMessage: {
          addListener: function() {},
          removeListener: function() {}
        },
        getURL: function(path) {
          return path;
        },
        connect: function() {
          return {
            postMessage: function() {},
            onMessage: { addListener: function() {} },
            onDisconnect: { addListener: function() {} }
          };
        },
        sendNativeMessage: function() {
          return Promise.resolve();
        },
        getPlatformInfo: function() {
          return Promise.resolve({ os: 'win', arch: 'x86-64' });
        }
      },
      tabs: {
        query: function() {
          return Promise.resolve([]);
        },
        sendMessage: function() {
          return Promise.resolve();
        },
        create: function() {
          return Promise.resolve({});
        },
        update: function() {
          return Promise.resolve();
        }
      },
      storage: {
        local: {
          get: function() {
            return Promise.resolve({});
          },
          set: function() {
            return Promise.resolve();
          }
        },
        sync: {
          get: function() {
            return Promise.resolve({});
          },
          set: function() {
            return Promise.resolve();
          }
        }
      },
      extension: {
        getURL: function(path) {
          return path;
        },
        getBackgroundPage: function() {
          return Promise.resolve(window);
        }
      },
      // Additional APIs that might be referenced
      webNavigation: {
        onCommitted: { addListener: function() {} },
        onCompleted: { addListener: function() {} },
        onHistoryStateUpdated: { addListener: function() {} }
      },
      scripting: {
        executeScript: function() {
          return Promise.resolve([]);
        }
      }
    };
    
    console.log('Browser API polyfill installed');
  }
})();

(function() {
  console.log('Loading browser polyfill');
  
  // Create browser global if it doesn't exist
  if (typeof window !== 'undefined') {
    // Make sure browser exists as a global
    window.browser = window.browser || {};
    
    // Define comprehensive browser API mock
    const browserAPI = {
      runtime: {
        sendMessage: function() { return Promise.resolve(); },
        onMessage: { 
          addListener: function() {}, 
          removeListener: function() {},
          hasListener: function() { return false; }
        },
        getManifest: function() { return {}; },
        getURL: function(path) { return path; },
        lastError: null,
        connect: function() { 
          return { 
            onMessage: { addListener: function() {} },
            onDisconnect: { addListener: function() {} },
            postMessage: function() {}
          }; 
        },
        onConnect: { addListener: function() {} }
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
        },
        onChanged: { addListener: function() {} }
      },
      tabs: {
        query: function() { return Promise.resolve([]); },
        create: function() { return Promise.resolve({}); },
        update: function() { return Promise.resolve(); },
        get: function() { return Promise.resolve({}); },
        getCurrent: function() { return Promise.resolve({}); },
        sendMessage: function() { return Promise.resolve(); },
        executeScript: function() { return Promise.resolve([]); }
      },
      webRequest: {
        onBeforeRequest: { 
          addListener: function() {}, 
          removeListener: function() {} 
        },
        onCompleted: { 
          addListener: function() {},
          removeListener: function() {}
        },
        onErrorOccurred: { 
          addListener: function() {},
          removeListener: function() {}
        }
      },
      extension: {
        getURL: function(path) { return path; },
        getBackgroundPage: function() { return Promise.resolve(window); },
        isAllowedIncognitoAccess: function() { return Promise.resolve(false); }
      },
      i18n: {
        getMessage: function() { return ''; },
        getUILanguage: function() { return 'en-US'; }
      },
      contextMenus: {
        create: function() { return 1; },
        update: function() { return Promise.resolve(); },
        remove: function() { return Promise.resolve(); },
        removeAll: function() { return Promise.resolve(); }
      },
      cookies: {
        get: function() { return Promise.resolve(null); },
        getAll: function() { return Promise.resolve([]); },
        set: function() { return Promise.resolve(); },
        remove: function() { return Promise.resolve(); }
      },
      windows: {
        getCurrent: function() { return Promise.resolve({}); },
        create: function() { return Promise.resolve({}); },
        update: function() { return Promise.resolve({}); }
      },
      devtools: {
        inspectedWindow: {
          eval: function() { return Promise.resolve({}); }
        },
        panels: {
          create: function() { return Promise.resolve({}); }
        }
      },
      scripting: {
        executeScript: function() { return Promise.resolve([]); },
        insertCSS: function() { return Promise.resolve(); }
      },
      webNavigation: {
        onDOMContentLoaded: { addListener: function() {} },
        onCompleted: { addListener: function() {} },
        onHistoryStateUpdated: { addListener: function() {} }
      },
      permissions: {
        contains: function() { return Promise.resolve(true); },
        request: function() { return Promise.resolve(true); }
      }
    };
    
    // Merge with existing browser object if any
    for (const key in browserAPI) {
      if (!window.browser[key]) {
        window.browser[key] = browserAPI[key];
      } else {
        // Deep merge for existing properties
        for (const subKey in browserAPI[key]) {
          if (!window.browser[key][subKey]) {
            window.browser[key][subKey] = browserAPI[key][subKey];
          }
        }
      }
    }
    
    // Chrome compatibility
    if (typeof window.chrome === 'undefined') {
      window.chrome = {
        runtime: window.browser.runtime,
        storage: window.browser.storage,
        tabs: window.browser.tabs,
        extension: window.browser.extension
      };
    }
    
    console.log('Browser polyfill installed');
  }
})(); 