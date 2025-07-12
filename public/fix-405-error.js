/**
 * Fix for 405 Method Not Allowed error in the award points system
 * 
 * How to use:
 * 1. Add this script to your HTML page: <script src="/fix-405-error.js"></script>
 * 2. The script will automatically patch the fetch requests to include proper Authorization headers
 */

(function() {
  console.log('🔧 Loading award points system fix - Enhanced Version...');
  
  // Original fetch function
  const originalFetch = window.fetch;
  
  // Function to get auth token with multiple fallbacks
  function getAuthToken() {
    return localStorage.getItem('token') || 
           localStorage.getItem('auth_token') || 
           localStorage.getItem('jwt') ||
           sessionStorage.getItem('token');
  }
  
  // Monkey patch fetch to fix award points requests
  window.fetch = function(url, options) {
    // Check if this is a request to the award-points endpoint
    if (url && typeof url === 'string' && url.includes('/award-points')) {
      console.log('🔍 Intercepting award-points request');
      
      // Fix the URL if needed
      if (url === '/api/businesses/award-points' || url === 'api/businesses/award-points') {
        url = '/api/businesses/award-points';
        console.log('✅ Fixed URL:', url);
      }
      
      // Ensure options object exists
      options = options || {};
      
      // Get auth token
      const token = getAuthToken();
      if (!token) {
        console.warn('⚠️ No auth token found in localStorage or sessionStorage');
      }
      
      // Fix headers - ensure they exist and have proper values
      options.headers = options.headers || {};
      
      // Add Authorization header
      if (token && !options.headers['Authorization'] && !options.headers['authorization']) {
        options.headers['Authorization'] = `Bearer ${token}`;
        console.log('✅ Added Authorization header');
      }
      
      // Ensure content type and accept headers
      if (!options.headers['Content-Type'] && !options.headers['content-type']) {
        options.headers['Content-Type'] = 'application/json';
      }
      
      if (!options.headers['Accept'] && !options.headers['accept']) {
        options.headers['Accept'] = 'application/json';
      }
      
      // Add additional headers to help with CORS and cache issues
      options.headers['X-Requested-With'] = 'XMLHttpRequest';
      options.headers['Cache-Control'] = 'no-cache';
      
      // Force credentials to include for cookies
      options.credentials = 'include';
      
      // Explicitly set mode to cors
      options.mode = 'cors';
      
      console.log('✅ Enhanced request options:', {
        url,
        method: options.method || 'GET',
        headers: Object.keys(options.headers)
      });
    }
    
    // Call original fetch with fixed options
    return originalFetch.call(this, url, options);
  };
  
  // Add direct award points function for easy fixes and testing
  window.awardPointsDirectly = async function(customerId, programId, points, description = '') {
    console.log(`🎯 Directly awarding ${points} points to customer ${customerId} in program ${programId}`);
    
    if (!customerId || !programId || !points) {
      console.error('❌ Missing required parameters');
      return { success: false, error: 'Missing required parameters' };
    }
    
    try {
      // Get auth token with fallbacks
      const token = getAuthToken();
      
      if (!token) {
        console.error('❌ No authentication token found in storage');
        return { success: false, error: 'No authentication token found' };
      }
      
      // Add retry logic to handle CORS or other network issues
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`📤 Award points attempt ${attempts}/${maxAttempts}...`);
          
          // Prepare the request with enhanced options
          const response = await fetch('/api/businesses/award-points', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-Requested-With': 'XMLHttpRequest',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            mode: 'cors',
            credentials: 'include',
            body: JSON.stringify({
              customerId,
              programId,
              points,
              description,
              source: 'MANUAL_FIX'
            })
          });
          
          // Check response status
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Points awarded successfully:', data);
            return { success: true, data };
          } else if (response.status === 405) {
            // Try a fallback approach
            console.warn('⚠️ 405 Method Not Allowed error, trying fallback approach...');
            
            // Try with a custom header that some servers use to identify XMLHttpRequest
            const fallbackResponse = await fetch('/api/businesses/award-points', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Requested-With': 'XMLHttpRequest',
                'X-HTTP-Method-Override': 'POST',
                'X-Ajax-Request': 'true'
              },
              credentials: 'include',
              body: JSON.stringify({
                customerId,
                programId,
                points,
                description,
                source: 'MANUAL_FIX_FALLBACK'
              })
            });
            
            if (fallbackResponse.ok) {
              const data = await fallbackResponse.json();
              console.log('✅ Points awarded successfully with fallback method:', data);
              return { success: true, data };
            }
            
            // If fallback fails, use alternate endpoint approach
            const alternateEndpoint = '/api/loyalty-cards/award-points';
            console.warn(`⚠️ Trying alternate endpoint: ${alternateEndpoint}`);
            
            const alternateResponse = await fetch(alternateEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              credentials: 'include',
              body: JSON.stringify({
                customerId,
                programId,
                points,
                description,
                source: 'MANUAL_FIX_ALTERNATE'
              })
            });
            
            if (alternateResponse.ok) {
              const data = await alternateResponse.json();
              console.log('✅ Points awarded successfully with alternate endpoint:', data);
              return { success: true, data };
            }
            
            // We've tried everything, give up
            throw new Error(`All award points methods failed, last status: ${alternateResponse.status}`);
          } else {
            // Handle other error status codes
            const errorText = await response.text();
            throw new Error(`Server responded with status ${response.status}: ${errorText}`);
          }
        } catch (error) {
          console.warn(`⚠️ Attempt ${attempts} failed:`, error);
          lastError = error;
          
          // Wait before retrying (exponential backoff)
          if (attempts < maxAttempts) {
            const delay = Math.pow(2, attempts) * 500; // 1s, 2s, 4s
            console.log(`⏱️ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // If we get here, all attempts failed
      console.error('❌ All award points attempts failed');
      return { 
        success: false, 
        error: lastError ? lastError.message : 'Failed to award points after multiple attempts',
        attempts
      };
      
    } catch (error) {
      console.error('❌ Error in awardPointsDirectly:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  };
  
  // Create a diagnosis tool to check endpoint accessibility
  window.diagnosePossibleFixes = async function() {
    console.log('🔍 Running award points system diagnostics...');
    
    const diagnostics = {
      authToken: {
        found: false,
        tokenStart: null
      },
      endpoint: {
        standardPost: false,
        fallbackPost: false,
        alternateEndpoint: false,
        serverResponse: null
      },
      browserDetails: {
        userAgent: navigator.userAgent,
        cookiesEnabled: navigator.cookieEnabled
      }
    };
    
    // Check auth token
    const token = getAuthToken();
    if (token) {
      diagnostics.authToken.found = true;
      diagnostics.authToken.tokenStart = token.substring(0, 10) + '...';
    }
    
    // Test endpoint with OPTIONS request
    try {
      const optionsResponse = await fetch('/api/businesses/award-points', {
        method: 'OPTIONS',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      diagnostics.endpoint.optionsStatus = optionsResponse.status;
      diagnostics.endpoint.optionsOk = optionsResponse.ok || optionsResponse.status === 204;
      
      // Check allowed methods
      const allowHeader = optionsResponse.headers.get('Allow');
      diagnostics.endpoint.allowedMethods = allowHeader || 'Not specified';
      diagnostics.endpoint.corsHeaders = {
        'Access-Control-Allow-Origin': optionsResponse.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': optionsResponse.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': optionsResponse.headers.get('Access-Control-Allow-Headers')
      };
    } catch (error) {
      diagnostics.endpoint.optionsError = error.message;
    }
    
    console.log('📊 Diagnostics results:', diagnostics);
    return diagnostics;
  };
  
  // Auto-run diagnostics on load
  setTimeout(window.diagnosePossibleFixes, 2000);
  
  console.log('✅ Award points system fix loaded successfully!');
})(); 