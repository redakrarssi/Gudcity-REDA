/**
 * Fix for 405 Method Not Allowed error in the award points system
 * Enhanced Version: Now using direct SQL approach
 */

(function() {
  console.log('🔧 Loading award points system fix - Direct SQL Version...');
  
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
      
      // Redirect to our direct API endpoint if it's the problematic one
      if (url === '/api/businesses/award-points' || url === 'api/businesses/award-points') {
        console.log('✅ Redirecting to direct API endpoint');
        url = '/api/direct/direct-award-points';
      }
      
      // Ensure options object exists
      options = options || {};
      
      // Get auth token
      const token = getAuthToken();
      if (!token) {
        console.warn('⚠️ No auth token found in storage');
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
  
  // Helper function to directly award points using our new direct API
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
      
      // Use the direct API endpoint
      const response = await fetch('/api/direct/direct-award-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest',
          'Cache-Control': 'no-cache'
        },
        mode: 'cors',
        credentials: 'include',
        body: JSON.stringify({
          customerId: String(customerId),
          programId: String(programId),
          points,
          description,
          source: 'FIX_SCRIPT'
        })
      });
      
      // Process response
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Points awarded successfully:', data);
        return { success: true, data };
      }
      
      // Handle failed response
      try {
        const errorData = await response.json();
        console.error('❌ API error:', errorData);
        return { success: false, error: errorData.error, data: errorData };
      } catch (parseError) {
        console.error('❌ Failed with status:', response.status, response.statusText);
        return { success: false, error: `${response.status}: ${response.statusText}` };
      }
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
        directPost: false,
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
    
    // Test standard endpoint
    try {
      const standardResponse = await fetch('/api/businesses/award-points', {
        method: 'OPTIONS',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      diagnostics.endpoint.standardStatus = standardResponse.status;
      diagnostics.endpoint.standardOk = standardResponse.ok || standardResponse.status === 204;
    } catch (error) {
      diagnostics.endpoint.standardError = error.message;
    }
    
    // Test direct endpoint
    try {
      const directResponse = await fetch('/api/direct/status', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      diagnostics.endpoint.directStatus = directResponse.status;
      diagnostics.endpoint.directOk = directResponse.ok;
      
      if (directResponse.ok) {
        try {
          const data = await directResponse.json();
          diagnostics.endpoint.directData = data;
        } catch (parseError) {
          diagnostics.endpoint.directParseError = parseError.message;
        }
      }
    } catch (error) {
      diagnostics.endpoint.directError = error.message;
    }
    
    console.log('📊 Diagnostics results:', diagnostics);
    return diagnostics;
  };
  
  // Define a helper function to expose the award points method more directly
  window.gudcityHelpers = window.gudcityHelpers || {};
  window.gudcityHelpers.awardPoints = async function(customerId, programId, points, description = '') {
    // Try direct API first, then fall back to regular endpoint
    try {
      // Check if direct API is available
      const directCheck = await fetch('/api/direct/status', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }).catch(() => null);
      
      if (directCheck && directCheck.ok) {
        // Use direct API
        console.log('Using direct API for award points');
        return await window.awardPointsDirectly(customerId, programId, points, description);
      } else {
        // Fall back to original endpoint
        console.log('Direct API not available, using original endpoint');
        
        const token = getAuthToken();
        if (!token) {
          return { success: false, error: 'No authentication token found' };
        }
        
        const response = await fetch('/api/businesses/award-points', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache'
          },
          mode: 'cors',
          credentials: 'include',
          body: JSON.stringify({
            customerId: String(customerId),
            programId: String(programId),
            points,
            description,
            source: 'HELPER'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          return { success: true, data };
        }
        
        const errorText = await response.text();
        return { success: false, error: errorText, status: response.status };
      }
    } catch (error) {
      console.error('Error in awardPoints helper:', error);
      return { success: false, error: String(error) };
    }
  };
  
  // Auto-run diagnostics on load
  setTimeout(window.diagnosePossibleFixes, 2000);
  
  console.log('✅ Award points system fix loaded successfully!');
})(); 