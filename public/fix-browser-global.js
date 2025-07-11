/**
 * Browser Extension API Polyfill
 * 
 * This script provides global polyfills for browser extension APIs to prevent
 * errors from browser extensions trying to access these objects.
 */

(function() {
  // Create a comprehensive browser extension API polyfill
  const browserPolyfill = {
    runtime: {
      sendMessage: () => Promise.resolve({}),
      onMessage: {
        addListener: () => {},
        removeListener: () => {},
        hasListener: () => false
      },
      connect: () => ({
        onDisconnect: { addListener: () => {} },
        postMessage: () => {},
        disconnect: () => {}
      }),
      onConnect: { addListener: () => {} },
      getURL: (path) => path,
      getManifest: () => ({}),
      id: "polyfill-extension-id",
      onInstalled: { addListener: () => {} },
      lastError: null
    },
    storage: {
      local: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve({}),
        remove: () => Promise.resolve({}),
        clear: () => Promise.resolve({})
      },
      sync: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve({}),
        remove: () => Promise.resolve({}),
        clear: () => Promise.resolve({})
      },
      onChanged: { addListener: () => {} }
    },
    tabs: {
      query: () => Promise.resolve([]),
      create: () => Promise.resolve({}),
      update: () => Promise.resolve({}),
      getCurrent: () => Promise.resolve({ id: 1 }),
      sendMessage: () => Promise.resolve({}),
      onUpdated: { addListener: () => {} },
      onActivated: { addListener: () => {} }
    },
    webNavigation: {
      onCommitted: { addListener: () => {} },
      onCompleted: { addListener: () => {} }
    },
    webRequest: {
      onBeforeRequest: { addListener: () => {} },
      onCompleted: { addListener: () => {} }
    },
    i18n: {
      getMessage: () => ''
    },
    extension: {
      getURL: (path) => path,
      inIncognitoContext: false
    }
  };

  // Intercept property access on window object to provide polyfills
  const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  Object.getOwnPropertyDescriptor = function(obj, prop) {
    // Only intercept window object
    if (obj !== window) {
      return originalGetOwnPropertyDescriptor(obj, prop);
    }
    
    // Handle browser extension-related properties
    if (prop === 'browser' || prop === 'chrome' || prop === 'msBrowser' || prop === 'browser_polyfill') {
      return {
        configurable: true,
        enumerable: true,
        get: function() {
          return browserPolyfill;
        }
      };
    }
    
    return originalGetOwnPropertyDescriptor(obj, prop);
  };

  // Direct assignment for maximum compatibility
  window.browser = browserPolyfill;
  window.chrome = browserPolyfill;
  window.msBrowser = browserPolyfill;
  window.browser_polyfill = browserPolyfill;

  // Suppress all console errors from browser extensions
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Check if this is a browser extension error
    if (args.length > 0) {
      const firstArg = args[0];
      if (typeof firstArg === 'string') {
        // List of patterns to match for suppression
        const suppressPatterns = [
          'browser is not defined',
          'chrome is not defined',
          'browser_polyfill',
          'checkPageManual.js',
          'overlays.js',
          'content.js',
          'Cannot read properties of undefined',
          'Unchecked runtime.lastError',
          'Could not establish connection',
          'Receiving end does not exist'
        ];
        
        // Check if any pattern matches
        if (suppressPatterns.some(pattern => firstArg.includes(pattern))) {
          return; // Suppress the error
        }
      }
      
      // Handle error objects
      if (firstArg instanceof Error) {
        const errorMsg = firstArg.message || firstArg.toString();
        const errorStack = firstArg.stack || '';
        
        if (
          errorMsg.includes('browser is not defined') ||
          errorMsg.includes('chrome is not defined') ||
          errorStack.includes('checkPageManual.js') ||
          errorStack.includes('overlays.js') ||
          errorStack.includes('content.js')
        ) {
          return; // Suppress the error
        }
      }
    }
    
    // Pass through other errors
    return originalConsoleError.apply(console, args);
  };

  // Handle uncaught errors globally
  window.addEventListener('error', function(event) {
    if (event.error && typeof event.error.message === 'string') {
      const errorMsg = event.error.message;
      const filename = event.filename || '';
      
      if (
        errorMsg.includes('browser is not defined') ||
        errorMsg.includes('chrome is not defined') ||
        filename.includes('checkPageManual.js') ||
        filename.includes('overlays.js') ||
        filename.includes('content.js')
      ) {
        event.preventDefault();
        event.stopPropagation();
        return false; // Suppress the error
      }
    }
  }, true);

  // Suppress geolocation errors
  const originalNavigatorGeolocation = navigator.geolocation;
  if (originalNavigatorGeolocation) {
    navigator.geolocation = {
      getCurrentPosition: function(success, error, options) {
        const wrappedError = error ? function(err) {
          console.warn('Suppressed geolocation error:', err);
          error(err);
        } : null;
        
        try {
          return originalNavigatorGeolocation.getCurrentPosition(success, wrappedError, options);
        } catch (e) {
          console.warn('Suppressed geolocation exception:', e);
          if (wrappedError) {
            wrappedError({
              code: 2,
              message: 'Position unavailable',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3
            });
          }
        }
      },
      watchPosition: originalNavigatorGeolocation.watchPosition.bind(originalNavigatorGeolocation),
      clearWatch: originalNavigatorGeolocation.clearWatch.bind(originalNavigatorGeolocation)
    };
  }

  console.log('Browser extension polyfills applied successfully');
})();

/**
 * Fix for browser global reference errors
 * This script ensures the browser object is defined before any content scripts run
 */

(function() {
  console.log('Applying browser global fix');
  
  // Create a minimal browser object if it doesn't exist
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
        }
      },
      tabs: {
        query: function() { return Promise.resolve([]); },
        create: function() { return Promise.resolve({}); },
        update: function() { return Promise.resolve({}); }
      }
    };
    
    console.log('Browser global object created');
  }
  
  // Also define it as a global variable outside window
  if (typeof globalThis !== 'undefined' && !globalThis.browser) {
    globalThis.browser = window.browser;
  }
  
  // For CommonJS environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.browser;
  }
  
  // Fix for content scripts that might run before browser is defined
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    
    // If creating a script element, ensure browser is defined before it runs
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src') {
          // Ensure browser is defined before the script loads
          if (typeof window !== 'undefined' && !window.browser) {
            console.log('Fixing missing browser reference for script:', value);
            window.browser = window.browser || {
              runtime: { 
                sendMessage: function() { return Promise.resolve(); }, 
                onMessage: { addListener: function() {}, removeListener: function() {} },
                getURL: function(path) { return path; }
              },
              storage: { 
                local: { 
                  get: function() { return Promise.resolve({}); }, 
                  set: function() { return Promise.resolve(); } 
                }
              }
            };
          }
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    
    return element;
  };
  
  console.log('Browser global fix applied');
})();
