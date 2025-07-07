import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, X, Star, AlertCircle, Check } from 'lucide-react';
import { LoyaltyCardQrCodeData, CustomerQrCodeData, QrCodeData } from '../../types/qrCode';
import { LoyaltyProgram } from '../../types/loyalty';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { LoyaltyCardService } from '../../services/loyaltyCardService';
import { QrCodeService } from '../../services/qrCodeService';
import { CustomerNotificationService } from '../../services/customerNotificationService';
import { Confetti } from '../ui/Confetti';

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
      const businessPrograms = await LoyaltyProgramService.getBusinessPrograms(businessId);
      setPrograms(businessPrograms);
      
      // Set default program if available
      if (businessPrograms.length > 0) {
        setSelectedProgramId(businessPrograms[0].id);
      }
    } catch (err) {
      setError('Failed to load loyalty programs');
      console.error('Error fetching business programs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerInfo = async () => {
    if (!scanData) return;
    
    const customerId = scanData.customerId?.toString();
    if (!customerId) return;
    
    try {
      const customer = await LoyaltyCardService.getCustomerInfo(customerId);
      if (customer && customer.name) {
        setCustomerName(customer.name);
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
    setSuccess(null);
    
    try {
      // If this is a loyalty card QR code with a specific card ID
      if (scanData.type === 'loyaltyCard' && scanData.cardId) {
        const result = await LoyaltyCardService.awardPointsToCard(
          scanData.cardId.toString(),
          pointsToAward,
          'SCAN',
          'Points awarded via QR code scan',
          `qr-scan-${Date.now()}`,
          businessId
        );
        
        if (result) {
          setSuccess(`Successfully awarded ${pointsToAward} points to ${customerName}`);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        } else {
          setError('Failed to award points to the loyalty card');
        }
      } 
      // If this is a customer QR code, we need to get their card for the selected program
      else if (scanData.type === 'customer') {
        // Process the customer QR code scan with the selected program
        const result = await QrCodeService.processQrCodeScan(
          {
            ...scanData,
            type: 'customer'
          },
          businessId,
          pointsToAward
        );
        
        if (result.success) {
          setSuccess(`Successfully awarded ${pointsToAward} points to ${customerName}`);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        } else {
          setError(result.message || 'Failed to award points');
        }
      } else {
        setError('Unsupported QR code type');
      }
    } catch (err) {
      console.error('Error awarding points:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
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
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-t-green-500 border-gray-200 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-red-800">{error}</p>
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
            {t('Award Points')}
          </button>
        </div>
      </div>
    </div>
  );
}; 