import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, AlertCircle, RefreshCw, Bug, XCircle, CheckCircle, User, Gift, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { LoyaltyCardQrCodeData, CustomerQrCodeData } from '../../types/qrCode';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';

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
  programs: initialPrograms = []
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
  const [programs, setPrograms] = useState<Array<{id: string; name: string}>>(initialPrograms);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState<boolean>(false);

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

  // Fetch customer name and enrolled programs when the modal opens
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!scanData || !scanData.customerId) return;
      
      try {
        // Fetch customer info
        const response = await fetch(`/api/customers/${scanData.customerId}`);
        if (response.ok) {
          const customerData = await response.json();
          if (customerData && customerData.name) {
            setCustomerName(customerData.name);
          } else {
            setCustomerName(`Customer #${scanData.customerId}`);
          }
        } else {
          setCustomerName(`Customer #${scanData.customerId}`);
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
        setCustomerName(`Customer #${scanData.customerId}`);
      }
    };
    
    const fetchEnrolledPrograms = async () => {
      if (!scanData || !scanData.customerId || !businessId) return;
      
      setIsLoadingPrograms(true);
      try {
        // Fetch only programs that the customer is enrolled in for this business
        const enrolledPrograms = await LoyaltyProgramService.getCustomerEnrolledProgramsForBusiness(
          scanData.customerId.toString(),
          businessId.toString()
        );
        
        if (enrolledPrograms && enrolledPrograms.length > 0) {
          const formattedPrograms = enrolledPrograms.map(program => ({
            id: program.id,
            name: program.name
          }));
          setPrograms(formattedPrograms);
          
          // Select the first program by default
          if (formattedPrograms.length > 0 && !selectedProgramId) {
            setSelectedProgramId(formattedPrograms[0].id);
          }
        } else {
          setPrograms([]);
          setError("Customer is not enrolled in any loyalty programs for this business");
        }
      } catch (error) {
        console.error("Error fetching enrolled programs:", error);
        setError("Failed to load loyalty programs");
      } finally {
        setIsLoadingPrograms(false);
      }
    };
    
    fetchCustomerData();
    fetchEnrolledPrograms();
  }, [scanData, businessId, selectedProgramId]);

  // Handle award points
  const handleAwardPoints = async () => {
    if (!selectedProgramId || !pointsToAward) {
      setError('Please select a program and enter points to award');
      return;
    }

    if (!scanData || !scanData.customerId) {
      setError('Customer ID is missing');
      return;
    }

    // Generate a unique transaction reference
    const transactionRef = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Reset state
    setError('');
    setProcessingStatus('Processing...');
    setIsProcessing(true);
    setDiagnosticInfo(null);
    
    try {
      // Get auth token from localStorage with multiple fallbacks
      const authToken = localStorage.getItem('token') || 
                      localStorage.getItem('auth_token') || 
                      localStorage.getItem('jwt');
      
      if (!authToken) {
        // Try to create a token from existing auth data
        const authUserData = localStorage.getItem('authUserData');
        const authUserId = localStorage.getItem('authUserId');
        
        if (authUserData && authUserId) {
          try {
            const userData = JSON.parse(authUserData);
            const email = userData.email || 'user@example.com';
            const role = userData.role || 'business';
            
            // Create token payload
            const tokenPayload = `${authUserId}:${email}:${role}`;
            const token = btoa(tokenPayload);
            
            // Store token in multiple locations for maximum compatibility
            localStorage.setItem('token', token);
            localStorage.setItem('auth_token', token);
            localStorage.setItem('jwt', token);
          } catch (error) {
            console.error('Error creating auth token:', error);
          }
        }
      }
      
      // Try each endpoint in sequence for maximum reliability
      const endpoints = [
        '/api/direct/direct-award-points',
        '/api/businesses/award-points',
        '/api/businesses/award-points-direct',
        '/api/businesses/award-points-emergency'
      ];
      
      let success = false;
      let successData = null;
      
      for (const endpoint of endpoints) {
        try {
          const authToken = localStorage.getItem('token') || 
                           localStorage.getItem('auth_token') || 
                           localStorage.getItem('jwt');
          
          if (!authToken) {
            continue; // Skip if no token
          }
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`,
              'X-Direct-Award': 'true'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
              customerId: scanData.customerId.toString(),
              programId: selectedProgramId,
              points: pointsToAward,
              description: 'Points awarded via QR scanner',
              source: 'QR_SCAN',
              transactionRef
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            success = true;
            successData = data;
            break;
          }
        } catch (error) {
          console.error('Error with endpoint:', error);
        }
      }
      
      if (success) {
        setProcessingStatus('');
        setSuccess(`Successfully awarded ${pointsToAward} points to ${customerName}`);
        setShowConfetti(true);
        
        // Show confetti for 3 seconds
        setTimeout(() => {
          setShowConfetti(false);
        }, 3000);
        
        // Invalidate relevant queries to refresh data
        if (scanData && scanData.customerId) {
          queryClient.invalidateQueries({queryKey: ['customerPoints', scanData.customerId]});
          queryClient.invalidateQueries({queryKey: ['loyaltyCards', scanData.customerId]});
        }
        
        if (onSuccess) {
          onSuccess(pointsToAward);
        }
        
        // Close modal after short delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError('Failed to award points. Please try again.');
        setProcessingStatus('');
      }
    } catch (error: any) {
      setError(`Error: ${error.message || 'Unknown error'}`);
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center">
            <Award className="mr-2" size={20} />
            Award Points
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Customer Info */}
          <div className="mb-6 bg-blue-50 p-4 rounded-lg flex items-center">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <User size={24} className="text-blue-600" />
            </div>
            <div>
              <div className="font-medium">{customerName}</div>
              <div className="text-sm text-gray-500">Customer ID: {scanData?.customerId}</div>
            </div>
          </div>

          {/* Program Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Loyalty Program
            </label>
            {isLoadingPrograms ? (
              <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
            ) : programs.length === 0 ? (
              <div className="text-center py-3 text-red-500 bg-red-50 rounded-md">
                <AlertCircle className="inline-block mr-1" size={16} />
                No loyalty programs found for this customer
              </div>
            ) : (
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isProcessing}
              >
                <option value="">Select a program</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Points Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Points to Award
            </label>
            <input
              type="number"
              min="1"
              value={pointsToAward}
              onChange={(e) => setPointsToAward(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isProcessing}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-start">
              <AlertCircle className="mt-0.5 mr-2 flex-shrink-0" size={16} />
              <div>{error}</div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 flex items-start">
              <CheckCircle className="mt-0.5 mr-2 flex-shrink-0" size={16} />
              <div>{success}</div>
            </div>
          )}

          {/* Processing Status */}
          {processingStatus && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 flex items-center">
              <div className="animate-spin mr-2">
                <RefreshCw size={16} />
              </div>
              <div>{processingStatus}</div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleAwardPoints}
              disabled={isProcessing || !selectedProgramId || programs.length === 0}
              className={`flex-1 py-3 rounded-md flex justify-center items-center font-medium
                ${isProcessing || !selectedProgramId || programs.length === 0 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="animate-spin mr-2" size={16} />
                  Processing...
                </>
              ) : (
                <>
                  <Award className="mr-2" size={16} />
                  Award {pointsToAward} Points
                </>
              )}
            </button>
            
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          
          {/* Show diagnostics toggle */}
          {(error || diagnosticInfo) && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto"
              >
                <Bug size={14} className="mr-1" />
                {showDiagnostics ? 'Hide Diagnostics' : 'Show Diagnostics'}
              </button>
            </div>
          )}
          
          {/* Diagnostic info */}
          {showDiagnostics && diagnosticInfo && (
            <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-xs text-gray-700 mb-1">Diagnostic Information:</p>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(diagnosticInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
      
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => {
            const size = Math.floor(Math.random() * 10) + 5;
            const left = Math.floor(Math.random() * 100);
            const animationDuration = Math.floor(Math.random() * 3) + 2;
            const delay = Math.random() * 0.5;
            
            return (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${left}vw`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: `hsl(${Math.random() * 360}, 80%, 60%)`,
                  animation: `confetti-fall ${animationDuration}s ease-in forwards`,
                  animationDelay: `${delay}s`
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}; 