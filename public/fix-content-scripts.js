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
        },
        getManifest: function() { return {}; },
        getURL: function(path) { return path; },
        lastError: null
      },
      tabs: {
        sendMessage: function() { return Promise.resolve(); },
        query: function() { return Promise.resolve([]); },
        create: function() { return Promise.resolve({}); },
        executeScript: function() { return Promise.resolve([]); }
      },
      storage: {
        local: { 
          get: function() { return Promise.resolve({}); },
          set: function() { return Promise.resolve({}); }
        },
        sync: { 
          get: function() { return Promise.resolve({}); },
          set: function() { return Promise.resolve({}); }
        }
      },
      extension: {
        getURL: function(path) { return path; },
        getBackgroundPage: function() { return Promise.resolve(window); }
      },
      webRequest: {
        onBeforeRequest: { addListener: function() {} },
        onCompleted: { addListener: function() {} }
      },
      i18n: {
        getMessage: function() { return ''; },
        getUILanguage: function() { return 'en-US'; }
      },
      permissions: {
        contains: function() { return Promise.resolve(true); },
        request: function() { return Promise.resolve(true); }
      }
    };
    
    // Apply the content script API properties
    for (const key in contentScriptAPI) {
      window.browser[key] = window.browser[key] || contentScriptAPI[key];
    }
    
    // Chrome compatibility (used by many content scripts)
    window.chrome = window.chrome || {};
    window.chrome.runtime = window.chrome.runtime || window.browser.runtime;
    window.chrome.storage = window.chrome.storage || window.browser.storage;
    window.chrome.tabs = window.chrome.tabs || window.browser.tabs;
    window.chrome.extension = window.chrome.extension || window.browser.extension;
    
    // Flags that can be used to detect polyfilled environment
    window.__CONTENT_SCRIPT_HOST__ = true;
    window.__BROWSER_POLYFILL__ = true;

    // Special error capture specifically for content script errors
    window.addEventListener('error', function(event) {
      if (event && event.error && event.error.message && 
          (event.error.message.includes('browser is not defined') || 
           event.error.message.includes('chrome is not defined'))) {
        console.warn('Content script polyfill: Suppressed browser API error:', event.error.message);
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    }, true);
    
    // Observer to ensure browser definitions exist when dynamic scripts load
    const observer = new MutationObserver(function(mutations) {
      for (let mutation of mutations) {
        if (mutation.type === 'childList') {
          for (let node of mutation.addedNodes) {
            if (node.nodeName === 'SCRIPT') {
              // Ensure browser is defined before script execution
              if (!window.browser) {
                console.warn('Content script polyfill: Detected script insertion without browser defined');
                // Restore polyfill if somehow removed
                window.browser = contentScriptAPI;
                window.chrome = window.chrome || {};
                window.chrome.runtime = window.chrome.runtime || window.browser.runtime;
                window.chrome.storage = window.chrome.storage || window.browser.storage;
                window.chrome.tabs = window.chrome.tabs || window.browser.tabs;
              }
            }
          }
        }
      }
    });

    // Watch for added scripts
    observer.observe(document.documentElement, { 
      childList: true,
      subtree: true
    });

    console.log('Content script fixes applied');
  }
})();
