import React, { useState } from 'react';
import { KeyRound, Check, X, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PromoService } from '../../services/promoService';

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

  if (!isOpen) return null;

  const handleRedeemCode = async () => {
    if (!promoCode.trim()) {
      setError('Please enter a promotion code');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await PromoService.redeemCode(
        promoCode.trim(),
        customerId
      );

      if (result.success) {
        setSuccess(`Code redeemed successfully! Value: ${result.redemption?.value} ${result.redemption?.currency || ''}`);
        setPromoCode('');
      } else {
        setError(result.error || 'Failed to redeem code');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            <KeyRound className="w-5 h-5 text-amber-500 mr-2" />
            {t('Redeem Promotion Code')}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg">
          <p className="font-medium">{t('Customer')}: {customerName}</p>
          <p className="text-sm text-blue-600">{t('ID')}: {customerId}</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg flex items-center">
            <Check className="w-5 h-5 mr-2 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('Enter Promotion Code')}
          </label>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Enter code (e.g. SUMMER25)"
            disabled={isProcessing}
          />
          <p className="mt-2 text-sm text-gray-500">
            {t('Enter the promotion code provided by the customer')}
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
            disabled={isProcessing}
          >
            {t('Cancel')}
          </button>
          <button
            onClick={handleRedeemCode}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center"
            disabled={isProcessing}
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