/**
 * This script automatically loads the award-points fix script and applies TypeScript declarations
 * for the window.awardPointsDirectly method.
 * 
 * How to use:
 * 1. Add this script to your HTML page: <script src="/award-points-fix-loader.js"></script>
 * 2. It will automatically load and apply the fix-405-error.js script
 */

(function() {
  console.log('🔄 Award Points Fix Loader - starting...');

  // Declare the global functions for TypeScript
  if (typeof window !== 'undefined') {
    // Add type declarations to Window interface
    window.awardPointsDirectly = window.awardPointsDirectly || async function(customerId, programId, points, description) {
      console.warn('Award points fix script not yet loaded - this is a placeholder function');
      return { success: false, error: 'Fix script not loaded' };
    };
    
    window.diagnosePossibleFixes = window.diagnosePossibleFixes || async function() {
      console.warn('Award points fix script not yet loaded - this is a placeholder function');
      return { success: false, error: 'Fix script not loaded' };
    };
  }

  // Function to load script dynamically
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    });
  }

  // Load the fix script
  loadScript('/fix-405-error.js')
    .then(() => {
      console.log('✅ Award points fix script loaded successfully');
      
      // Define a helper function to expose the award points method more directly in React components
      window.gudcityHelpers = window.gudcityHelpers || {};
      window.gudcityHelpers.awardPoints = async function(customerId, programId, points, description = '') {
        if (typeof window.awardPointsDirectly === 'function') {
          return await window.awardPointsDirectly(customerId, programId, points, description);
        } else {
          console.error('Award points fix script not properly loaded');
          return { success: false, error: 'Fix script not properly loaded' };
        }
      };
      
      // Add to window for debugging
      console.log('✅ Helper functions added to window.gudcityHelpers');
    })
    .catch((error) => {
      console.error('❌ Failed to load award points fix script:', error);
    });
})(); 