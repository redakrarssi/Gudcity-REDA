import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, AlertCircle, RefreshCw, Bug, XCircle, CheckCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { LoyaltyCardQrCodeData, CustomerQrCodeData } from '../../types/qrCode';

interface PointsAwardingModalProps {
  onClose: () => void;
  scanData: LoyaltyCardQrCodeData | CustomerQrCodeData | null;
  businessId: string;
  onSuccess?: (points: number) => void;
  programs?: Array<{id: string; name: string}>;
}

export const PointsAwardingModal: React.FC<PointsAwardingModalProps> = ({
  onClose,
  scanData,
  businessId,
  onSuccess,
  programs = []
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // State
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [pointsToAward, setPointsToAward] = useState<number>(10);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  
  // Add a request timeout ref and abort controller
  const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleAwardPoints = async () => {
    if (!selectedProgramId || !pointsToAward) {
      setError('Please select a program and enter points to award');
      return;
    }

    // Generate a unique transaction reference
    const transactionRef = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Reset state
    setError('');
    setProcessingStatus('Processing...');
    setIsProcessing(true);
    setDiagnosticInfo(null);
    
    // Create diagnostics object for debugging
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      customerId: scanData?.customerId?.toString(), // Use scanData.customerId
      programId: selectedProgramId,
      points: pointsToAward
    };
    
    // Create abort controller for request timeout
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // Set request timeout (10 seconds)
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
    }
    requestTimeoutRef.current = setTimeout(() => {
      if (isProcessing) {
        // Abort the request if it's still processing
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        setError('Request timed out. Please try again.');
        setProcessingStatus('');
        setIsProcessing(false);
        
        // Add timeout info to diagnostics
        const timeoutDiagnostics = {
          ...diagnostics,
          error: 'Request timed out after 10 seconds',
          timeoutAt: new Date().toISOString()
        };
        setDiagnosticInfo(timeoutDiagnostics);
      }
    }, 10000);
    
    try {
      // Improved error handling - add explicit URL path
      const apiUrl = '/api/businesses/award-points';
      diagnostics.requestUrl = apiUrl;
      
      // Get auth token from localStorage - CRITICAL FIX
      const authToken = localStorage.getItem('token') || 
                        localStorage.getItem('auth_token') || 
                        localStorage.getItem('jwt');
      
      if (!authToken) {
        console.error('No authentication token found');
        throw new Error('Authentication token missing. Please log in again.');
      }
      
      console.log('Using auth token:', authToken.substring(0, 10) + '...');
      diagnostics.tokenFound = true;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        signal, // Add abort signal
        credentials: 'include',
        body: JSON.stringify({ 
          customerId: scanData?.customerId?.toString(), 
          programId: selectedProgramId, 
          points: pointsToAward, 
          description: 'Points awarded via QR code scan', 
          source: 'SCAN',
          transactionRef
        }),
      });

      // Clear timeout since we got a response
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }

      diagnostics.httpStatus = response.status;
      diagnostics.httpStatusText = response.statusText;
      
      // Handle 405 Method Not Allowed error specifically
      if (response.status === 405) {
        console.error('405 Method Not Allowed error. API endpoint might be misconfigured.');
        diagnostics.error405 = true;
        diagnostics.requestedMethod = 'POST';
        diagnostics.allowedMethods = response.headers.get('Allow');
        
        throw new Error(`Server rejected request method: POST to ${apiUrl}. Allowed methods: ${response.headers.get('Allow') || 'unknown'}`);
      }
      
      // Handle 401 Unauthorized error specifically
      if (response.status === 401) {
        console.error('401 Unauthorized error. Authentication token might be invalid or expired.');
        diagnostics.error401 = true;
        
        throw new Error('Authentication token invalid or expired. Please log in again.');
      }
      
      // First get the raw text to avoid JSON parsing errors
      const rawText = await response.text();
      diagnostics.rawResponse = rawText.substring(0, 200); // Limit size for diagnostics
      
      try {
        // Try to parse as JSON
        const data = JSON.parse(rawText);
        diagnostics.responseData = data;
        
        if (response.ok && data.success) {
          setProcessingStatus('Success!');
          setSuccess(`Successfully awarded ${pointsToAward} points!`);
          setTimeout(() => {
            onClose();
            if (onSuccess) onSuccess(pointsToAward);
          }, 1500);
        } else {
          // API returned success: false or other error
          setError(data.error || 'Failed to award points');
          setProcessingStatus('');
          setIsProcessing(false);
          
          // Add error to diagnostics
          diagnostics.apiError = data.error;
        }
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        diagnostics.jsonParseError = String(jsonError);
        
        // Non-JSON response
        if (response.ok) {
          setProcessingStatus('Success!');
          setSuccess(`Successfully awarded ${pointsToAward} points!`);
          setTimeout(() => {
            onClose();
            if (onSuccess) onSuccess(pointsToAward);
          }, 1500);
        } else {
          setError(`Server error: ${response.status} ${response.statusText}`);
          setProcessingStatus('');
          setIsProcessing(false);
        }
      }
    } catch (err) {
      // Clear timeout if there was an error
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }
      
      console.error('Error awarding points:', err);
      
      // Check if this was an abort error (timeout)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. The server took too long to respond.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to award points');
      }
      
      // Always clear processing state
      setProcessingStatus('');
      setIsProcessing(false);
      
      // Add error to diagnostics
      diagnostics.error = err instanceof Error ? err.message : String(err);
    } finally {
      // Ensure processing state is cleared in all cases
      if (isProcessing) {
        setIsProcessing(false);
      }
    }
    
    // Show diagnostic information
    setDiagnosticInfo(diagnostics);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          disabled={isProcessing}
        >
          <XCircle size={24} />
        </button>
        
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-2 rounded-full mr-3">
              <Award className="text-green-600" size={24} />
            </div>
            <h2 className="text-xl font-semibold">Award Points</h2>
          </div>
          
          {/* Processing/Success/Error States */}
          {isProcessing && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 flex items-center">
              <div className="mr-3 animate-spin">
                <RefreshCw size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-blue-700">{processingStatus || 'Processing...'}</p>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 flex items-center">
              <CheckCircle size={20} className="text-green-500 mr-3" />
              <p className="text-green-700">{success}</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                  <div className="mt-2">
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                      onClick={() => setShowDiagnostics(!showDiagnostics)}
                    >
                      {showDiagnostics ? 'Hide Diagnostics' : 'Show Diagnostics'}
                    </button>
                    
                    {showDiagnostics && diagnosticInfo && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-32">
                        <pre>{JSON.stringify(diagnosticInfo, null, 2)}</pre>
                      </div>
                    )}
                    
                    <button
                      type="button"
                      className="ml-4 text-sm text-red-600 hover:text-red-800 font-medium"
                      onClick={() => {
                        setError('');
                        setDiagnosticInfo(null);
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Form Fields */}
          {!success && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer
                </label>
                <div className="p-3 bg-gray-100 rounded-md">
                  <p className="font-medium">{customerName || `Customer #${scanData?.customerId}`}</p>
                </div>
              </div>
              
              <div>
                <label htmlFor="program" className="block text-sm font-medium text-gray-700 mb-1">
                  Loyalty Program
                </label>
                <select
                  id="program"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={selectedProgramId || ''}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  disabled={isProcessing}
                >
                  <option value="">Select a program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-1">
                  Points to Award
                </label>
                <input
                  type="number"
                  id="points"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={pointsToAward}
                  onChange={(e) => setPointsToAward(parseInt(e.target.value) || 0)}
                  min="1"
                  disabled={isProcessing}
                />
              </div>
              
              <button
                type="button"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                onClick={handleAwardPoints}
                disabled={isProcessing || !selectedProgramId || pointsToAward <= 0}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Award className="-ml-1 mr-2 h-5 w-5" />
                    Award Points
                  </>
                )}
              </button>
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-4 text-center">
            Points will be added to the customer's loyalty card for the selected program
          </p>
        </div>
      </div>
    </div>
  );
}; 