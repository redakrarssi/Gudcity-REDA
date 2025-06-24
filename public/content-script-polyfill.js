/**
 * Content script polyfill
 * This ensures the browser API is available in content scripts
 */

(function() {
  // Define a global browser object for content scripts
  const browserPolyfill = {
    // Basic extension API structure
    runtime: {
      sendMessage: function() {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          return chrome.runtime.sendMessage.apply(chrome.runtime, arguments);
        }
        console.warn('Browser runtime API not available in content script');
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

  // Define browser globally for content scripts
  try {
    // First try to use window
    if (typeof window !== 'undefined') {
      if (!window.browser) {
        window.browser = browserPolyfill;
      }
    }
    
    // Then try globalThis
    if (typeof globalThis !== 'undefined') {
      if (!globalThis.browser) {
        globalThis.browser = browserPolyfill;
      }
    }
    
    // Finally, try global
    if (typeof global !== 'undefined') {
      if (!global.browser) {
        global.browser = browserPolyfill;
      }
    }
    
    // If we're in a content script context, define it directly
    if (typeof browser === 'undefined') {
      this.browser = browserPolyfill;
    }
    
    console.log('Content script browser polyfill applied');
  } catch (error) {
    console.warn('Error applying content script browser polyfill:', error);
  }

  // List of problematic script patterns to catch
  const problematicScripts = [
    'content.js',
    'checkPageManual.js',
    'overlays.js',
    'adblock',
    'extension'
  ];
  
  // Function to check if a script is problematic
  function isProblematicScript(src) {
    if (!src) return false;
    return problematicScripts.some(pattern => src.includes(pattern));
  }
  
  // Create a mutation observer to monitor for dynamically added scripts
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            // Check if the added node is a script
            if (node.tagName === 'SCRIPT') {
              const src = node.src || '';
              
              // Check if the script is problematic
              if (isProblematicScript(src)) {
                console.warn('Removing problematic script:', src);
                node.remove();
              }
              
              // Check for inline scripts with problematic content
              if (node.textContent && 
                 (node.textContent.includes('browser.runtime') || 
                  node.textContent.includes('chrome.runtime') ||
                  node.textContent.includes('checkPageManual') ||
                  node.textContent.includes('overlays.js'))) {
                console.warn('Removing problematic inline script');
                node.remove();
              }
            }
          }
        }
      }
    });
    
    // Start observing the document
    observer.observe(document.documentElement, { 
      childList: true, 
      subtree: true 
    });
    
    console.log('Content script monitor active');
    
    // Cleanup existing problematic scripts on load
    document.addEventListener('DOMContentLoaded', () => {
      // Find and remove any existing problematic scripts
      document.querySelectorAll('script').forEach(script => {
        const src = script.src || '';
        if (isProblematicScript(src)) {
          console.warn('Removing existing problematic script:', src);
          script.remove();
        }
      });
    });
  }
  
  // Block attempts to create problematic scripts programmatically
  if (typeof document !== 'undefined') {
    // Save original createElement method
    const originalCreateElement = document.createElement;
    
    // Override createElement to intercept script creation
    document.createElement = function(tagName) {
      const element = originalCreateElement.apply(document, arguments);
      
      // If creating a script element, watch for problematic src assignments
      if (tagName.toLowerCase() === 'script') {
        // Override the src setter
        const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
        Object.defineProperty(element, 'src', {
          set: function(value) {
            if (isProblematicScript(value)) {
              console.warn('Blocked setting src for problematic script:', value);
              return '';
            }
            return originalSrcDescriptor.set.call(this, value);
          },
          get: originalSrcDescriptor.get
        });
      }
      
      return element;
    };
  }

  // Monitor error events from problematic sources
  window.addEventListener('error', function(event) {
    const src = event.filename || '';
    if (isProblematicScript(src)) {
      console.warn('Suppressed error from problematic script:', src);
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);
})(); 