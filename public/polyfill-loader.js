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
    '/fix-browser-global.js',  // This should always be first
    '/browser-polyfill.js',
    '/charts-fix-latest.js',
    '/lodash-preload.js',
    '/charts-lodash-fix.js'
  ];

  function loadPolyfill(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      
      // Ensure we have leading slash for root-based paths
      script.src = src.startsWith('/') ? src : `/${src}`;
      
      script.async = false; // Ensure scripts load in order
      script.onload = () => {
        console.log(`Loaded ${src} successfully`);
        resolve();
      };
      script.onerror = (e) => {
        console.warn(`Failed to load ${src}, applying fallback`, e);
        
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
        
        // For browser polyfill failures
        if (src.includes('browser')) {
          window.browser = window.browser || {
            runtime: { 
              sendMessage: function() { return Promise.resolve(); },
              onMessage: { addListener: function() {} }
            }
          };
        }
        
        resolve(); // Resolve anyway to continue loading
      };
      document.head.appendChild(script);
    });
  }

  async function loadAllPolyfills() {
    for (const polyfill of requiredPolyfills) {
      try {
        await loadPolyfill(polyfill);
      } catch (err) {
        console.error(`Error loading polyfill ${polyfill}:`, err);
        // Continue with next polyfill despite errors
      }
    }
    console.log('Polyfill loading completed');
  }

  // Start loading immediately
  loadAllPolyfills();
})(); 