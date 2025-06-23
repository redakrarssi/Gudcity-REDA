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

/**
 * Enhanced browser polyfill for web extension compatibility
 * This provides a more complete implementation of the WebExtension browser API
 */

(function() {
  // Log that we're running the enhanced polyfill
  console.log('Running enhanced browser polyfill');

  // Create a more robust error handler for browser API errors
  function createRobustErrorHandler() {
    // Override window.onerror to catch and handle browser API errors
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // Check if this is a browser API error
      if (message && typeof message === 'string' && 
          (message.includes('browser is not defined') || 
           message.includes('chrome is not defined'))) {
        console.warn('Suppressed browser API error:', message);
        // Ensure browser is defined
        window.browser = window.browser || {};
        window.chrome = window.chrome || {};
        // Return true to indicate we've handled the error
        return true;
      }
      
      // If it's not a browser API error, call the original handler
      if (originalOnError) {
        return originalOnError.apply(this, arguments);
      }
    };
  }

  // Create a more complete browser API
  function createBrowserAPI() {
    // Create browser object if it doesn't exist
    window.browser = window.browser || {};
    
    // Runtime API
    window.browser.runtime = window.browser.runtime || {
      id: 'polyfill-extension-id',
      getURL: function(path) { return path; },
      getManifest: function() { 
        return { 
          version: '1.0.0',
          manifest_version: 2,
          name: 'Polyfilled Extension'
        }; 
      },
      connect: function(extensionId, connectInfo) {
        console.log('browser.runtime.connect polyfill called', extensionId, connectInfo);
        return {
          postMessage: function(message) {
            console.log('Port.postMessage polyfill called', message);
          },
          onMessage: {
            addListener: function(callback) {
              console.log('Port.onMessage.addListener polyfill called');
            },
            removeListener: function(callback) {
              console.log('Port.onMessage.removeListener polyfill called');
            }
          },
          onDisconnect: {
            addListener: function(callback) {
              console.log('Port.onDisconnect.addListener polyfill called');
            }
          },
          disconnect: function() {
            console.log('Port.disconnect polyfill called');
          }
        };
      },
      sendMessage: function(extensionId, message, options) {
        console.log('browser.runtime.sendMessage polyfill called', extensionId, message, options);
        // If the first argument isn't a string, shift arguments
        if (typeof extensionId !== 'string') {
          options = message;
          message = extensionId;
          extensionId = undefined;
        }
        return Promise.resolve({ success: true, polyfilled: true });
      },
      onMessage: {
        addListener: function(callback) {
          console.log('browser.runtime.onMessage.addListener polyfill called');
        },
        removeListener: function(callback) {
          console.log('browser.runtime.onMessage.removeListener polyfill called');
        }
      },
      onConnect: {
        addListener: function(callback) {
          console.log('browser.runtime.onConnect.addListener polyfill called');
        },
        removeListener: function(callback) {
          console.log('browser.runtime.onConnect.removeListener polyfill called');
        }
      },
      lastError: null
    };
    
    // Tabs API
    window.browser.tabs = window.browser.tabs || {
      query: function(queryInfo) {
        console.log('browser.tabs.query polyfill called', queryInfo);
        return Promise.resolve([{
          id: 1,
          url: window.location.href,
          title: document.title,
          active: true,
          windowId: 1
        }]);
      },
      sendMessage: function(tabId, message, options) {
        console.log('browser.tabs.sendMessage polyfill called', tabId, message, options);
        return Promise.resolve({ success: true, polyfilled: true });
      },
      create: function(createProperties) {
        console.log('browser.tabs.create polyfill called', createProperties);
        if (createProperties && createProperties.url) {
          window.open(createProperties.url, '_blank');
        }
        return Promise.resolve({ id: Math.floor(Math.random() * 1000) });
      },
      update: function(tabId, updateProperties) {
        console.log('browser.tabs.update polyfill called', tabId, updateProperties);
        if (updateProperties && updateProperties.url) {
          window.location.href = updateProperties.url;
        }
        return Promise.resolve({ id: tabId || 1 });
      },
      onUpdated: {
        addListener: function(callback) {
          console.log('browser.tabs.onUpdated.addListener polyfill called');
        },
        removeListener: function(callback) {
          console.log('browser.tabs.onUpdated.removeListener polyfill called');
        }
      }
    };
    
    // Storage API
    window.browser.storage = window.browser.storage || {
      local: {
        get: function(keys) {
          console.log('browser.storage.local.get polyfill called', keys);
          let result = {};
          if (localStorage) {
            if (keys === null) {
              // Get all items
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                try {
                  result[key] = JSON.parse(localStorage.getItem(key));
                } catch (e) {
                  result[key] = localStorage.getItem(key);
                }
              }
            } else if (Array.isArray(keys)) {
              // Get specific keys
              keys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value !== null) {
                  try {
                    result[key] = JSON.parse(value);
                  } catch (e) {
                    result[key] = value;
                  }
                }
              });
            } else if (typeof keys === 'string') {
              // Get a single key
              const value = localStorage.getItem(keys);
              if (value !== null) {
                try {
                  result[keys] = JSON.parse(value);
                } catch (e) {
                  result[keys] = value;
                }
              }
            } else if (typeof keys === 'object') {
              // Get specific keys
              Object.keys(keys).forEach(key => {
                const value = localStorage.getItem(key);
                if (value !== null) {
                  try {
                    result[key] = JSON.parse(value);
                  } catch (e) {
                    result[key] = value;
                  }
                } else {
                  result[key] = keys[key]; // Default value
                }
              });
            }
          }
          return Promise.resolve(result);
        },
        set: function(items) {
          console.log('browser.storage.local.set polyfill called', items);
          if (localStorage) {
            Object.keys(items).forEach(key => {
              localStorage.setItem(key, JSON.stringify(items[key]));
            });
          }
          return Promise.resolve();
        },
        remove: function(keys) {
          console.log('browser.storage.local.remove polyfill called', keys);
          if (localStorage) {
            if (Array.isArray(keys)) {
              keys.forEach(key => localStorage.removeItem(key));
            } else {
              localStorage.removeItem(keys);
            }
          }
          return Promise.resolve();
        },
        clear: function() {
          console.log('browser.storage.local.clear polyfill called');
          if (localStorage) {
            localStorage.clear();
          }
          return Promise.resolve();
        }
      },
      sync: {
        get: function(keys) {
          console.log('browser.storage.sync.get polyfill called', keys);
          // Just use local storage for the polyfill
          return window.browser.storage.local.get(keys);
        },
        set: function(items) {
          console.log('browser.storage.sync.set polyfill called', items);
          return window.browser.storage.local.set(items);
        },
        remove: function(keys) {
          console.log('browser.storage.sync.remove polyfill called', keys);
          return window.browser.storage.local.remove(keys);
        },
        clear: function() {
          console.log('browser.storage.sync.clear polyfill called');
          return window.browser.storage.local.clear();
        }
      },
      onChanged: {
        addListener: function(callback) {
          console.log('browser.storage.onChanged.addListener polyfill called');
        },
        removeListener: function(callback) {
          console.log('browser.storage.onChanged.removeListener polyfill called');
        }
      }
    };
    
    // Extension API
    window.browser.extension = window.browser.extension || {
      getURL: function(path) {
        console.log('browser.extension.getURL polyfill called', path);
        // If path starts with /, remove it
        if (path.startsWith('/')) {
          path = path.substring(1);
        }
        return path;
      },
      getBackgroundPage: function() {
        console.log('browser.extension.getBackgroundPage polyfill called');
        return Promise.resolve(window);
      },
      isAllowedIncognitoAccess: function() {
        console.log('browser.extension.isAllowedIncognitoAccess polyfill called');
        return Promise.resolve(false);
      }
    };
    
    // Windows API
    window.browser.windows = window.browser.windows || {
      create: function(createData) {
        console.log('browser.windows.create polyfill called', createData);
        if (createData && createData.url) {
          const win = window.open(createData.url, '_blank', 'width=800,height=600');
          return Promise.resolve({ id: Math.floor(Math.random() * 1000), win });
        }
        return Promise.resolve({ id: Math.floor(Math.random() * 1000) });
      },
      update: function(windowId, updateInfo) {
        console.log('browser.windows.update polyfill called', windowId, updateInfo);
        return Promise.resolve({ id: windowId });
      },
      get: function(windowId, getInfo) {
        console.log('browser.windows.get polyfill called', windowId, getInfo);
        return Promise.resolve({
          id: windowId || 1,
          focused: true,
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
          incognito: false,
          type: 'normal'
        });
      },
      getCurrent: function(getInfo) {
        console.log('browser.windows.getCurrent polyfill called', getInfo);
        return Promise.resolve({
          id: 1,
          focused: true,
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
          incognito: false,
          type: 'normal'
        });
      },
      getAll: function(getInfo) {
        console.log('browser.windows.getAll polyfill called', getInfo);
        return Promise.resolve([{
          id: 1,
          focused: true,
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
          incognito: false,
          type: 'normal'
        }]);
      },
      onCreated: {
        addListener: function(callback) {
          console.log('browser.windows.onCreated.addListener polyfill called');
        },
        removeListener: function(callback) {
          console.log('browser.windows.onCreated.removeListener polyfill called');
        }
      },
      onRemoved: {
        addListener: function(callback) {
          console.log('browser.windows.onRemoved.addListener polyfill called');
        },
        removeListener: function(callback) {
          console.log('browser.windows.onRemoved.removeListener polyfill called');
        }
      },
      onFocusChanged: {
        addListener: function(callback) {
          console.log('browser.windows.onFocusChanged.addListener polyfill called');
        },
        removeListener: function(callback) {
          console.log('browser.windows.onFocusChanged.removeListener polyfill called');
        }
      }
    };
    
    // Chrome compatibility
    window.chrome = window.chrome || {};
    window.chrome.runtime = window.browser.runtime;
    window.chrome.tabs = window.browser.tabs;
    window.chrome.storage = window.browser.storage;
    window.chrome.extension = window.browser.extension;
    window.chrome.windows = window.browser.windows;
  }

  // Special patch for specific problematic files
  function patchProblematicFiles() {
    // Create a function to patch specific module patterns
    const patchModulePattern = function() {
      // Patch the numeric module functions
      window['3'] = window['3'] || function() { return {}; };
      window['1230'] = window['1230'] || function() { return {}; };
      window['i'] = window['i'] || function() { return {}; };
      window['n'] = window['n'] || function() { return {}; };
      
      // Patch module.exports pattern
      if (typeof module === 'undefined') {
        window.module = { exports: {} };
      }
      
      // Create a dummy require function
      if (typeof require === 'undefined') {
        window.require = function(moduleName) {
          console.log('Polyfill require called for', moduleName);
          if (moduleName === 'webextension-polyfill') {
            return window.browser;
          }
          return {};
        };
      }
      
      // Patch specific error in checkPageManual.js
      const patchCheckPageManual = function() {
        try {
          // Find all script tags
          const scripts = document.querySelectorAll('script');
          for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            if (script.src && script.src.includes('checkPageManual.js')) {
              console.log('Found checkPageManual.js, applying patch');
              // Create a new script with our patched version
              const newScript = document.createElement('script');
              newScript.textContent = `
                // Patched checkPageManual.js
                window['3'] = function() { return {}; };
                window['1230'] = function() { return {}; };
                window['i'] = function() { return {}; };
                window.browser = window.browser || {};
                window.chrome = window.chrome || {};
              `;
              // Insert before the problematic script
              script.parentNode.insertBefore(newScript, script);
              break;
            }
          }
        } catch (e) {
          console.warn('Error patching checkPageManual.js:', e);
        }
      };
      
      // Patch specific error in overlays.js
      const patchOverlaysJs = function() {
        try {
          // Find all script tags
          const scripts = document.querySelectorAll('script');
          for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            if (script.src && script.src.includes('overlays.js')) {
              console.log('Found overlays.js, applying patch');
              // Create a new script with our patched version
              const newScript = document.createElement('script');
              newScript.textContent = `
                // Patched overlays.js
                window.n = function() { return {}; };
                window.browser = window.browser || {};
                window.chrome = window.chrome || {};
              `;
              // Insert before the problematic script
              script.parentNode.insertBefore(newScript, script);
              break;
            }
          }
        } catch (e) {
          console.warn('Error patching overlays.js:', e);
        }
      };
      
      // Patch specific error in content.js
      const patchContentJs = function() {
        try {
          // Find all script tags
          const scripts = document.querySelectorAll('script');
          for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            if (script.src && script.src.includes('content.js')) {
              console.log('Found content.js, applying patch');
              // Create a new script with our patched version
              const newScript = document.createElement('script');
              newScript.textContent = `
                // Patched content.js
                window.n = function() { return {}; };
                window.browser = window.browser || {};
                window.chrome = window.chrome || {};
              `;
              // Insert before the problematic script
              script.parentNode.insertBefore(newScript, script);
              break;
            }
          }
        } catch (e) {
          console.warn('Error patching content.js:', e);
        }
      };
      
      // Run all patches
      patchCheckPageManual();
      patchOverlaysJs();
      patchContentJs();
    };
    
    // Run the patch immediately
    patchModulePattern();
    
    // Also set up a MutationObserver to patch any dynamically added scripts
    try {
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.addedNodes && mutation.addedNodes.length) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
              const node = mutation.addedNodes[i];
              if (node.nodeName === 'SCRIPT') {
                // If a script is added, run our patches again
                setTimeout(patchModulePattern, 0);
                break;
              }
            }
          }
        });
      });
      
      // Start observing
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
      
      console.log('Set up MutationObserver for dynamic script patching');
    } catch (e) {
      console.warn('Error setting up MutationObserver:', e);
    }
  }

  // Patch for "Cannot use 'in' operator to search for 'rawData' in 16" error
  function patchInOperatorError() {
    // Override Array.prototype.map to catch and fix the error
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
          // Return a safe result instead of throwing
          return [];
        }
        throw error;
      }
    };
    
    // Create a global helper to safely check properties
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
    
    // Patch Object.prototype.hasOwnProperty to be safer
    const originalHasOwnProperty = Object.prototype.hasOwnProperty;
    Object.prototype.hasOwnProperty = function(prop) {
      try {
        return originalHasOwnProperty.call(this, prop);
      } catch (error) {
        if (error && error.message && error.message.includes("Cannot use 'in' operator")) {
          console.warn('Caught "in" operator error in hasOwnProperty, returning false');
          return false;
        }
        throw error;
      }
    };
    
    console.log('Patched Array.map and Object.hasOwnProperty for "in" operator errors');
  }

  // Run all our patches
  createRobustErrorHandler();
  createBrowserAPI();
  patchProblematicFiles();
  patchInOperatorError();
  
  // Signal that the polyfill is loaded
  window.__BROWSER_POLYFILL_LOADED__ = true;
  
  console.log('Enhanced browser polyfill loaded successfully');
})(); 