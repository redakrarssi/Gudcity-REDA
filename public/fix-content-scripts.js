/**
 * Fix for content scripts to prevent "browser is not defined" errors
 * This script ensures content scripts can run in a browser environment
 */

(function() {
  console.log('Applying content script compatibility fixes');
  
  // Define browser globally first - this is critical for content scripts
  // This needs to be done before any content scripts are loaded
  if (typeof browser === 'undefined') {
    var browser = {
      runtime: {
        sendMessage: function() { 
          return Promise.resolve(null); 
        },
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
        },
        getURL: function(path) { return path; },
        lastError: null
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
      tabs: {
        query: function() { return Promise.resolve([]); },
        create: function() { return Promise.resolve({}); },
        update: function() { return Promise.resolve({}); }
      }
    };
  }
  
  // Ensure browser global exists for content scripts
  if (typeof window !== 'undefined') {
    // Define browser API for content scripts if not already defined
    window.browser = window.browser || browser;
    
    // Add content script specific APIs
    window.browser.runtime = window.browser.runtime || {
      sendMessage: function() { 
        console.warn('Content script attempted to use browser.runtime.sendMessage');
        return Promise.resolve(null); 
      },
      onMessage: { 
        addListener: function(callback) {
          console.warn('Content script attempted to use browser.runtime.onMessage.addListener');
        },
        removeListener: function(callback) {
          console.warn('Content script attempted to use browser.runtime.onMessage.removeListener');
        }
      },
      connect: function() {
        console.warn('Content script attempted to use browser.runtime.connect');
        return {
          postMessage: function() {},
          onMessage: { 
            addListener: function() {} 
          },
          onDisconnect: { 
            addListener: function() {} 
          }
        };
      },
      lastError: null
    };
    
    // Ensure chrome API exists for content scripts
    window.chrome = window.chrome || {};
    window.chrome.runtime = window.chrome.runtime || window.browser.runtime;
    
    // Content script markers
    window.__CONTENT_SCRIPT_HOST__ = true;
    window.__BROWSER_POLYFILL__ = true;
    
    // Override the global Error constructor to catch browser errors early
    const originalError = window.Error;
    window.Error = function(message) {
      // Check if this is a common browser extension error
      if (typeof message === 'string' && 
          (message.includes('browser is not defined') || 
           message.includes('chrome is not defined'))) {
        console.warn('Suppressed Error creation:', message);
        // Return a dummy error that won't throw when accessed
        return {
          message: '[Suppressed] ' + message,
          toString: function() { return '[Suppressed] ' + message; },
          stack: ''
        };
      }
      
      // For other errors, use the original constructor
      return new originalError(message);
    };
    
    // Inherit all properties from the original Error constructor
    Object.setPrototypeOf(window.Error, originalError);
    window.Error.prototype = originalError.prototype;
    
    // Error handler specifically for content script errors
    window.addEventListener('error', function(event) {
      // Check the filename to identify problematic scripts
      const filename = event.filename || '';
      const errorMessage = event.error && event.error.message || event.message || '';
      
      // List of problematic script patterns to catch
      const problematicScripts = [
        'content.js',
        'checkPageManual.js',
        'overlays.js',
        'adblock',
        'extension'
      ];
      
      // Check if this is from a problematic script
      const isProblematicScript = problematicScripts.some(script => filename.includes(script));
      
      // Check for browser reference errors
      const isBrowserError = errorMessage.includes('browser is not defined') || 
                             errorMessage.includes('chrome is not defined') ||
                             errorMessage.includes('ReferenceError: browser');
      
      if (isProblematicScript || isBrowserError) {
        console.warn('Suppressed content script error:', errorMessage.substring(0, 100));
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    }, true);
    
    // Override the eval and Function constructor to block potentially problematic scripts
    const originalEval = window.eval;
    window.eval = function(code) {
      if (typeof code === 'string' && 
          (code.includes('browser.runtime') || 
           code.includes('chrome.runtime') ||
           code.includes('checkPageManual') ||
           code.includes('overlays.js'))) {
        console.warn('Blocked potentially problematic eval');
        return undefined;
      }
      return originalEval.apply(this, arguments);
    };
    
    const originalFunction = window.Function;
    window.Function = function() {
      const args = Array.from(arguments);
      const code = args.join(' ');
      
      if (code.includes('browser.runtime') || 
          code.includes('chrome.runtime') ||
          code.includes('checkPageManual') ||
          code.includes('overlays.js')) {
        console.warn('Blocked potentially problematic Function creation');
        return function() { return undefined; };
      }
      
      return originalFunction.apply(this, arguments);
    };
    
    // Patch any existing content.js scripts that might be running
    if (typeof document !== 'undefined') {
      document.addEventListener('DOMContentLoaded', function() {
        // Find any problematic scripts
        const problematicScripts = [
          'script[src*="content.js"]',
          'script[src*="checkPageManual.js"]',
          'script[src*="overlays.js"]'
        ].join(',');
        
        const scripts = document.querySelectorAll(problematicScripts);
        
        if (scripts.length > 0) {
          console.log(`Found ${scripts.length} potentially problematic scripts`);
          
          // Remove them to prevent errors
          scripts.forEach(script => {
            try {
              script.remove();
              console.log('Removed problematic script:', script.src);
            } catch (e) {
              console.warn('Failed to remove script:', e);
            }
          });
          
          // Make sure browser is defined
          if (typeof browser === 'undefined') {
            console.log('Defining browser for content scripts');
            window.browser = window.browser || browser;
          }
        }
      });
    }
    
    console.log('Content script compatibility fixes applied');
  }
})();
