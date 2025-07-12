/**
 * Fix for the 405 Method Not Allowed error with award points
 * 
 * This script automatically intercepts requests to the award-points endpoint
 * and ensures they have the correct headers, method, and format
 */

(function() {
  console.log('📢 Loading award points fix...');

  // Store original fetch
  const originalFetch = window.fetch;
  
  // Helper to get the auth token
  function getAuthToken() {
    return localStorage.getItem('token') || 
           localStorage.getItem('auth_token') || 
           sessionStorage.getItem('token');
  }
  
  // Override fetch to intercept and fix award points requests
  window.fetch = function(url, options = {}) {
    // Check if this is an award points request
    if (typeof url === 'string' && url.includes('/api/businesses/award-points')) {
      console.log('🔍 Intercepting award points request:', url);
      
      // Ensure options object exists and has proper structure
      options = options || {};
      options.method = 'POST'; // Force POST method
      options.headers = options.headers || {};
      
      // Set content type if not already set
      if (!options.headers['Content-Type'] && !options.headers['content-type']) {
        options.headers['Content-Type'] = 'application/json';
      }
      
      // Set accept header if not already set
      if (!options.headers['Accept'] && !options.headers['accept']) {
        options.headers['Accept'] = 'application/json';
      }
      
      // Add auth token if not already set
      const token = getAuthToken();
      if (token && !options.headers['Authorization'] && !options.headers['authorization']) {
        options.headers['Authorization'] = `Bearer ${token}`;
        console.log('✅ Added authorization token');
      }
      
      // Ensure body is properly formatted
      if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        try {
          options.body = JSON.stringify(options.body);
          console.log('✅ Formatted request body as JSON');
        } catch (e) {
          console.error('❌ Failed to stringify body:', e);
        }
      }
      
      console.log('📤 Sending fixed request:', {
        url,
        method: options.method,
        headers: Object.keys(options.headers)
      });
    }
    
    // Call original fetch with potentially modified options
    return originalFetch.call(this, url, options);
  };

  // Helper function to directly award points
  window.awardPointsDirectly = async function(customerId, programId, points, description = '') {
    console.log('🎯 Directly awarding points');
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
        return { success: false, error: 'Authentication token required' };
      }
      
      // Use either the direct API or standard API
      const endpoint = '/api/businesses/award-points';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: String(customerId),
          programId: String(programId),
          points: Number(points),
          description: description || 'Points awarded manually',
          source: 'MANUAL'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Points awarded successfully:', data);
        return { success: true, data };
      } else {
        // Try to get error details
        try {
          const errorData = await response.json();
          console.error('❌ Failed to award points:', errorData);
          return { success: false, error: errorData.error || errorData.message || 'Unknown error', status: response.status };
        } catch (parseError) {
          const errorText = await response.text();
          console.error('❌ Failed to award points:', response.status, errorText);
          return { success: false, error: errorText || `Error ${response.status}`, status: response.status };
        }
      }
    } catch (error) {
      console.error('❌ Error awarding points:', error);
      return { success: false, error: String(error) };
    }
  };

  // Attach to window object for easy access
  window.awardPoints = window.awardPointsDirectly;
  
  console.log('✅ Award points fix loaded successfully');
  console.log('💡 Use awardPointsDirectly(customerId, programId, points, description) to award points');
})(); 