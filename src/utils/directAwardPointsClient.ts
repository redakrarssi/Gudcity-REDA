/**
 * Client-side utility for using the direct award points API
 * This bypasses the problematic /api/businesses/award-points endpoint
 */

/**
 * Award points directly to a customer using the direct API endpoint
 */
export async function awardPointsDirectly(
  customerId: string | number,
  programId: string | number,
  points: number,
  description: string = 'Points awarded',
  source: string = 'CLIENT'
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}> {
  try {
    // Get auth token from localStorage with multiple fallbacks
    const authToken = localStorage.getItem('token') || 
                      localStorage.getItem('auth_token') || 
                      localStorage.getItem('jwt');
    
    if (!authToken) {
      console.error('No authentication token found');
      return { 
        success: false, 
        error: 'Authentication token missing. Please log in again.' 
      };
    }
    
    // Make request to the direct API endpoint
    const response = await fetch('/api/direct/direct-award-points', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache'
      },
      credentials: 'include',
      body: JSON.stringify({
        customerId: String(customerId),
        programId: String(programId),
        points,
        description,
        source
      })
    });
    
    // If we get a response, parse it
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: data.message || `Successfully awarded ${points} points to customer`,
        data: data.data
      };
    }
    
    // Handle error responses
    try {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || `Failed with status ${response.status}`,
        data: errorData
      };
    } catch (jsonError) {
      return {
        success: false,
        error: `Failed with status ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    console.error('Error awarding points directly:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error while awarding points'
    };
  }
}

/**
 * Check if the direct API is available
 */
export async function checkDirectApiAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/direct/status', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    return response.ok;
  } catch (error) {
    console.warn('Direct API not available:', error);
    return false;
  }
}

/**
 * Global replacement for window.awardPointsDirectly
 * This makes it easy to use from any component or script
 */
if (typeof window !== 'undefined') {
  window.gudcityHelpers = window.gudcityHelpers || {};
  window.gudcityHelpers.directAwardPoints = awardPointsDirectly;
  
  // Also provide the direct function as a global
  window.directAwardPoints = awardPointsDirectly;
} 