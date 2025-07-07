import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, X, Star, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { LoyaltyCardQrCodeData, CustomerQrCodeData, QrCodeData } from '../../types/qrCode';
import { LoyaltyProgram } from '../../types/loyalty';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { LoyaltyCardService } from '../../services/loyaltyCardService';
import { QrCodeService } from '../../services/qrCodeService';
import { CustomerNotificationService } from '../../services/customerNotificationService';
import { Confetti } from '../ui/Confetti';
import { queryClient } from '../../utils/queryClient';

interface PointsAwardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanData: LoyaltyCardQrCodeData | CustomerQrCodeData | null;
  businessId: string;
}

export const PointsAwardingModal: React.FC<PointsAwardingModalProps> = ({
  isOpen,
  onClose,
  scanData,
  businessId
}) => {
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [pointsToAward, setPointsToAward] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('Customer');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [hasRetried, setHasRetried] = useState<boolean>(false);
  const MAX_RETRIES = 3;

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
      setDetailedError(null);
      setRetryCount(0);
      setHasRetried(false);
      setPointsToAward(10);
    }
  }, [isOpen]);

  // Load business programs
  useEffect(() => {
    if (isOpen && businessId) {
      loadPrograms();
      loadCustomerInfo();
    }
  }, [isOpen, businessId, scanData]);

  const loadPrograms = async () => {
    if (!businessId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading business programs for businessId:', businessId);
      const businessPrograms = await LoyaltyProgramService.getBusinessPrograms(businessId);
      console.log(`Found ${businessPrograms.length} programs for business ${businessId}`);
      setPrograms(businessPrograms);
      
      // Set default program if available
      if (businessPrograms.length > 0) {
        console.log('Setting default program:', businessPrograms[0].id);
        setSelectedProgramId(businessPrograms[0].id);
      } else {
        console.log('No programs found for business');
      }
    } catch (err) {
      console.error('Error fetching business programs:', err);
      setError('Failed to load loyalty programs');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerInfo = async () => {
    if (!scanData) return;
    
    const customerId = scanData.customerId?.toString();
    if (!customerId) return;
    
    try {
      console.log('Loading customer info for customerId:', customerId);
      const customer = await LoyaltyCardService.getCustomerInfo(customerId);
      if (customer && customer.name) {
        console.log('Customer found:', customer.name);
        setCustomerName(customer.name);
      } else {
        console.log('Customer found but no name available');
      }
    } catch (err) {
      console.error('Error fetching customer info:', err);
    }
  };

  const handleAwardPoints = async () => {
    if (!scanData) {
      setError('No scan data available');
      return;
    }
    
    const customerId = scanData.customerId?.toString();
    if (!customerId) {
      setError('Customer ID not found in scan data');
      return;
    }
    
    if (!selectedProgramId) {
      setError('Please select a loyalty program');
      return;
    }
    
    if (pointsToAward <= 0) {
      setError('Points must be greater than zero');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setDetailedError(null);
    setSuccess(null);
    
    try {
      console.log('Starting point award process', {
        scanType: scanData.type,
        customerId,
        businessId,
        programId: selectedProgramId,
        points: pointsToAward
      });

      let result = false;
      let processingResult = null;

      // If this is a loyalty card QR code with a specific card ID
      if (scanData.type === 'loyaltyCard' && scanData.cardId) {
        console.log('Processing loyalty card QR code with cardId:', scanData.cardId.toString());
        result = await awardPointsWithRetry(
          scanData.cardId.toString(),
          pointsToAward,
          'SCAN',
          'Points awarded via QR code scan',
          `qr-scan-${Date.now()}`,
          businessId
        );
      } 
      // If this is a customer QR code, we need to get their card for the selected program
      else if (scanData.type === 'customer') {
        console.log('Processing customer QR code, fetching card for program:', selectedProgramId);
        
        try {
          // First try to get the specific card for this program
          const card = await LoyaltyCardService.getCustomerCard(customerId, businessId, selectedProgramId);
          
          if (card) {
            console.log('Found existing card, awarding points directly:', card.id);
            result = await awardPointsWithRetry(
              card.id,
              pointsToAward,
              'SCAN',
              'Points awarded via QR code scan',
              `qr-scan-${Date.now()}`,
              businessId
            );
          } else {
            console.log('No card found, using QrCodeService to process');
            // Fall back to the QR code service which will handle enrollment if needed
            processingResult = await QrCodeService.processQrCodeScan(
              {
                ...scanData,
                type: 'customer'
              },
              businessId,
              pointsToAward
            );
            
            result = processingResult.success;
            
            if (!result && processingResult.message) {
              setDetailedError(processingResult.message);
            }
          }
        } catch (cardError) {
          console.error('Error fetching customer card, falling back to QR code service:', cardError);
          
          processingResult = await QrCodeService.processQrCodeScan(
            {
              ...scanData,
              type: 'customer'
            },
            businessId,
            pointsToAward
          );
          
          result = processingResult.success;
          
          if (!result && processingResult.message) {
            setDetailedError(processingResult.message);
          }
        }
      } else {
        setError('Unsupported QR code type');
        result = false;
      }
      
      if (result) {
        console.log('Successfully awarded points');
        setSuccess(`Successfully awarded ${pointsToAward} points to ${customerName}`);
        setShowConfetti(true);
        
        // Invalidate relevant queries to refresh any displayed data
        queryClient.invalidateQueries(['customerCards']);
        queryClient.invalidateQueries(['customerPoints']);
        queryClient.invalidateQueries(['loyaltyCard']);
        
        // Create event for other components to pick up
        try {
          const event = new CustomEvent('points-awarded', {
            detail: {
              customerId,
              businessId,
              programId: selectedProgramId,
              points: pointsToAward,
              timestamp: new Date().toISOString()
            }
          });
          window.dispatchEvent(event);
          
          // Also use localStorage for cross-tab communication
          localStorage.setItem(`points_awarded_${Date.now()}`, JSON.stringify({
            customerId,
            businessId,
            programId: selectedProgramId,
            points: pointsToAward,
            timestamp: new Date().toISOString()
          }));
        } catch (eventError) {
          console.error('Error broadcasting points awarded event:', eventError);
        }
        
        setTimeout(() => {
          setShowConfetti(false);
          // Optionally close the modal after successful award
          // onClose();
        }, 3000);
      } else {
        console.error('Failed to award points', { detailedError: processingResult?.message || 'Unknown error' });
        setError('Failed to award points to the customer');
        if (processingResult?.message) {
          setDetailedError(processingResult.message);
        }
      }
    } catch (err) {
      console.error('Error in award points process:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsProcessing(false);
      setRetryCount(0); // Reset retry count after completion
    }
  };

  /**
   * Award points with automatic retry on failure
   */
  const awardPointsWithRetry = async (
    cardId: string,
    points: number,
    source: 'PURCHASE' | 'SCAN' | 'WELCOME' | 'PROMOTION' | 'MANUAL' | 'OTHER',
    description: string = '',
    transactionRef: string = '',
    businessId: string = ''
  ): Promise<boolean> => {
    let currentAttempt = 0;
    const maxAttempts = 3;
    
    while (currentAttempt < maxAttempts) {
      try {
        console.log(`Attempt ${currentAttempt + 1} of ${maxAttempts} to award points to card ${cardId}`);
        
        const result = await LoyaltyCardService.awardPointsToCard(
          cardId,
          points,
          source,
          description,
          transactionRef,
          businessId
        );
        
        if (result) {
          console.log(`Successfully awarded ${points} points to card ${cardId}`);
          return true;
        }
        
        console.log(`Failed to award points on attempt ${currentAttempt + 1}`);
        currentAttempt++;
        
        // Wait before retry
        if (currentAttempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error on attempt ${currentAttempt + 1}:`, error);
        currentAttempt++;
        
        // Wait before retry
        if (currentAttempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.error(`Failed to award points after ${maxAttempts} attempts`);
    return false;
  };
  
  const handleRetry = () => {
    setHasRetried(true);
    setError(null);
    setDetailedError(null);
    handleAwardPoints();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {showConfetti && <Confetti />}
      
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="text-lg font-semibold flex items-center">
            <Award className="w-5 h-5 mr-2 text-green-500" />
            {t('Award Points')}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="w-8 h-8 border-4 border-t-green-500 border-gray-200 rounded-full animate-spin"></div>
              <p className="text-gray-500">Loading program information...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                      <p className="text-red-800 font-medium">{error}</p>
                    </div>
                    
                    {detailedError && (
                      <p className="mt-1 ml-7 text-sm text-red-700">{detailedError}</p>
                    )}
                    
                    <div className="mt-3 ml-7">
                      <button
                        onClick={handleRetry}
                        disabled={isProcessing}
                        className="flex items-center text-sm font-medium text-red-700 hover:text-red-900"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        {t('Try Again')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-2" />
                    <p className="text-green-800">{success}</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Customer')}
                  </label>
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200 flex items-center">
                    <span className="font-medium">{customerName}</span>
                    {scanData?.customerId && <span className="text-gray-500 ml-2 text-sm">#{scanData.customerId.toString()}</span>}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Loyalty Program')}
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    disabled={isProcessing || programs.length === 0}
                  >
                    {programs.length === 0 && (
                      <option value="">{t('No programs available')}</option>
                    )}
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                  {programs.length === 0 && !isLoading && (
                    <p className="mt-1 text-sm text-red-500">
                      {t('No loyalty programs found. Please create a program first.')}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Points to Award')}
                  </label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setPointsToAward(Math.max(1, pointsToAward - 1))}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-l-md transition-colors"
                      disabled={isProcessing || pointsToAward <= 1}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={pointsToAward}
                      onChange={(e) => setPointsToAward(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border-t border-b border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-center"
                      disabled={isProcessing || programs.length === 0}
                    />
                    <button
                      type="button"
                      onClick={() => setPointsToAward(pointsToAward + 1)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-r-md transition-colors"
                      disabled={isProcessing}
                    >
                      +
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {t('Enter the number of points to award to this customer')}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="border-t p-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
            disabled={isProcessing}
          >
            {t('Cancel')}
          </button>
          <button
            onClick={handleAwardPoints}
            disabled={isProcessing || !selectedProgramId || programs.length === 0}
            className={`px-4 py-2 bg-green-500 text-white rounded-lg transition-colors flex items-center ${
              isProcessing || !selectedProgramId || programs.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'
            }`}
          >
            {isProcessing ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
            ) : (
              <Star className="w-4 h-4 mr-2" />
            )}
            {isProcessing ? t('Awarding...') : t('Award Points')}
          </button>
        </div>
      </div>
    </div>
  );
}; 