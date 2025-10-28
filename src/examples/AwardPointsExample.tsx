import React, { useState } from 'react';
import { awardPoints, checkAwardPointsEndpoints } from '../utils/awardPointsUtil';

/**
 * Example component demonstrating how to use the award points utility
 */
const AwardPointsExample: React.FC = () => {
  const [customerId, setCustomerId] = useState('27');
  const [programId, setProgramId] = useState('8');
  const [points, setPoints] = useState(10);
  const [description, setDescription] = useState('Points awarded via example');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);

  // Handle award points
  const handleAwardPoints = async () => {
    if (!customerId || !programId || !points || points <= 0) {
      setResult({
        success: false,
        error: 'Please provide valid customer ID, program ID, and points'
      });
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const result = await awardPoints({
        customerId,
        programId,
        points,
        description,
        source: 'EXAMPLE'
      });
      
      setResult(result);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'An unexpected error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Run diagnostics
  const runDiagnostics = async () => {
    setIsDiagnosticRunning(true);
    setDiagnostics(null);
    
    try {
      const result = await checkAwardPointsEndpoints();
      setDiagnostics(result);
    } catch (error: any) {
      setDiagnostics({
        error: error.message || 'An unexpected error occurred',
        workingEndpoints: [],
        failedEndpoints: []
      });
    } finally {
      setIsDiagnosticRunning(false);
    }
  };

  return (
    <div className="award-points-example">
      <h2>Award Points Example</h2>
      
      <div className="form-container">
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
          <label htmlFor="description">Description:</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        <div className="buttons">
          <button 
            onClick={handleAwardPoints} 
            disabled={isLoading}
            className="award-button"
          >
            {isLoading ? 'Processing...' : 'Award Points'}
          </button>
          
          <button 
            onClick={runDiagnostics} 
            disabled={isDiagnosticRunning}
            className="diagnostic-button"
          >
            {isDiagnosticRunning ? 'Running...' : 'Run Diagnostics'}
          </button>
        </div>
      </div>
      
      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          <h3>Result</h3>
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
              <pre className="result-data">
                {JSON.stringify(result.data || {}, null, 2)}
              </pre>
            </>
          ) : (
            <>
              <div className="error-message">
                ❌ {result.error || 'Failed to award points'}
              </div>
              <div className="error-help">
                Please try running diagnostics to check which endpoints are working.
              </div>
            </>
          )}
        </div>
      )}
      
      {diagnostics && (
        <div className="diagnostics">
          <h3>Diagnostics</h3>
          
          {diagnostics.error ? (
            <div className="error-message">
              ❌ {diagnostics.error}
            </div>
          ) : (
            <>
              <div className="diagnostic-summary">
                {diagnostics.workingEndpoints.length > 0 ? (
                  <div className="success-message">
                    ✅ Found {diagnostics.workingEndpoints.length} working endpoint(s)
                  </div>
                ) : (
                  <div className="error-message">
                    ❌ No working endpoints found
                  </div>
                )}
              </div>
              
              {diagnostics.bestEndpoint && (
                <div className="best-endpoint">
                  <strong>Best endpoint:</strong> {diagnostics.bestEndpoint}
                </div>
              )}
              
              <div className="endpoints-container">
                <div className="working-endpoints">
                  <h4>Working Endpoints:</h4>
                  {diagnostics.workingEndpoints.length > 0 ? (
                    <ul>
                      {diagnostics.workingEndpoints.map((endpoint: string) => (
                        <li key={endpoint}>{endpoint}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>None</p>
                  )}
                </div>
                
                <div className="failed-endpoints">
                  <h4>Failed Endpoints:</h4>
                  {diagnostics.failedEndpoints.length > 0 ? (
                    <ul>
                      {diagnostics.failedEndpoints.map((endpoint: string) => (
                        <li key={endpoint}>{endpoint}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>None</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
      
      <div className="help-section">
        <h3>How to Use</h3>
        <p>
          This example demonstrates how to use the <code>awardPoints</code> utility function
          to award points to customers with automatic fallback to multiple endpoints.
        </p>
        <pre className="code-example">
{`import { awardPoints } from '../utils/awardPointsUtil';

// Award points to a customer
const result = await awardPoints({
  customerId: '27',
  programId: '8',
  points: 10,
  description: 'Points earned from purchase',
  source: 'YOUR_SOURCE'
});

if (result.success) {
  console.log('Points awarded successfully!');
} else {
  console.error('Failed to award points:', result.error);
}`}
        </pre>
      </div>
    </div>
  );
};

export default AwardPointsExample; 