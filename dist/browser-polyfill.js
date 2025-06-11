/**
 * Browser API polyfill
 * This script provides a fallback for browser extension APIs
 */
(function() {
  // Make sure browser is defined globally first thing
  // This helps prevent "browser is not defined" errors in other scripts
  window.browser = window.browser || {};
  
  // Define all browser extension APIs that might be accessed
  window.browser = {
    // Add empty implementation of common browser extension APIs
    runtime: {
      sendMessage: function() { return Promise.resolve(); },
      onMessage: { 
        addListener: function() {},
        removeListener: function() {}
      },
      getManifest: function() { return {}; },
      getURL: function(path) { return path; },
      connect: function() { return { onDisconnect: { addListener: function() {} } }; },
      onConnect: { addListener: function() {} }
    },
    storage: {
      local: {
        get: function() { return Promise.resolve({}); },
        set: function() { return Promise.resolve(); },
        remove: function() { return Promise.resolve(); },
        clear: function() { return Promise.resolve(); }
      },
      sync: {
        get: function() { return Promise.resolve({}); },
        set: function() { return Promise.resolve(); },
        remove: function() { return Promise.resolve(); },
        clear: function() { return Promise.resolve(); }
      },
      session: {
        get: function() { return Promise.resolve({}); },
        set: function() { return Promise.resolve(); },
        remove: function() { return Promise.resolve(); }
      }
    },
    tabs: {
      query: function() { return Promise.resolve([]); },
      create: function() { return Promise.resolve({}); },
      update: function() { return Promise.resolve(); },
      getCurrent: function() { return Promise.resolve({id: 1}); },
      sendMessage: function() { return Promise.resolve(); },
      onUpdated: { addListener: function() {} },
      onActivated: { addListener: function() {} }
    },
    windows: {
      getCurrent: function() { return Promise.resolve({id: 1}); },
      getAll: function() { return Promise.resolve([]); },
      create: function() { return Promise.resolve({id: 1}); }
    },
    webRequest: {
      onBeforeRequest: { addListener: function() {} },
      onCompleted: { addListener: function() {} },
      onErrorOccurred: { addListener: function() {} }
    },
    contextMenus: {
      create: function() { return 1; },
      update: function() { return Promise.resolve(); },
      remove: function() { return Promise.resolve(); },
      removeAll: function() { return Promise.resolve(); }
    },
    i18n: {
      getMessage: function() { return ''; }
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
})(); 