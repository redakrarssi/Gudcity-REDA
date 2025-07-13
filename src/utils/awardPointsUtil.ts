/**
 * Award Points Utility
 * 
 * This utility provides functions for awarding points with fallback to multiple endpoints.
 */

interface AwardPointsResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  endpoint?: string;
}

interface AwardPointsOptions {
  customerId: string | number;
  programId: string | number;
  points: number;
  description?: string;
  source?: string;
}

/**
 * Award points with automatic fallback to alternative endpoints
 */
export async function awardPoints({
  customerId,
  programId,
  points,
  description = '',
  source = 'UTIL'
}: AwardPointsOptions): Promise<AwardPointsResult> {
  if (!customerId || !programId || !points || points <= 0) {
    return { 
      success: false, 
      error: 'Invalid input parameters' 
    };
  }
  
  const payload = {
    customerId: String(customerId),
    programId: String(programId),
    points: Number(points),
    description: description || 'Points awarded',
    source: source || 'UTIL'
  };
  
  // List of endpoints to try in order
  const endpoints = [
    '/api/businesses/award-points',
    '/api/direct/direct-award-points',
    '/api/businesses/award-points-direct',
    '/api/businesses/award-points-emergency',
    '/api/direct/award-points-emergency',
    '/award-points-emergency'
  ];
  
  const token = localStorage.getItem('token');
  if (!token) {
    return { 
      success: false, 
      error: 'No authentication token found' 
    };
  }
  
  let lastError = null;
  
  // Try each endpoint in sequence
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Success with endpoint ${endpoint}`);
        
        return {
          success: true,
          message: data.message || 'Points awarded successfully',
          data,
          endpoint
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.warn(`Failed with endpoint ${endpoint}: ${errorData.error || response.statusText}`);
        
        lastError = { 
          error: errorData.error || errorData.message || `HTTP error ${response.status}`
        };
      }
    } catch (error: any) {
      console.error(`Error with endpoint ${endpoint}: ${error.message}`);
      lastError = { error: error.message };
    }
  }
  
  // If we get here, all endpoints failed
  return {
    success: false,
    error: lastError?.error || 'All endpoints failed',
    message: 'Failed to award points after trying all available endpoints'
  };
}

/**
 * Check if award points functionality is working
 */
export async function checkAwardPointsEndpoints(): Promise<{
  workingEndpoints: string[];
  failedEndpoints: string[];
  bestEndpoint?: string;
}> {
  // List of endpoints to check
  const endpoints = [
    '/api/businesses/award-points',
    '/api/direct/direct-award-points',
    '/api/businesses/award-points-direct',
    '/api/businesses/award-points-emergency',
    '/api/direct/award-points-emergency',
    '/award-points-emergency'
  ];
  
  const workingEndpoints: string[] = [];
  const failedEndpoints: string[] = [];
  
  // Test payload
  const payload = {
    customerId: '1',
    programId: '1',
    points: 1,
    description: 'Test award points',
    source: 'DIAGNOSTIC'
  };
  
  const token = localStorage.getItem('token');
  if (!token) {
    return { 
      workingEndpoints: [],
      failedEndpoints: endpoints,
      bestEndpoint: undefined
    };
  }
  
  // Check each endpoint
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        workingEndpoints.push(endpoint);
      } else {
        failedEndpoints.push(endpoint);
      }
    } catch (error) {
      failedEndpoints.push(endpoint);
    }
  }
  
  return {
    workingEndpoints,
    failedEndpoints,
    bestEndpoint: workingEndpoints.length > 0 ? workingEndpoints[0] : undefined
  };
}

/**
 * Configure the award points system to use a specific endpoint
 */
export function configureAwardPoints(endpoint?: string): void {
  // List of endpoints in order of preference
  const defaultEndpoints = [
    '/api/businesses/award-points',
    '/api/direct/direct-award-points',
    '/api/businesses/award-points-direct',
    '/api/businesses/award-points-emergency',
    '/api/direct/award-points-emergency',
    '/award-points-emergency'
  ];
  
  // If endpoint is provided, move it to the front of the list
  if (endpoint) {
    const configuredEndpoints = [endpoint];
    defaultEndpoints.forEach(e => {
      if (e !== endpoint) {
        configuredEndpoints.push(e);
      }
    });
    
    // Store the configured endpoints in localStorage
    localStorage.setItem('awardPointsEndpoints', JSON.stringify(configuredEndpoints));
    console.log(`Award points system configured to use ${endpoint} as primary endpoint`);
  } else {
    // Reset to default
    localStorage.removeItem('awardPointsEndpoints');
    console.log('Award points system reset to default endpoints');
  }
} 