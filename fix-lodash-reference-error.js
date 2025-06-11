// This is a fix for the "Cannot access '_' before initialization" error in charts library
// The error occurs because the vendor-charts bundle is trying to access lodash (_) before it's initialized

// Solution 1: Ensure lodash is loaded before any chart libraries
document.addEventListener('DOMContentLoaded', function() {
  // Create a script element for lodash
  const lodashScript = document.createElement('script');
  lodashScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js';
  lodashScript.integrity = 'sha512-WFN04846sdKMIP5LKNphMaWzU7YpMyCU245etK3g/2ARYbPK9Ub18eG+ljU96qKRCWh+quCY7yefSmlkQw1ANQ==';
  lodashScript.crossOrigin = 'anonymous';
  lodashScript.referrerPolicy = 'no-referrer';
  
  // Only load chart libraries after lodash is loaded
  lodashScript.onload = function() {
    console.log('Lodash loaded successfully');
    
    // Now it's safe to load the chart libraries
    // You can add code here to dynamically load your chart libraries if needed
  };
  
  // Insert lodash script at the beginning of the head to ensure it loads first
  document.head.insertBefore(lodashScript, document.head.firstChild);
});

// Solution 2: Create a global _ variable immediately if it doesn't exist
// This can help in cases where the order can't be controlled
if (typeof window._ === 'undefined') {
  // Create a temporary placeholder until the real lodash loads
  window._ = {
    // Add minimal frequently used lodash methods if needed
    noop: function() {},
    isObject: function(obj) { return obj !== null && typeof obj === 'object'; },
    isFunction: function(f) { return typeof f === 'function'; },
    isEmpty: function(obj) { 
      return obj === null || obj === undefined || 
        (typeof obj === 'object' && Object.keys(obj).length === 0); 
    }
  };
}

// Instructions for implementation:
// 1. Add this script to the <head> section of your HTML, before any other scripts
// 2. Make sure it loads before vendor-charts-*.js
// 3. Alternatively, modify your build process to ensure lodash is bundled before chart libraries 