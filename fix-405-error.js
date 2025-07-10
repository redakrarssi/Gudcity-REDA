/**
 * Fix for 405 Error when awarding points to enrolled customers
 * 
 * This script can be run directly in the browser console to fix the issue
 * with the 405 Method Not Allowed error when awarding points.
 * 
 * How to use:
 * 1. Open your browser developer tools (F12 or right-click > Inspect)
 * 2. Go to the Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter to run it
 * 5. Try awarding points again
 */

(function() {
  console.log('🔧 Running 405 Error Fix for Points Awarding');
  
  // 1. Check if we're on the right page
  if (!window.location.href.includes('businesses') && !document.querySelector('[data-testid="award-points-modal"]')) {
    console.warn('⚠️ This script should be run on the business dashboard page with the points awarding modal open');
  }
  
  // 2. Fix the fetch request for award-points
  const originalFetch = window.fetch;
  
  window.fetch = function(url, options) {
    // Check if this is a request to the award-points endpoint
    if (url && typeof url === 'string' && url.includes('/api/businesses/award-points')) {
      console.log('🔍 Intercepting award-points request');
      
      // Fix the URL if needed
      if (url === '/api/businesses/award-points' || url === 'api/businesses/award-points') {
        url = '/api/businesses/award-points';
        console.log('✅ Fixed URL:', url);
      }
      
      // Ensure proper headers
      if (options && options.headers) {
        options.headers = {
          ...options.headers,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        console.log('✅ Added proper headers');
      }
      
      // Ensure credentials are included
      if (options) {
        options.credentials = 'same-origin';
        console.log('✅ Added credentials');
      }
      
      // Log the request details
      console.log('📤 Request URL:', url);
      console.log('📤 Request method:', options?.method);
      console.log('📤 Request body:', options?.body);
      
      // Make the request with our fixes
      return originalFetch(url, options)
        .then(response => {
          // Log the response details
          console.log('📥 Response status:', response.status);
          console.log('📥 Response status text:', response.statusText);
          
          // Handle 405 error specifically
          if (response.status === 405) {
            console.error('❌ Still getting 405 error. Trying alternative approach...');
            
            // Try to use XMLHttpRequest as a fallback
            return new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('POST', url, true);
              
              // Set headers
              xhr.setRequestHeader('Content-Type', 'application/json');
              xhr.setRequestHeader('Accept', 'application/json');
              
              // Get auth token from localStorage if available
              const token = localStorage.getItem('token');
              if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
              }
              
              xhr.onload = function() {
                if (this.status >= 200 && this.status < 300) {
                  // Create a mock Response object
                  const mockResponse = new Response(this.responseText, {
                    status: this.status,
                    statusText: this.statusText,
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  console.log('✅ Successfully used XMLHttpRequest fallback');
                  resolve(mockResponse);
                } else {
                  console.error('❌ XMLHttpRequest fallback also failed:', this.status, this.statusText);
                  resolve(response); // Return the original failed response
                }
              };
              
              xhr.onerror = function() {
                console.error('❌ XMLHttpRequest network error');
                reject(new Error('Network error'));
              };
              
              // Send the request with the same body
              xhr.send(options?.body);
            });
          }
          
          return response;
        })
        .catch(error => {
          console.error('❌ Fetch error:', error);
          throw error;
        });
    }
    
    // For all other requests, use the original fetch
    return originalFetch(url, options);
  };
  
  // 3. Add a helper function to directly award points
  window.awardPointsDirectly = async function(customerId, programId, points, description = 'Points awarded manually') {
    console.log('🏆 Attempting to award points directly...');
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No authentication token found in localStorage');
        return { success: false, error: 'No authentication token found' };
      }
      
      // Prepare the request
      const response = await fetch('/api/businesses/award-points', {
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
  
  // 4. Provide instructions for using the helper function
  console.log('✅ Fix applied successfully!');
  console.log('');
  console.log('To award points directly, use the following function:');
  console.log('awardPointsDirectly(customerId, programId, points, description)');
  console.log('');
  console.log('Example for customer 27 and program 11:');
  console.log('awardPointsDirectly("27", "11", 10, "Points awarded manually")');
  console.log('');
  console.log('You can also try the normal award points button again, which should now work.');
})(); 