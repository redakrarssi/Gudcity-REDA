/**
 * Direct patch for problematic content scripts
 * This script targets specific files that are causing errors:
 * - content.js
 * - checkPageManual.js
 * - overlays.js
 */

(function() {
  console.log('Content script patch loading');
  
  // Create global polyfills for module pattern functions
  window['3'] = function() { return {}; };
  window['1230'] = function() { return {}; };
  window['i'] = function() { return {}; };
  window['n'] = function() { return {}; };
  
  // Create browser API if needed
  window.browser = window.browser || {
    runtime: {
      sendMessage: function() { return Promise.resolve(); },
      connect: function() { 
        return {
          postMessage: function() {},
          onMessage: { addListener: function() {} },
          onDisconnect: { addListener: function() {} }
        };
      },
      onMessage: { 
        addListener: function() {}, 
        removeListener: function() {} 
      },
      lastError: null
    }
  };
  
  // Create chrome API if needed
  window.chrome = window.chrome || { 
    runtime: window.browser.runtime 
  };
  
  // Function to inject script directly into page
  function injectScript(code) {
    try {
      const script = document.createElement('script');
      script.textContent = code;
      (document.head || document.documentElement).appendChild(script);
      script.remove(); // Script tags execute even when removed immediately
    } catch (e) {
      console.error('Error injecting script:', e);
    }
  }
  
  // Patch for content.js
  function patchContentJs() {
    injectScript(`
      // Patch for content.js
      window.browser = window.browser || {};
      window.chrome = window.chrome || {};
      window.browser.runtime = window.browser.runtime || {};
      window.chrome.runtime = window.chrome.runtime || {};
      
      // Module pattern functions
      window['3'] = function() { return {}; };
      window['1230'] = function() { return {}; };
      window['i'] = function() { return {}; };
      window['n'] = function() { return {}; };
      
      // Override fetch for extension resources
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        if (typeof url === 'string' && url.includes('extension://')) {
          console.log('Intercepted fetch for extension resource:', url);
          return Promise.resolve(new Response('{}', {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
        return originalFetch.apply(this, arguments);
      };
      
      console.log('Content.js patch applied');
    `);
  }
  
  // Patch for checkPageManual.js
  function patchCheckPageManual() {
    injectScript(`
      // Patch for checkPageManual.js
      window.browser = window.browser || {};
      window.chrome = window.chrome || {};
      
      // Module pattern functions
      window['3'] = function() { return {}; };
      window['1230'] = function() { return {}; };
      window['i'] = function() { return {}; };
      window['n'] = function() { return {}; };
      
      console.log('CheckPageManual.js patch applied');
    `);
  }
  
  // Patch for overlays.js
  function patchOverlaysJs() {
    injectScript(`
      // Patch for overlays.js
      window.browser = window.browser || {};
      window.chrome = window.chrome || {};
      
      // Module pattern functions
      window.n = function() { return {}; };
      
      console.log('Overlays.js patch applied');
    `);
  }
  
  // Patch for "Cannot use 'in' operator" error
  function patchInOperatorError() {
    injectScript(`
      // Patch for "Cannot use 'in' operator to search for 'rawData' in 16" error
      
      // Safe property check helper
      window.safeHasProperty = function(obj, prop) {
        if (obj === null || obj === undefined || typeof obj !== 'object') {
          return false;
        }
        try {
          return prop in obj;
        } catch (e) {
          return false;
        }
      };
      
      // Make Array.prototype.map safer
      const originalArrayMap = Array.prototype.map;
      Array.prototype.map = function(callback) {
        if (this === null || this === undefined) {
          throw new TypeError('Array.prototype.map called on null or undefined');
        }
        
        try {
          return originalArrayMap.apply(this, arguments);
        } catch (error) {
          if (error && error.message && error.message.includes("Cannot use 'in' operator")) {
            console.warn('Caught "in" operator error in Array.map, returning safe result');
            return [];
          }
          throw error;
        }
      };
      
      console.log('In operator error patch applied');
    `);
  }
  
  // Execute all patches
  patchContentJs();
  patchCheckPageManual();
  patchOverlaysJs();
  patchInOperatorError();
  
  // Set up a MutationObserver to detect when scripts are added
  try {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes) {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.tagName === 'SCRIPT') {
              const src = node.src || '';
              if (src.includes('content.js')) {
                console.log('Detected content.js being added, applying patch');
                patchContentJs();
              } else if (src.includes('checkPageManual.js')) {
                console.log('Detected checkPageManual.js being added, applying patch');
                patchCheckPageManual();
              } else if (src.includes('overlays.js')) {
                console.log('Detected overlays.js being added, applying patch');
                patchOverlaysJs();
              }
              
              // Always patch the in operator error
              patchInOperatorError();
            }
          }
        }
      });
    });
    
    // Start observing the document
    observer.observe(document, {
      childList: true,
      subtree: true
    });
    
    console.log('Set up MutationObserver for script detection');
  } catch (e) {
    console.warn('Error setting up MutationObserver:', e);
  }
  
  // Create a global error handler
  window.addEventListener('error', function(event) {
    if (event && event.error && event.error.message) {
      const errorMsg = event.error.message;
      
      // Handle browser API errors
      if (errorMsg.includes('browser is not defined') || 
          errorMsg.includes('chrome is not defined')) {
        console.warn('Caught browser API error:', errorMsg);
        event.preventDefault();
        event.stopPropagation();
        
        // Re-apply patches
        patchContentJs();
        patchCheckPageManual();
        patchOverlaysJs();
        
        return true;
      }
      
      // Handle "in" operator errors
      if (errorMsg.includes("Cannot use 'in' operator")) {
        console.warn('Caught "in" operator error:', errorMsg);
        event.preventDefault();
        event.stopPropagation();
        
        // Re-apply patch
        patchInOperatorError();
        
        return true;
      }
    }
  }, true);
  
  console.log('Content script patch loaded successfully');
})(); 