/**
 * Test script to verify the fix for the award points API
 * 
 * How to use:
 * 1. Open browser console
 * 2. Run testAwardPoints()
 * 3. Check console output for success/failure
 */

// Test function to award points to customer 27 in program 11
async function testAwardPoints(customerId = '27', programId = '11', points = 50) {
  console.log('🧪 Testing award points API fix...');
  console.log(`Awarding ${points} points to customer ${customerId} in program ${programId}`);
  
  try {
    // Get auth token
    const authToken = localStorage.getItem('token') || 
                      localStorage.getItem('auth_token') || 
                      localStorage.getItem('jwt');
    
    if (!authToken) {
      console.error('❌ No authentication token found in localStorage. Please log in first.');
      return false;
    }
    
    console.log('✅ Auth token found');
    
    // Create diagnostics object for logging
    const diagnostics = {
      timestamp: new Date().toISOString(),
      customerId,
      programId,
      points,
      requestUrl: '/api/businesses/award-points'
    };
    
    // 1. First try original fetch request
    console.log('🔍 Testing original fetch request...');
    
    try {
      const response = await fetch('/api/businesses/award-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        credentials: 'include',
        body: JSON.stringify({
          customerId,
          programId,
          points,
          description: 'Test award points',
          source: 'TEST',
          transactionRef: `test-${Date.now()}`,
          sendNotification: true
        })
      });
      
      // Log response status
      console.log(`📝 Response status: ${response.status} ${response.statusText}`);
      diagnostics.httpStatus = response.status;
      diagnostics.httpStatusText = response.statusText;
      
      // Check for 405 error
      if (response.status === 405) {
        console.warn('⚠️ Got 405 Method Not Allowed error. Trying fix-405-error.js solution...');
        diagnostics.error405 = true;
        diagnostics.requestedMethod = 'POST';
        diagnostics.allowedMethods = response.headers.get('Allow');
      } else if (response.ok) {
        // Try to parse response
        const data = await response.text();
        try {
          const json = JSON.parse(data);
          console.log('✅ Original fetch request successful!', json);
          return true;
        } catch (e) {
          console.log('✅ Got successful response but could not parse JSON:', data);
          return true;
        }
      } else {
        console.warn(`⚠️ Got error response ${response.status}. Trying fallback...`);
      }
    } catch (error) {
      console.warn('⚠️ Original fetch request failed:', error);
      diagnostics.originalFetchError = error.message;
    }
    
    // 2. Try with window.fetch directly
    console.log('🔍 Testing window.fetch directly...');
    
    try {
      const response = await window.fetch('/api/businesses/award-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        credentials: 'include',
        body: JSON.stringify({
          customerId,
          programId,
          points,
          description: 'Test award points (window.fetch)',
          source: 'TEST',
          transactionRef: `test-${Date.now()}`,
          sendNotification: true
        })
      });
      
      console.log(`📝 Response status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        // Try to parse response
        const data = await response.text();
        try {
          const json = JSON.parse(data);
          console.log('✅ window.fetch request successful!', json);
          return true;
        } catch (e) {
          console.log('✅ Got successful response but could not parse JSON:', data);
          return true;
        }
      } else {
        console.warn(`⚠️ Got error response ${response.status}. Trying fallback...`);
      }
    } catch (error) {
      console.warn('⚠️ window.fetch request failed:', error);
      diagnostics.windowFetchError = error.message;
    }
    
    // 3. Try with awardPointsDirectly helper
    console.log('🔍 Testing awardPointsDirectly helper...');
    
    if (typeof window.awardPointsDirectly === 'function') {
      try {
        const result = await window.awardPointsDirectly(
          customerId,
          programId,
          points,
          'Test award points (awardPointsDirectly)'
        );
        
        if (result.success) {
          console.log('✅ awardPointsDirectly successful!', result);
          return true;
        } else {
          console.error('❌ awardPointsDirectly failed:', result);
          diagnostics.awardPointsDirectlyError = result.error;
        }
      } catch (error) {
        console.error('❌ awardPointsDirectly error:', error);
        diagnostics.awardPointsDirectlyError = error.message;
      }
    } else {
      console.warn('⚠️ awardPointsDirectly function not available');
      diagnostics.awardPointsDirectlyMissing = true;
      
      // Try to load the fix script dynamically
      console.log('🔧 Trying to load fix-405-error.js dynamically...');
      
      try {
        const script = document.createElement('script');
        script.src = '/fix-405-error.js';
        document.body.appendChild(script);
        
        // Wait for script to load
        await new Promise(resolve => {
          script.onload = resolve;
          setTimeout(resolve, 1000); // Timeout fallback
        });
        
        console.log('✅ fix-405-error.js loaded dynamically');
        
        // Try again with awardPointsDirectly
        if (typeof window.awardPointsDirectly === 'function') {
          try {
            const result = await window.awardPointsDirectly(
              customerId,
              programId,
              points,
              'Test award points (dynamic load)'
            );
            
            if (result.success) {
              console.log('✅ Dynamic awardPointsDirectly successful!', result);
              return true;
            } else {
              console.error('❌ Dynamic awardPointsDirectly failed:', result);
              diagnostics.dynamicAwardPointsDirectlyError = result.error;
            }
          } catch (error) {
            console.error('❌ Dynamic awardPointsDirectly error:', error);
            diagnostics.dynamicAwardPointsDirectlyError = error.message;
          }
        } else {
          console.error('❌ awardPointsDirectly function still not available after loading script');
          diagnostics.dynamicLoadFailed = true;
        }
      } catch (error) {
        console.error('❌ Failed to dynamically load fix-405-error.js:', error);
        diagnostics.dynamicLoadError = error.message;
      }
    }
    
    // All attempts failed
    console.error('❌ All award points methods failed. See diagnostics below:');
    console.error(JSON.stringify(diagnostics, null, 2));
    return false;
  } catch (error) {
    console.error('❌ Fatal error in test:', error);
    return false;
  }
}

// Make available in global scope
window.testAwardPoints = testAwardPoints;

// Auto-run test if in test environment
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  testAwardPoints().then(success => {
    console.log(`Test ${success ? 'PASSED' : 'FAILED'}`);
  });
}

console.log('✅ Award points test script loaded successfully');
console.log('To test, run testAwardPoints() in the browser console');
console.log('Example: testAwardPoints("27", "11", 50)'); 