// Polyfill loader to handle errors gracefully
(function() {
  console.log('Polyfill loader started');

  // Set browser polyfill immediately to prevent errors
  if (typeof window !== 'undefined' && !window.browser) {
    window.browser = {
      runtime: { 
        sendMessage: function() { return Promise.resolve(); }, 
        onMessage: { addListener: function() {}, removeListener: function() {} },
        getManifest: function() { return {}; },
        getURL: function(path) { return path; }
      },
      storage: { 
        local: { 
          get: function() { return Promise.resolve({}); }, 
          set: function() { return Promise.resolve(); }, 
          remove: function() { return Promise.resolve(); } 
        }
      },
      tabs: {
        query: function() { return Promise.resolve([]); }
      }
    };
    console.log('Emergency browser polyfill applied');
  }

  // Order matters - load browser-related polyfills first
  const requiredPolyfills = [
    'fix-browser-global.js',  // This should always be first
    'browser-polyfill.js',
    'charts-fix-latest.js',
    'lodash-preload.js',
    'charts-lodash-fix.js'
  ];

  function loadPolyfill(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false; // Ensure scripts load in order
      script.onload = () => {
        console.log(`Loaded ${src} successfully`);
        resolve();
      };
      script.onerror = () => {
        console.warn(`Failed to load ${src}, applying fallback`);
        
        // Apply minimal fallbacks for critical functionality
        if (src.includes('lodash')) {
          window._ = window._ || {
            noop: function() {},
            identity: function(value) { return value; },
            isObject: function(obj) { return obj !== null && typeof obj === 'object'; },
            isFunction: function(f) { return typeof f === 'function'; },
            isArray: Array.isArray
          };
        }
        
        resolve(); // Resolve anyway to continue loading
      };
      document.head.appendChild(script);
    });
  }

  async function loadAllPolyfills() {
    for (const polyfill of requiredPolyfills) {
      await loadPolyfill(polyfill);
    }
    console.log('Polyfill loading completed');
  }

  // Start loading immediately
  loadAllPolyfills();
})(); 