/**
 * Fix for 405 Method Not Allowed error in the award points system
 * 
 * How to use:
 * 1. Add this script to your HTML page: <script src="/fix-405-error.js"></script>
 * 2. The script will automatically patch the fetch requests to include proper Authorization headers
 */

(function() {
  console.log('🔧 Loading award points system fix...');
  
  // Original fetch function
  const originalFetch = window.fetch;
  
  // Function to get auth token
  function getAuthToken() {
    return localStorage.getItem('token');
  }
  
  // Monkey patch fetch to fix award points requests
  window.fetch = function(url, options) {
    // Check if this is a request to the award-points endpoint
    if (url && typeof url === 'string' && url.includes('/api/businesses/award-points')) {
      console.log('🔍 Intercepting award-points request');
      
      // Redirect to direct API endpoint which works correctly
      if (url === '/api/businesses/award-points' || url === 'api/businesses/award-points') {
        url = '/api/direct/direct-award-points';
        console.log('✅ Redirected to:', url);
      }
      
      // Get auth token
      const token = getAuthToken();
      if (!token) {
        console.warn('⚠️ No auth token found in localStorage');
      }
      
      // Ensure proper headers
      if (options) {
        options.headers = {
          ...(options.headers || {}),
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        
        // Add authorization header if token exists
        if (token) {
          options.headers['Authorization'] = `Bearer ${token}`;
          console.log('✅ Added authorization header');
        }
        
        // Ensure credentials are included
        options.credentials = 'same-origin';
        console.log('✅ Added proper headers and credentials');
      } else {
        // If no options provided, create them
        options = {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'same-origin'
        };
        
        // Add authorization header if token exists
        if (token) {
          options.headers['Authorization'] = `Bearer ${token}`;
        }
      }
      
      // Log the request details
      console.log('📤 Request URL:', url);
      console.log('📤 Request method:', options?.method);
    }
    
    // Call original fetch with fixed parameters
    return originalFetch.call(window, url, options);
  };
  
  /**
   * Helper function to directly award points without going through the UI
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
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No authentication token found in localStorage');
        return { success: false, error: 'No authentication token found' };
      }
      
      // Use the direct API endpoint instead
      const response = await fetch('/api/direct/direct-award-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          customerId,
          programId,
          points,
          description,
          source: 'MANUAL'
        })
      });
      
      // Check if the request was successful
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Points awarded successfully:', data);
        return { success: true, data };
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to award points:', response.status, errorText);
        return { success: false, error: errorText, status: response.status };
      }
    } catch (error) {
      console.error('❌ Error awarding points:', error);
      return { success: false, error: String(error) };
    }
  };
  
  // Patch any existing buttons for award points
  setTimeout(() => {
    try {
      const awardButtons = document.querySelectorAll('[data-action="award-points"]');
      if (awardButtons.length > 0) {
        console.log(`📎 Patching ${awardButtons.length} award buttons...`);
        awardButtons.forEach(button => {
          button.addEventListener('click', (e) => {
            console.log('🔄 Award button clicked, applying fix...');
          });
        });
      }
    } catch (e) {
      // Ignore errors
    }
  }, 1000);
  
  console.log('✅ Award points system fix loaded successfully!');
  console.log('');
  console.log('To award points directly, use the following function:');
  console.log('awardPointsDirectly(customerId, programId, points, description)');
  console.log('');
  console.log('Example:');
  console.log('awardPointsDirectly("4", "9", 10, "Points awarded manually")');
})(); 