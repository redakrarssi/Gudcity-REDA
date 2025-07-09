import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, X, Star, AlertCircle, Check, RefreshCw, Bug, Info, ArrowRight, Database } from 'lucide-react';
import { LoyaltyCardQrCodeData, CustomerQrCodeData, QrCodeData } from '../../types/qrCode';
import { LoyaltyProgram } from '../../types/loyalty';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { LoyaltyCardService } from '../../services/loyaltyCardService';
import { QrCodeService } from '../../services/qrCodeService';
import { CustomerService } from '../../services/customerService';
import { Confetti } from '../ui/Confetti';
import { queryClient } from '../../utils/queryClient';
import { awardPointsDirectly } from '../../utils/sqlTransactionHelper';
import sql from '../../utils/db';
import { testPointAwarding } from '../../utils/testPointAwardingHelper';
import toast from 'react-hot-toast';
import { logger } from '../../utils/logger';

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
  const [isCreatingEnrollment, setIsCreatingEnrollment] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
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
      setProcessingStatus('');
      setIsCreatingEnrollment(false);
      setDiagnosticInfo(null);
      setShowDiagnostics(false);
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
    setProcessingStatus('Starting point award process...');
    setDiagnosticInfo(null);
    
    try {
      const diagnostics: any = {
        scanType: scanData.type,
        customerId,
        businessId,
        programId: selectedProgramId,
        points: pointsToAward,
        timestamp: new Date().toISOString()
      };
      
      console.log('Starting point award process', diagnostics);
      
      let result = false;
      let cardId: string | null = null;
      let detailedResult: any = null;
      
      // STEP 1: Check if loyalty card exists for this program
      setProcessingStatus('Checking for existing loyalty card...');
      let card = await getLoyaltyCardWithRetry(customerId, businessId, selectedProgramId);
      diagnostics.cardFound = !!card;
      if (card) {
        diagnostics.cardId = card.id;
        diagnostics.currentPoints = card.points;
        cardId = card.id;
      }
      
      // STEP 2: If no card exists, check if customer is enrolled in program
      if (!card) {
        setProcessingStatus('No card found, checking enrollment status...');
        const enrollmentStatus = await getEnrollmentStatusWithRetry(customerId, businessId, selectedProgramId);
        diagnostics.enrollmentStatus = enrollmentStatus;
        
        // STEP 3: If not enrolled, create enrollment and card
        if (!enrollmentStatus.isEnrolled) {
          setIsCreatingEnrollment(true);
          setProcessingStatus('Creating enrollment and card...');
          
          try {
            // Create direct enrollment and card
            card = await createEnrollmentAndCardWithRetry(customerId, businessId, selectedProgramId);
            diagnostics.enrollmentCreated = !!card;
            if (card) {
              diagnostics.createdCardId = card.id;
              cardId = card.id;
            }
            
            if (!card) {
              throw new Error('Failed to create card for customer');
            }
            
            setProcessingStatus('Enrollment and card created successfully!');
          } catch (enrollError) {
            console.error('Failed to create enrollment:', enrollError);
            const errorMsg = enrollError instanceof Error ? enrollError.message : 'Unknown error';
            setDetailedError(`Failed to create enrollment: ${errorMsg}`);
            diagnostics.enrollmentError = errorMsg;
            throw new Error('Failed to create enrollment for customer');
          } finally {
            setIsCreatingEnrollment(false);
          }
        } else {
          // STEP 4: If enrolled but no card, create card
          setProcessingStatus('Customer enrolled but no card found, creating card...');
          card = await createCardForEnrolledCustomer(customerId, businessId, selectedProgramId);
          diagnostics.cardCreatedForEnrolled = !!card;
          
          if (!card) {
            diagnostics.finalError = 'Failed to create card for enrolled customer';
            throw new Error('Failed to create card for enrolled customer');
          }
          
          cardId = card.id;
        }
      }
      
      // STEP 5: Award points to the card
      if (card && cardId) {
        setProcessingStatus('Awarding points to card...');
        
        // Save transaction information for error reporting
        diagnostics.awardingPoints = {
          cardId: card.id,
          points: pointsToAward,
          source: 'SCAN',
          description: 'Points awarded via QR code scan',
          transactionRef: `qr-scan-${Date.now()}`,
          businessId
        };
        
        // Use the direct SQL helper function
        try {
          // First try the LoyaltyCardService
          const serviceResult = await LoyaltyCardService.awardPointsToCard(
            cardId,
            pointsToAward,
            'SCAN',
            'Points awarded via QR code scan',
            `qr-scan-${Date.now()}`,
            businessId
          );
          
          if (serviceResult.success) {
            result = true;
            diagnostics.pointsAwarded = true;
            diagnostics.pointsAwardDetails = serviceResult.diagnostics;
          } else {
            // If service method fails, try direct SQL approach
            console.log('Service method failed, trying direct SQL approach');
            const directResult = await awardPointsDirectly(
              cardId,
              pointsToAward,
              'SCAN',
              'Points awarded via QR code scan',
              `qr-scan-${Date.now()}`,
              businessId
            );
            
            result = directResult;
            diagnostics.pointsAwarded = directResult;
            diagnostics.pointsAwardMethod = 'direct_sql';
            
            if (!directResult) {
              setDetailedError('Failed to award points using both service and direct SQL methods');
              diagnostics.pointsAwardError = 'Both award methods failed';
            }
          }
        } catch (awardError) {
          console.error('Error awarding points:', awardError);
          setDetailedError(awardError instanceof Error ? awardError.message : String(awardError));
          diagnostics.pointsAwardError = awardError instanceof Error ? awardError.message : String(awardError);
        }
      } else {
        // This should never happen with our retry logic, but as a final fallback use QrCodeService
        setProcessingStatus('Using QR code service as fallback...');
        const processingResult = await QrCodeService.processQrCodeScan(
          {
            ...scanData,
            type: 'customer'
          },
          businessId,
          pointsToAward
        );
        
        result = processingResult.success;
        diagnostics.fallbackUsed = true;
        diagnostics.fallbackResult = result;
        
        if (!result && processingResult.message) {
          setDetailedError(processingResult.message);
          diagnostics.fallbackError = processingResult.message;
        }
      }
      
      // STEP 6: Handle result
      if (result) {
        console.log('Successfully awarded points');
        setSuccess(`Successfully awarded ${pointsToAward} points to ${customerName}`);
        setShowConfetti(true);
        
        // Invalidate relevant queries to refresh any displayed data
        queryClient.invalidateQueries({ queryKey: ['customerCards'] });
        queryClient.invalidateQueries({ queryKey: ['customerPoints'] });
        queryClient.invalidateQueries({ queryKey: ['loyaltyCard'] });
        
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
          diagnostics.eventError = eventError instanceof Error ? eventError.message : String(eventError);
        }
        
        setTimeout(() => {
          setShowConfetti(false);
          // Optionally close the modal after successful award
          // onClose();
        }, 3000);
      } else {
        console.error('Failed to award points');
        setError('Failed to award points to the customer');
      }
      
      // Save diagnostic info for troubleshooting
      setDiagnosticInfo(diagnostics);
    } catch (err) {
      console.error('Error in award points process:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      
      // Set detailed diagnostic information
      try {
        const diagnosticData = {
          timestamp: new Date().toISOString(),
          customer: {
            id: scanData?.customerId,
            scanType: scanData?.type
          },
          business: {
            id: businessId
          },
          program: {
            id: selectedProgramId
          },
          points: pointsToAward,
          error: {
            message: errorMessage,
            type: err instanceof Error ? err.constructor.name : typeof err
          }
        };
        
        // Log to console
        console.error('Point award diagnostic data:', diagnosticData);
        
        // Save for UI
        setDiagnosticInfo(diagnosticData);
        
        // Log to server if logger is available
        if (logger && typeof logger.error === 'function') {
          logger.error('Points award failure', diagnosticData);
        }
      } catch (logError) {
        console.error('Error logging diagnostic data:', logError);
      }
    } finally {
      setIsProcessing(false);
      setRetryCount(0); // Reset retry count after completion
      setProcessingStatus('');
    }
  };

  /**
   * Troubleshoot points awarding with the diagnostic tool
   */
  const handleTroubleshoot = async () => {
    if (!scanData) {
      toast.error('No scan data available');
      return;
    }
    
    const customerId = scanData.customerId?.toString();
    if (!customerId) {
      toast.error('Customer ID not found in scan data');
      return;
    }
    
    if (!selectedProgramId) {
      toast.error('Please select a loyalty program');
      return;
    }
    
    setIsProcessing(true);
    toast.loading('Running diagnostic test...');
    
    try {
      const result = await testPointAwarding(
        customerId,
        businessId,
        selectedProgramId,
        pointsToAward
      );
      
      if (result.success) {
        toast.success(result.message);
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['customerCards'] });
        queryClient.invalidateQueries({ queryKey: ['customerPoints'] });
        queryClient.invalidateQueries({ queryKey: ['loyaltyCard'] });
        
        setSuccess(result.message);
      } else {
        toast.error(result.message);
        setError(result.message);
        if (result.details) {
          setDetailedError(JSON.stringify(result.details));
        }
      }
    } catch (error) {
      toast.error('Diagnostic test failed');
      setError('Diagnostic test failed');
      setDetailedError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
      toast.dismiss();
    }
  };

  /**
   * Get a loyalty card with retry logic
   */
  const getLoyaltyCardWithRetry = async (
    customerId: string,
    businessId: string,
    programId: string
  ) => {
    let attempts = 0;
    
    while (attempts < 3) {
      try {
        // First try standard service method
        const card = await LoyaltyCardService.getCustomerCard(customerId, businessId);
        
        if (card) return card;
        
        // If that fails, try direct query with specific program
        const cardResult = await sql`
          SELECT * FROM loyalty_cards
          WHERE customer_id = ${customerId}
          AND business_id = ${businessId}
          AND program_id = ${programId}
          AND is_active = true
        `;
        
        if (cardResult.length > 0) {
          return {
            id: cardResult[0].id?.toString() || '',
            customerId: cardResult[0].customer_id?.toString() || '',
            businessId: cardResult[0].business_id?.toString() || '',
            programId: cardResult[0].program_id?.toString() || '',
            cardType: cardResult[0].card_type || 'STANDARD',
            tier: cardResult[0].tier || 'STANDARD',
            points: parseFloat(cardResult[0].points?.toString() || '0') || 0,
            pointsMultiplier: parseFloat(cardResult[0].points_multiplier?.toString() || '1') || 1,
            promoCode: cardResult[0].promo_code || null,
            nextReward: null,
            pointsToNext: null,
            expiryDate: cardResult[0].expiry_date || null,
            benefits: [],
            lastUsed: cardResult[0].last_used || null,
            isActive: true,
            availableRewards: [],
            createdAt: cardResult[0].created_at?.toString() || new Date().toISOString(),
            updatedAt: cardResult[0].updated_at?.toString() || new Date().toISOString(),
            cardNumber: cardResult[0].card_number?.toString() || ''
          };
        }
        
        return null;
      } catch (error) {
        console.error(`Error getting loyalty card (attempt ${attempts + 1}):`, error);
        attempts++;
        if (attempts < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return null;
  };

  /**
   * Get enrollment status with retry logic
   */
  const getEnrollmentStatusWithRetry = async (
    customerId: string,
    businessId: string,
    programId: string
  ) => {
    let attempts = 0;
    
    while (attempts < 3) {
      try {
        const enrollmentStatus = await CustomerService.getCustomerEnrollmentStatus(customerId, businessId);
        
        // Check if enrolled in the specific program
        const isEnrolledInProgram = enrollmentStatus.programIds.includes(programId);
        
        return {
          ...enrollmentStatus,
          isEnrolled: enrollmentStatus.isEnrolled || isEnrolledInProgram
        };
      } catch (error) {
        console.error(`Error getting enrollment status (attempt ${attempts + 1}):`, error);
        attempts++;
        if (attempts < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return { isEnrolled: false, programIds: [], totalPoints: 0 };
  };

  /**
   * Create enrollment and card with retry
   */
  const createEnrollmentAndCardWithRetry = async (
    customerId: string,
    businessId: string,
    programId: string
  ) => {
    let attempts = 0;
    
    while (attempts < 3) {
      try {
        // Create direct enrollment and card
        const card = await LoyaltyCardService.enrollCustomerInProgram(
          customerId,
          businessId,
          programId
        );
        
        return card;
      } catch (error) {
        console.error(`Error creating enrollment (attempt ${attempts + 1}):`, error);
        attempts++;
        if (attempts < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return null;
  };

  /**
   * Create card for already enrolled customer
   */
  const createCardForEnrolledCustomer = async (
    customerId: string,
    businessId: string,
    programId: string
  ) => {
    try {
      // Generate a unique card number
      const cardNumber = `GC-${Math.floor(100000 + Math.random() * 900000)}-C`;
      
      // Create the card directly
      const cardResult = await sql`
        INSERT INTO loyalty_cards (
          customer_id, business_id, program_id, card_number,
          points, points_balance, total_points_earned,
          tier, is_active, created_at, updated_at
        ) VALUES (
          ${customerId}, ${businessId}, ${programId}, ${cardNumber},
          0, 0, 0, 'STANDARD', true, NOW(), NOW()
        ) RETURNING id
      `;
      
      if (cardResult.length === 0) {
        throw new Error('Failed to create card');
      }
      
      const cardId = cardResult[0].id?.toString() || '';
      
      return {
        id: cardId,
        customerId: customerId,
        businessId: businessId,
        programId: programId,
        cardType: 'STANDARD',
        tier: 'STANDARD',
        points: 0,
        pointsMultiplier: 1,
        promoCode: null,
        nextReward: null,
        pointsToNext: null,
        expiryDate: null,
        benefits: [],
        lastUsed: null,
        isActive: true,
        availableRewards: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cardNumber: cardNumber
      };
    } catch (error) {
      console.error('Error creating card for enrolled customer:', error);
      return null;
    }
  };
  
  const handleRetry = () => {
    setHasRetried(true);
    setError(null);
    setDetailedError(null);
    handleAwardPoints();
  };

  const toggleDiagnostics = () => {
    setShowDiagnostics(!showDiagnostics);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {showConfetti && <Confetti active={showConfetti} />}
      
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
              {isProcessing && processingStatus && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
                  <div className="flex items-center">
                    <div className="mr-3 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-blue-800">{processingStatus}</p>
                  </div>
                </div>
              )}
              
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
                    
                    <div className="mt-3 flex gap-3 ml-7">
                      <button
                        onClick={handleRetry}
                        disabled={isProcessing}
                        className="flex items-center text-sm font-medium text-red-700 hover:text-red-900"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        {t('Try Again')}
                      </button>
                      
                      <button
                        onClick={toggleDiagnostics}
                        disabled={isProcessing || !diagnosticInfo}
                        className="flex items-center text-sm font-medium text-blue-700 hover:text-blue-900"
                      >
                        <Bug className="w-4 h-4 mr-1" />
                        {showDiagnostics ? t('Hide Diagnostics') : t('Show Diagnostics')}
                      </button>
                    </div>
                    
                    {showDiagnostics && diagnosticInfo && (
                      <div className="mt-3 ml-7 p-2 bg-gray-50 rounded-md border border-gray-200 text-xs font-mono overflow-x-auto">
                        <div className="text-gray-800 font-medium mb-1">Diagnostic Information:</div>
                        <pre className="text-gray-600">
                          {JSON.stringify(diagnosticInfo, null, 2)}
                        </pre>
                      </div>
                    )}
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
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={isProcessing || programs.length === 0}
                  >
                    {programs.length === 0 ? (
                      <option value="">{t('No programs available')}</option>
                    ) : (
                      programs.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Points to Award')}
                  </label>
                  <input
                    type="number"
                    value={pointsToAward}
                    onChange={(e) => setPointsToAward(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="1"
                    disabled={isProcessing}
                  />
                </div>
                
                <div className="pt-4">
                  <button
                    onClick={handleAwardPoints}
                    disabled={isProcessing || !selectedProgramId || pointsToAward <= 0 || !scanData?.customerId}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <>
                        <div className="mr-2 w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t('Processing...')}
                      </>
                    ) : (
                      <>
                        <Award className="w-5 h-5 mr-2" />
                        {t('Award Points')}
                      </>
                    )}
                  </button>
                </div>
                
                <div className="text-center pt-2">
                  <p className="text-xs text-gray-500">
                    {t('Points will be added to the customer\'s loyalty card for the selected program')}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 