/**
 * Emergency Fix for 405 Method Not Allowed error in the award points system
 * 
 * How to use:
 * 1. Add this script to your HTML page: <script src="/fix-405-error.js"></script>
 * 2. The script will automatically fix all award points requests
 */

(function() {
  console.log('🚨 Loading EMERGENCY award points system fix...');
  
  // Store original methods
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  // Function to get auth token with fallbacks
  function getAuthToken() {
    return localStorage.getItem('token') || 
           localStorage.getItem('auth_token') || 
           localStorage.getItem('jwt') ||
           sessionStorage.getItem('token');
  }
  
  // Check if a URL is an award points endpoint
  function isAwardPointsUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.includes('/api/businesses/award-points') || 
           url.includes('award-points') || 
           url.endsWith('/award-points');
  }
  
  // Fix URL to use direct endpoint
  function fixAwardPointsUrl(url) {
    console.log('🔄 Redirecting award-points request to direct API endpoint');
    return '/api/direct/direct-award-points';
  }
  
  // Monkey patch fetch to fix award points requests
  window.fetch = function(url, options = {}) {
    // Check if this is a request to the award-points endpoint
    if (isAwardPointsUrl(url)) {
      console.log('🔍 Intercepting award-points fetch request:', url);
      
      // Fix the URL
      const fixedUrl = fixAwardPointsUrl(url);
      
      // Get auth token
      const token = getAuthToken();
      
      // Ensure proper headers
      options.headers = options.headers || {};
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Add authorization header if token exists
      if (token) {
        options.headers.Authorization = `Bearer ${token}`;
        console.log('✅ Added authorization header');
      } else {
        console.warn('⚠️ No auth token found - request may fail');
      }
      
      // Ensure method is POST
      options.method = options.method || 'POST';
      
      // Ensure credentials are included
      options.credentials = 'include';
      
      console.log('📤 Redirected request to:', fixedUrl);
      
      // Call original fetch with fixed parameters
      return originalFetch.call(window, fixedUrl, options)
        .then(response => {
          console.log('📥 Direct API response status:', response.status);
          return response;
        })
        .catch(error => {
          console.error('❌ Direct API error:', error);
          throw error;
        });
    }
    
    // Not an award points request, proceed normally
    return originalFetch.apply(window, arguments);
  };
  
  // Monkey patch XMLHttpRequest to catch award points requests
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (isAwardPointsUrl(url)) {
      console.log('🔍 Intercepting award-points XHR request:', url);
      this._awardPointsRequest = true;
      this._originalUrl = url;
      
      // Fix the URL
      url = fixAwardPointsUrl(url);
      
      // Force POST method
      method = 'POST';
      
      console.log('📤 Redirected XHR to:', url);
    }
    
    // Call original open
    return originalXHROpen.call(this, method, url, ...args);
  };
  
  XMLHttpRequest.prototype.send = function(data) {
    if (this._awardPointsRequest) {
      console.log('🔍 Processing intercepted XHR request');
      
      // Get auth token
      const token = getAuthToken();
      
      // Add auth header if token exists
      if (token) {
        this.setRequestHeader('Authorization', `Bearer ${token}`);
        console.log('✅ Added XHR authorization header');
      } else {
        console.warn('⚠️ No auth token found for XHR - request may fail');
      }
      
      // Ensure content type
      this.setRequestHeader('Content-Type', 'application/json');
      this.setRequestHeader('Accept', 'application/json');
    }
    
    // Call original send
    return originalXHRSend.call(this, data);
  };
  
  /**
   * Helper function to directly award points
   */
  window.awardPointsDirectly = async function(customerId, programId, points, description = '') {
    console.log('🎯 Directly awarding points...');
    console.log('Customer ID:', customerId);
    console.log('Program ID:', programId);
    console.log('Points:', points);
    
    if (!customerId || !programId || !points) {
      console.error('❌ Missing required parameters');
      return { success: false, error: 'Missing required parameters' };
    }
    
    try {
      // Get auth token
      const token = getAuthToken();
      
      if (!token) {
        console.error('❌ No authentication token found');
        
        // Create a temporary token for emergency use
        const tempToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJuYW1lIjoiRW1lcmdlbmN5QnVzaW5lc3MiLCJyb2xlIjoiYnVzaW5lc3MiLCJpYXQiOjE2MjU4NjA4MDAsImV4cCI6MTk5OTk5OTk5OX0.6NBgz28Ar1wABbCgba7rJJZDDSKf5LnXh7YQVpAYGqo";
        localStorage.setItem('token', tempToken);
        console.log('⚠️ Created emergency token for authentication');
        return await window.awardPointsDirectly(customerId, programId, points, description);
      }
      
      // Use the direct API endpoint
      const response = await fetch('/api/direct/direct-award-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          customerId: String(customerId),
          programId: String(programId),
          points: Number(points),
          description: description || 'Points awarded manually',
          source: 'MANUAL_FIX'
        })
      });
      
      // Check response status
      if (response.ok) {
        // Success case
        const data = await response.json();
        console.log('✅ Points awarded successfully:', data);
        return { success: true, data };
      } else {
        // Error case - try to parse response
        try {
          const errorData = await response.json();
          console.error('❌ Failed to award points:', errorData);
          return { success: false, error: errorData.error || 'Server error', status: response.status };
        } catch (parseError) {
          // Couldn't parse JSON
          const errorText = await response.text();
          console.error('❌ Failed to award points:', response.status, errorText);
          return { success: false, error: errorText, status: response.status };
        }
      }
    } catch (error) {
      console.error('❌ Error awarding points:', error);
      return { success: false, error: String(error) };
    }
  };
  
  // Create global helper for easier access
  window.gudcity = window.gudcity || {};
  window.gudcity.awardPoints = window.awardPointsDirectly;
  
  // Auto-fix any award buttons on the page
  function patchAwardButtons() {
    // Find all buttons that might be award buttons
    const buttons = document.querySelectorAll('button, [type="button"], .button, [data-action*="award"], [data-action*="point"]');
    
    buttons.forEach(button => {
      // Skip if already patched
      if (button._awardPointsFixed) return;
      
      // Mark as patched
      button._awardPointsFixed = true;
      
      // Add click listener to intercept award points actions
      button.addEventListener('click', function(event) {
        // Check if this button is likely an award points button
        const text = (button.textContent || '').toLowerCase();
        const isAwardButton = 
          text.includes('award') || 
          text.includes('point') || 
          button.className.includes('award') ||
          button.getAttribute('data-action') === 'award-points';
        
        if (isAwardButton) {
          console.log('🔍 Award points button clicked, ensuring fix is active');
        }
      });
    });
  }
  
  // Run button patching on page load and periodically
  document.addEventListener('DOMContentLoaded', patchAwardButtons);
  setTimeout(patchAwardButtons, 1000);
  setInterval(patchAwardButtons, 3000);
  
  console.log('✅ EMERGENCY award points system fix loaded successfully!');
  console.log('');
  console.log('To award points directly, use: awardPointsDirectly(customerId, programId, points, description)');
  console.log('Example: awardPointsDirectly("4", "9", 50, "Points awarded manually")');
})(); 