// Polyfill loader to handle errors gracefully
(function() {
  const requiredPolyfills = [
    'charts-fix-latest.js',
    'fix-browser-global.js',
    'browser-polyfill.js',
    'lodash-preload.js',
    'charts-lodash-fix.js'
  ];

  function loadPolyfill(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
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

  loadAllPolyfills();
})(); 