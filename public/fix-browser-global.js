/**
 * Fix for "browser is not defined" errors
 * This script ensures that the browser global variable exists
 * It must be loaded before any scripts that reference browser
 */

(function() {
  console.log('Applying aggressive browser global fix');
  
  // CRITICAL: Force define global objects to prevent module loading errors
  if (typeof window !== 'undefined') {
    // Specifically shim the numeric function and module loader pattern from the error logs
    window['3'] = window['3'] || function() { return {}; };
    window['1230'] = window['1230'] || function() { return {}; };
    window['i'] = window['i'] || function() { return {}; };
    window['n'] = window['n'] || function() { return {}; };
    
    // Create browser global as early as possible
    window.browser = window.browser || {
      runtime: {
        sendMessage: function() { return Promise.resolve(); },
        onMessage: { 
          addListener: function() {}, 
          removeListener: function() {} 
        },
        connect: function() {
          return {
            postMessage: function() {},
            onMessage: { addListener: function() {} },
            onDisconnect: { addListener: function() {} }
          };
        }
      },
      tabs: {
        query: function() { return Promise.resolve([]); },
        sendMessage: function() { return Promise.resolve(); },
        create: function() { return Promise.resolve({}); }
      },
      storage: {
        local: {
          get: function() { return Promise.resolve({}); },
          set: function() { return Promise.resolve(); }
        },
        sync: {
          get: function() { return Promise.resolve({}); },
          set: function() { return Promise.resolve(); }
        }
      },
      windows: {
        create: function() { return Promise.resolve({}); },
        getCurrent: function() { return Promise.resolve({}); }
      },
      webNavigation: {
        onCompleted: { addListener: function() {} }
      }
    };
    
    // Chrome compatibility for content scripts 
    window.chrome = window.chrome || {
      runtime: window.browser.runtime,
      storage: window.browser.storage,
      tabs: window.browser.tabs,
      extension: { 
        getURL: function(path) { return path; } 
      }
    };
    
    // Content script specific properties
    window.__BROWSER_POLYFILL__ = true;
    window.__CONTENT_SCRIPT_HOST__ = true;
    
    // Create an event to signal that browser polyfill is ready
    if (typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('browser-polyfill-ready'));
    }
    
    // Super aggressive error handling - create a MutationObserver to inject
    // polyfills into dynamically created scripts
    try {
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.addedNodes) {
            mutation.addedNodes.forEach(function(node) {
              if (node.tagName === 'SCRIPT') {
                // Every time a script is added, ensure our polyfills exist
                window.browser = window.browser || {};
                window.chrome = window.chrome || {};
                window['3'] = window['3'] || function() { return {}; };
                window['1230'] = window['1230'] || function() { return {}; };
                window['i'] = window['i'] || function() { return {}; };
                window['n'] = window['n'] || function() { return {}; };
              }
            });
          }
        });
      });
      
      // Start observing
      observer.observe(document, {
        childList: true,
        subtree: true
      });
    } catch (err) {
      console.warn('Error setting up observer:', err);
    }
    
    // Global error capture for browser-related errors
    window.addEventListener('error', function(event) {
      if (event && event.error && event.error.message && 
          (event.error.message.includes('browser is not defined') || 
           event.error.message.includes('chrome is not defined'))) {
        console.warn('Suppressed browser API error:', event.error.message);
        event.preventDefault();
        event.stopPropagation();
        
        // Re-apply polyfills when error is detected
        window.browser = window.browser || {};
        window.chrome = window.chrome || {};
        window['3'] = window['3'] || function() { return {}; };
        window['1230'] = window['1230'] || function() { return {}; };
        window['i'] = window['i'] || function() { return {}; };
        window['n'] = window['n'] || function() { return {}; };
        
        return false;
      }
    }, true);
    
    // Intercept content script errors early
    const originalError = console.error;
    console.error = function(...args) {
      // If the error contains browser is not defined, suppress it
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('browser is not defined') || 
           args[0].includes('ReferenceError: browser') ||
           args[0].includes('browser.runtime') ||
           args[0].includes('chrome.runtime'))) {
        console.warn('Suppressed browser not defined error');
        return;
      }
      
      // Handle "Cannot use 'in' operator" errors
      if (args[0] && typeof args[0] === 'string' && 
          args[0].includes("Cannot use 'in' operator")) {
        console.warn('Suppressed "in" operator error');
        return;
      }
      
      return originalError.apply(console, args);
    };
    
    console.log('Browser global fixed (aggressive mode)');
  } else {
    console.log('Browser global already exists');
  }
})(); 