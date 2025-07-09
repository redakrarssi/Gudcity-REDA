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
import sql from '../../utils/db';
import { diagnoseCardIssue, attemptCardFix } from '../../utils/cardDiagnostics';
import toast from 'react-hot-toast';

interface PointsAwardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanData: QrCodeData | null;
  businessId: string;
}

export const PointsAwardingModal: React.FC<PointsAwardingModalProps> = ({
  isOpen,
  onClose,
  scanData,
  businessId
}) => {
  const { t } = useTranslation();
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgram[]>([]);
  const [pointsToAward, setPointsToAward] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [fixAttempted, setFixAttempted] = useState<boolean>(false);
  const [fixResult, setFixResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen && businessId) {
      loadLoyaltyPrograms();
    }
  }, [isOpen, businessId]);

  const loadLoyaltyPrograms = async () => {
    try {
      const programs = await LoyaltyProgramService.getLoyaltyProgramsByBusiness(businessId);
      setLoyaltyPrograms(programs);
      
      // Auto-select the first program if there's only one
      if (programs.length === 1) {
        setSelectedProgramId(programs[0].id.toString());
      }
    } catch (error) {
      console.error('Error loading loyalty programs:', error);
      setError('Failed to load loyalty programs');
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
    setFixAttempted(false);
    setFixResult(null);
    
    // Create a diagnostics object to track the process
    const diagnostics: any = {
      scanType: scanData.type,
      customerId,
      businessId,
      programId: selectedProgramId,
      points: pointsToAward,
      timestamp: new Date().toISOString()
    };
    
    let result = false;
    
    try {
      // STEP 1: Check if customer exists
      setProcessingStatus('Verifying customer...');
      const customer = await CustomerService.getCustomerById(customerId);
      
      if (!customer) {
        setError('Customer not found');
        setDiagnosticInfo({
          ...diagnostics,
          error: 'Customer not found'
        });
        setIsProcessing(false);
        return;
      }
      
      diagnostics.customerFound = true;
      
      // STEP 2: Check if program exists
      setProcessingStatus('Verifying loyalty program...');
      const program = await LoyaltyProgramService.getLoyaltyProgramById(selectedProgramId);
      
      if (!program) {
        setError('Loyalty program not found');
        setDiagnosticInfo({
          ...diagnostics,
          error: 'Loyalty program not found'
        });
        setIsProcessing(false);
        return;
      }
      
      diagnostics.programFound = true;
      
      // STEP 3: Check if customer is enrolled in program
      setProcessingStatus('Checking enrollment status...');
      const enrollmentStatus = await getEnrollmentStatusWithRetry(customerId, businessId, selectedProgramId);
      
      if (!enrollmentStatus.isEnrolled) {
        setError('Customer is not enrolled in this loyalty program');
        setDiagnosticInfo({
          ...diagnostics,
          error: 'Customer not enrolled in program',
          enrollmentStatus
        });
        setIsProcessing(false);
        return;
      }
      
      diagnostics.isEnrolled = true;
      
      // STEP 4: Get or create loyalty card for this customer and program
      setProcessingStatus('Retrieving loyalty card...');
      let card = null;
      let cardId = null;
      
      try {
        // First try to get existing card
        card = await LoyaltyCardService.getCardByCustomerAndProgram(customerId, selectedProgramId);
        
        if (card) {
          cardId = card.id;
          diagnostics.cardFound = true;
          diagnostics.cardId = cardId;
          diagnostics.currentPoints = card.points || 0;
        } else {
          // If no card exists, create one
          setProcessingStatus('Creating new loyalty card...');
          card = await LoyaltyCardService.createCardForEnrolledCustomer(
            customerId,
            businessId,
            selectedProgramId
          );
          
          if (card) {
            cardId = card.id;
            diagnostics.cardFound = true;
            diagnostics.cardId = cardId;
            diagnostics.currentPoints = 0;
            diagnostics.cardCreated = true;
          } else {
            setError('Failed to create loyalty card');
            setDiagnosticInfo({
              ...diagnostics,
              error: 'Failed to create loyalty card'
            });
            setIsProcessing(false);
            return;
          }
        }
      } catch (cardError) {
        console.error('Error getting/creating card:', cardError);
        setError('Error retrieving loyalty card');
        setDetailedError(cardError instanceof Error ? cardError.message : String(cardError));
        setDiagnosticInfo({
          ...diagnostics,
          error: 'Error retrieving loyalty card',
          cardError: cardError instanceof Error ? cardError.message : String(cardError)
        });
        setIsProcessing(false);
        return;
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
        
        // First run a diagnostic check on the card
        const cardDiagnosis = await diagnoseCardIssue(
          cardId, 
          customerId, 
          businessId, 
          selectedProgramId
        );
        
        diagnostics.cardDiagnosis = cardDiagnosis;
        
        // If there's a relationship issue, try to fix it before awarding points
        if (!cardDiagnosis.success) {
          setProcessingStatus('Detected card relationship issue, attempting to fix...');
          
          const fixAttempt = await attemptCardFix(
            cardId,
            customerId,
            businessId,
            selectedProgramId
          );
          
          setFixAttempted(true);
          setFixResult(fixAttempt);
          diagnostics.fixAttempt = fixAttempt;
          
          if (!fixAttempt.success) {
            setProcessingStatus('Could not fix card relationship issue automatically');
          } else if (fixAttempt.fixed) {
            setProcessingStatus('Successfully fixed card relationship issue');
          }
        }
        
        // Use the LoyaltyCardService to award points
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
            diagnostics.pointsAwardMethod = 'service';
          } else {
            // If service method fails, log the error and try direct SQL approach
            console.log('Service method failed:', serviceResult.error);
            console.log('Details:', serviceResult.diagnostics);
            setProcessingStatus('Primary method failed, trying alternative approach...');
            
            // Try direct SQL approach as fallback
            try {
              // Use a simple direct SQL update as last resort
              const updateResult = await sql`
                UPDATE loyalty_cards
                SET points = COALESCE(points, 0) + ${pointsToAward}
                WHERE id = ${cardId}
                RETURNING id, points
              `;
              
              if (updateResult && updateResult.length > 0) {
                result = true;
                diagnostics.pointsAwarded = true;
                diagnostics.pointsAwardMethod = 'emergency_fallback';
                diagnostics.fallbackResult = {
                  id: updateResult[0].id,
                  newPoints: updateResult[0].points
                };
                console.log('Emergency fallback succeeded:', updateResult[0]);
                
                // Try to record the transaction
                try {
                  await sql`
                    INSERT INTO loyalty_transactions (
                      card_id,
                      transaction_type,
                      points,
                      source,
                      description,
                      transaction_ref,
                      business_id,
                      created_at,
                      customer_id,
                      program_id
                    )
                    VALUES (
                      ${cardId},
                      'CREDIT',
                      ${pointsToAward},
                      'SCAN',
                      'Points awarded via QR code scan (emergency fallback)',
                      ${`emergency-${Date.now()}`},
                      ${businessId},
                      NOW(),
                      ${customerId},
                      ${selectedProgramId}
                    )
                  `;
                  diagnostics.transactionRecorded = true;
                } catch (txError) {
                  console.error('Failed to record transaction (non-critical):', txError);
                  diagnostics.transactionError = txError instanceof Error ? 
                    txError.message : String(txError);
                }
              } else {
                setDetailedError('Emergency fallback failed: No rows updated');
                diagnostics.pointsAwarded = false;
                diagnostics.pointsAwardMethod = 'emergency_fallback';
                diagnostics.pointsAwardError = 'No rows updated';
              }
            } catch (fallbackError) {
              console.error('Emergency fallback failed:', fallbackError);
              setDetailedError(fallbackError instanceof Error ? 
                fallbackError.message : 'Unknown error in emergency fallback');
              diagnostics.pointsAwarded = false;
              diagnostics.pointsAwardMethod = 'emergency_fallback';
              diagnostics.pointsAwardError = fallbackError instanceof Error ? 
                fallbackError.message : String(fallbackError);
            }
          }
        } catch (awardError) {
          console.error('Error awarding points:', awardError);
          setDetailedError(awardError instanceof Error ? awardError.message : String(awardError));
          diagnostics.pointsAwardError = awardError instanceof Error ? awardError.message : String(awardError);
          diagnostics.pointsAwarded = false;
        }
      } else {
        setError('Card information is missing');
        diagnostics.pointsAwarded = false;
        diagnostics.error = 'Card information is missing';
      }
      
      // STEP 6: Handle result
      if (result) {
        setSuccess(`Successfully awarded ${pointsToAward} points to ${customer.name}`);
        setShowConfetti(true);
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries(['customerCards', customerId]);
        queryClient.invalidateQueries(['customerPrograms', customerId]);
        queryClient.invalidateQueries(['businessCustomers', businessId]);
        
        // Show success toast
        toast.success(`${pointsToAward} points awarded to ${customer.name}`);
        
        // Close modal after delay
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setError('Failed to award points to the customer');
        
        if (diagnostics.pointsAwardError) {
          setDetailedError(`Error: ${diagnostics.pointsAwardError}`);
        }
      }
    } catch (error) {
      console.error('Error in points awarding process:', error);
      setError('An unexpected error occurred');
      setDetailedError(error instanceof Error ? error.message : String(error));
      
      diagnostics.error = error instanceof Error ? error.message : String(error);
    } finally {
      setIsProcessing(false);
      setDiagnosticInfo(diagnostics);
    }
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
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    return { isEnrolled: false, programIds: [] };
  };

  const handleTryAgain = () => {
    setError(null);
    setDetailedError(null);
    setSuccess(null);
    setShowConfetti(false);
    setDiagnosticInfo(null);
    setFixAttempted(false);
    setFixResult(null);
  };

  const toggleDiagnostics = () => {
    setShowDiagnostics(!showDiagnostics);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {showConfetti && <Confetti active={showConfetti} />}
      
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <Award className="mr-2 text-blue-600" size={24} />
            {t('Award Points')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-start">
              <AlertCircle className="mr-2 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-medium">{error}</p>
                {detailedError && <p className="text-sm mt-1">{detailedError}</p>}
                {fixAttempted && (
                  <div className="mt-2 text-sm">
                    <p className="font-medium">Automatic fix attempted:</p>
                    <p>{fixResult?.success ? 'Fix succeeded' : 'Fix failed'}</p>
                    {fixResult?.action && <p>Action: {fixResult.action}</p>}
                    {fixResult?.error && <p>Error: {fixResult.error}</p>}
                  </div>
                )}
                <button 
                  onClick={handleTryAgain}
                  className="mt-2 flex items-center text-sm font-medium text-red-700 hover:text-red-900"
                >
                  <RefreshCw className="mr-1" size={14} />
                  Try Again
                </button>
              </div>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 flex items-start">
              <Check className="mr-2 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-medium">{success}</p>
              </div>
            </div>
          )}
          
          {!success && !error && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Customer')}
                </label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="font-medium">
                    {scanData?.customerName || 'Unknown Customer'} 
                    {scanData?.customerId && <span className="text-gray-500 ml-1">#{scanData.customerId}</span>}
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="loyaltyProgram" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Loyalty Program')}
                </label>
                <select
                  id="loyaltyProgram"
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={isProcessing}
                >
                  <option value="">{t('Select a loyalty program')}</option>
                  {loyaltyPrograms.map((program) => (
                    <option key={program.id} value={program.id.toString()}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="pointsToAward" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Points to Award')}
                </label>
                <input
                  id="pointsToAward"
                  type="number"
                  min="1"
                  value={pointsToAward}
                  onChange={(e) => setPointsToAward(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={isProcessing}
                />
              </div>
              
              <button
                onClick={handleAwardPoints}
                disabled={isProcessing}
                className={`w-full p-3 rounded-md font-medium flex justify-center items-center ${
                  isProcessing
                    ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="animate-spin mr-2" size={18} />
                    {processingStatus || t('Processing...')}
                  </>
                ) : (
                  <>
                    <Award className="mr-2" size={18} />
                    {t('Award Points')}
                  </>
                )}
              </button>
            </>
          )}
          
          {diagnosticInfo && (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleDiagnostics}
                  className="text-sm text-gray-500 flex items-center"
                >
                  {showDiagnostics ? (
                    <>
                      <Bug size={16} className="mr-1" />
                      Hide Diagnostics
                    </>
                  ) : (
                    <>
                      <Bug size={16} className="mr-1" />
                      Show Diagnostics
                    </>
                  )}
                </button>
                
                {diagnosticInfo.pointsAwarded === false && (
                  <button
                    onClick={handleTryAgain}
                    className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    <RefreshCw className="mr-1" size={14} />
                    Try Again
                  </button>
                )}
              </div>
              
              {showDiagnostics && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-xs font-mono overflow-x-auto">
                  <div className="font-medium mb-1 text-gray-700">Diagnostic Information:</div>
                  <pre className="text-gray-800">
                    {JSON.stringify(diagnosticInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 