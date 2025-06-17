import React, { useState, useEffect } from 'react';
import { KeyRound, Check, X, AlertCircle, Gift, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PromoService } from '../../services/promoService';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { Confetti } from '../ui/Confetti';

interface RedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  businessId: string;
  customerName?: string;
}

export const RedemptionModal: React.FC<RedemptionModalProps> = ({
  isOpen,
  onClose,
  customerId,
  businessId,
  customerName = 'Customer'
}) => {
  const { t } = useTranslation();
  const [promoCode, setPromoCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [redemptionDetails, setRedemptionDetails] = useState<{
    value: string | number;
    currency?: string;
    promotionName?: string;
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);

  useEffect(() => {
    // Check customer enrollment status when modal opens
    if (isOpen && customerId) {
      checkCustomerEnrollment();
    }
  }, [isOpen, customerId, businessId]);

  const checkCustomerEnrollment = async () => {
    if (!customerId || !businessId) return;

    setCheckingEnrollment(true);
    
    try {
      // Get all programs for this business
      const programs = await LoyaltyProgramService.getBusinessPrograms(businessId);
      
      if (!programs || programs.length === 0) {
        setIsEnrolled(false);
        return;
      }
      
      // Check if customer is enrolled in any of the business programs
      const enrollmentPromises = programs.map(program => 
        LoyaltyProgramService.checkEnrollment(customerId, program.id)
      );
      
      const enrollmentResults = await Promise.all(enrollmentPromises);
      
      // Customer is enrolled if they're enrolled in at least one program
      setIsEnrolled(enrollmentResults.some(result => result.isEnrolled));
      
    } catch (err) {
      console.error('Error checking customer enrollment:', err);
      // Default to not enrolled on error
      setIsEnrolled(false);
    } finally {
      setCheckingEnrollment(false);
    }
  };

  const handleRedeemCode = async () => {
    if (!promoCode.trim()) {
      setError('Please enter a promotion code');
      return;
    }

    if (!isEnrolled) {
      setError('Customer must be enrolled in a program to redeem codes');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setRedemptionDetails(null);

    try {
      const result = await PromoService.redeemCode(
        promoCode.trim(),
        customerId
      );

      if (result.success) {
        // Store redemption details
        setRedemptionDetails({
          value: result.redemption?.value || '',
          currency: result.redemption?.currency,
          promotionName: result.redemption?.promotionName
        });
        
        // Set success message
        setSuccess(`Code redeemed successfully! Value: ${result.redemption?.value} ${result.redemption?.currency || ''}`);
        
        // Show confetti animation
        setShowConfetti(true);
        
        // Clear the promo code field
        setPromoCode('');
        
        // Hide confetti after a few seconds
        setTimeout(() => {
          setShowConfetti(false);
        }, 3000);
      } else {
        setError(result.error || 'Failed to redeem code');
        playErrorSound();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
      playErrorSound();
    } finally {
      setIsProcessing(false);
    }
  };
  
  const playErrorSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alert-quick-chime-766.mp3');
      audio.volume = 0.5;
      audio.play();
    } catch (error) {
      console.error('Error playing error sound:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative overflow-hidden">
        {/* Confetti animation */}
        <Confetti active={showConfetti} count={50} duration={3000} />
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            <KeyRound className={`w-5 h-5 text-amber-500 mr-2 ${showConfetti ? 'animate-pulse' : ''}`} />
            {t('Redeem Promotion Code')}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg">
          <p className="font-medium">{t('Customer')}: {customerName}</p>
          <p className="text-sm text-blue-600">{t('ID')}: {customerId}</p>
          
          {/* Enrollment status indicator */}
          <div className="mt-2 pt-2 border-t border-blue-100">
            {checkingEnrollment ? (
              <p className="text-sm flex items-center">
                <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></span>
                {t('Checking enrollment status...')}
              </p>
            ) : isEnrolled ? (
              <p className="text-sm flex items-center text-green-600">
                <Check className="w-4 h-4 mr-1" /> {t('Enrolled in program')}
              </p>
            ) : (
              <p className="text-sm flex items-center text-amber-600">
                <AlertCircle className="w-4 h-4 mr-1" /> {t('Not enrolled in any program')}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center animate-shake">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg animate-fadeIn">
            <div className="flex items-center">
              <Check className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>{success}</span>
            </div>
            
            {redemptionDetails && (
              <div className="mt-2 pt-2 border-t border-green-200">
                <div className="flex items-center text-green-600">
                  <Gift className="w-4 h-4 mr-2" />
                  <span className="font-medium">{t('Reward Details')}:</span>
                </div>
                <p className="text-sm mt-1">
                  {redemptionDetails.promotionName || t('Promotion code successfully redeemed')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Not enrolled warning */}
        {!checkingEnrollment && !isEnrolled && !success && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-lg flex items-center">
            <Users className="w-5 h-5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">{t('Customer not enrolled')}</p>
              <p className="text-sm mt-1">{t('Customer must be enrolled in a program to redeem codes.')}</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('Enter Promotion Code')}
          </label>
          <div className="flex">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm transition-shadow"
              placeholder="Enter code (e.g. SUMMER25)"
              disabled={isProcessing || !isEnrolled || checkingEnrollment}
              onKeyPress={(e) => e.key === 'Enter' && handleRedeemCode()}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {t('Enter the promotion code provided by the customer')}
          </p>
        </div>

        <div className="flex justify-between space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors shadow-sm"
            disabled={isProcessing}
          >
            {t('Cancel')}
          </button>
          <button
            onClick={handleRedeemCode}
            className={`px-4 py-2 bg-amber-500 text-white rounded-lg transition-colors flex items-center shadow-sm ${
              isEnrolled && !checkingEnrollment && !isProcessing 
                ? 'hover:bg-amber-600 hover:shadow-md'
                : 'opacity-50 cursor-not-allowed'
            }`}
            disabled={isProcessing || !isEnrolled || checkingEnrollment}
          >
            {isProcessing ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
            ) : (
              <KeyRound className="w-4 h-4 mr-2" />
            )}
            {t('Redeem Code')}
          </button>
        </div>
      </div>
    </div>
  );
}; 