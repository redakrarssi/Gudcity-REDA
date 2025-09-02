import React, { useState } from 'react';

interface AwardPointsProps {
  customerId?: string;
  programId?: string;
  initialPoints?: number;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  buttonText?: string;
  className?: string;
}

interface AwardPointsResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  endpoint?: string;
}

/**
 * Award Points Helper Component
 * 
 * This component provides a UI for awarding points with built-in error handling
 * and fallback to multiple endpoints.
 */
const AwardPointsHelper: React.FC<AwardPointsProps> = ({
  customerId: initialCustomerId = '',
  programId: initialProgramId = '',
  initialPoints = 10,
  onSuccess,
  onError,
  buttonText = 'Award Points',
  className = '',
}) => {
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [programId, setProgramId] = useState(initialProgramId);
  const [points, setPoints] = useState(initialPoints);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AwardPointsResult | null>(null);

  // List of endpoints to try in order
  const endpoints = [
    '/api/businesses/award-points',
    '/api/direct/direct-award-points',
    '/api/businesses/award-points-direct',
    '/api/businesses/award-points-emergency',
    '/api/direct/award-points-emergency',
    '/award-points-emergency'
  ];

  // Function to get auth token
  const getAuthToken = (): string | null => {
    return localStorage.getItem('token');
  };

  // Function to make authenticated request
  const makeRequest = async (endpoint: string, payload: any): Promise<AwardPointsResult> => {
    const token = getAuthToken();
    
    if (!token) {
      return { 
        success: false, 
        error: 'No authentication token found' 
      };
    }
    
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
        const data = await response.json();
        return { 
          success: true, 
          message: data.message || 'Points awarded successfully',
          data
        };
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { 
        success: false, 
        error: errorData.error || errorData.message || `HTTP error ${response.status}`
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Network error'
      };
    }
  };

  // Function to award points with fallback
  const awardPoints = async () => {
    if (!customerId || !programId || !points || points <= 0) {
      setResult({
        success: false,
        error: 'Please provide valid customer ID, program ID, and points'
      });
      
      if (onError) {
        onError({
          error: 'Invalid input',
          details: { customerId, programId, points }
        });
      }
      
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    
    const payload = {
      customerId: String(customerId),
      programId: String(programId),
      points: Number(points),
      description: description || 'Points awarded',
      source: 'COMPONENT'
    };
    
    let lastError = null;
    
    // Try each endpoint in sequence
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const result = await makeRequest(endpoint, payload);
        
        if (result.success) {
          console.log(`Success with endpoint ${endpoint}`);
          
          const finalResult = {
            ...result,
            endpoint
          };
          
          setResult(finalResult);
          setIsLoading(false);
          
          if (onSuccess) {
            onSuccess(finalResult);
          }
          
          return;
        } else {
          console.warn(`Failed with endpoint ${endpoint}: ${result.error}`);
          lastError = result;
        }
      } catch (error: any) {
        console.error(`Error with endpoint ${endpoint}: ${error.message}`);
        lastError = { 
          success: false, 
          error: error.message 
        };
      }
    }
    
    // If we get here, all endpoints failed
    const finalError = {
      success: false,
      error: lastError?.error || 'All endpoints failed',
      message: 'Failed to award points after trying all available endpoints'
    };
    
    setResult(finalError);
    setIsLoading(false);
    
    if (onError) {
      onError(finalError);
    }
  };

  return (
    <div className={`award-points-helper ${className}`}>
      <div className="form-group">
        <label htmlFor="customer-id">Customer ID:</label>
        <input
          type="text"
          id="customer-id"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          disabled={isLoading}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="program-id">Program ID:</label>
        <input
          type="text"
          id="program-id"
          value={programId}
          onChange={(e) => setProgramId(e.target.value)}
          disabled={isLoading}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="points">Points:</label>
        <input
          type="number"
          id="points"
          value={points}
          onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
          disabled={isLoading}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="description">Description (optional):</label>
        <input
          type="text"
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
          placeholder="Points awarded"
        />
      </div>
      
      <button 
        onClick={awardPoints} 
        disabled={isLoading}
        className="award-points-button"
      >
        {isLoading ? 'Processing...' : buttonText}
      </button>
      
      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          {result.success ? (
            <>
              <div className="success-message">
                ✅ {result.message || 'Points awarded successfully'}
              </div>
              {result.endpoint && (
                <div className="endpoint-info">
                  Using endpoint: {result.endpoint}
                </div>
              )}
              {result.data && (
                <pre className="result-data">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}
            </>
          ) : (
            <>
              <div className="error-message">
                ❌ {result.error || 'Failed to award points'}
              </div>
              <div className="error-help">
                Please try again or contact support if the issue persists.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AwardPointsHelper;

/**
 * Standalone function to award points with fallback
 */
export async function awardPointsWithFallback(
  customerId: string | number,
  programId: string | number,
  points: number,
  description: string = '',
  source: string = 'FUNCTION'
): Promise<AwardPointsResult> {
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
    source: source || 'FUNCTION'
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