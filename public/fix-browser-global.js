/**
 * Fix for "browser is not defined" errors in content.js, checkPageManual.js, and overlays.js
 * These files are likely from browser extensions trying to run in a web context.
 * This script creates a global browser object to prevent those errors.
 */
(function() {
  // Execute this immediately
  console.log('Browser global fix executing immediately');
  
  // Make sure browser is defined globally
  if (typeof window !== 'undefined') {
    // First, define a minimal browser object
    if (!window.browser) {
      window.browser = {};
    }
    
    // Create comprehensive browser WebExtension API mock
    window.browser.runtime = window.browser.runtime || {
      sendMessage: function() { return Promise.resolve(); },
      onMessage: { 
        addListener: function() {},
        removeListener: function() {}
      },
      getManifest: function() { return {}; },
      getURL: function(path) { return path; },
      connect: function() { 
        return { 
          onDisconnect: { addListener: function() {} },
          postMessage: function() {},
          disconnect: function() {}
        }; 
      },
      onConnect: { addListener: function() {} },
      onInstalled: { addListener: function() {} },
      id: "dummy-extension-id"
    };
    
    // Storage API
    window.browser.storage = window.browser.storage || {
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
      },
      onChanged: { addListener: function() {} }
    };
    
    // Tabs API
    window.browser.tabs = window.browser.tabs || {
      query: function() { return Promise.resolve([]); },
      create: function() { return Promise.resolve({}); },
      update: function() { return Promise.resolve(); },
      getCurrent: function() { return Promise.resolve({id: 1}); },
      sendMessage: function() { return Promise.resolve(); },
      executeScript: function() { return Promise.resolve([]); },
      insertCSS: function() { return Promise.resolve(); },
      onUpdated: { addListener: function() {} },
      onActivated: { addListener: function() {} },
      onCreated: { addListener: function() {} },
      onRemoved: { addListener: function() {} }
    };
    
    // Windows API
    window.browser.windows = window.browser.windows || {
      getCurrent: function() { return Promise.resolve({id: 1}); },
      getAll: function() { return Promise.resolve([]); },
      create: function() { return Promise.resolve({id: 1}); },
      update: function() { return Promise.resolve({}); },
      onCreated: { addListener: function() {} },
      onRemoved: { addListener: function() {} },
      onFocusChanged: { addListener: function() {} }
    };
    
    // Web Request API
    window.browser.webRequest = window.browser.webRequest || {
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
      },
      onHeadersReceived: {
        addListener: function() {},
        removeListener: function() {}
      }
    };
    
    // Context Menus API
    window.browser.contextMenus = window.browser.contextMenus || {
      create: function() { return 1; },
      update: function() { return Promise.resolve(); },
      remove: function() { return Promise.resolve(); },
      removeAll: function() { return Promise.resolve(); },
      onClicked: { addListener: function() {} }
    };
    
    // i18n API
    window.browser.i18n = window.browser.i18n || {
      getMessage: function() { return ''; },
      getUILanguage: function() { return navigator.language || 'en-US'; },
      detectLanguage: function() { return Promise.resolve({ languages: [{ language: 'en', percentage: 100 }] }); }
    };
    
    // Extension API
    window.browser.extension = window.browser.extension || {
      getURL: function(path) { return path; },
      getViews: function() { return []; },
      getBackgroundPage: function() { return window; },
      isAllowedIncognitoAccess: function() { return Promise.resolve(false); }
    };
    
    // Add additional APIs as needed
    window.browser.notifications = window.browser.notifications || { 
      create: function() { return Promise.resolve(); }
    };
    
    window.browser.cookies = window.browser.cookies || {
      get: function() { return Promise.resolve(null); },
      getAll: function() { return Promise.resolve([]); },
      set: function() { return Promise.resolve(); },
      remove: function() { return Promise.resolve(); }
    };
    
    console.log('Browser WebExtension API polyfill loaded');
  }
})(); 