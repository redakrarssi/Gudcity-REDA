import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Check, AlertCircle, Package, User, Calendar, Star, Clock } from 'lucide-react';
import { LoyaltyCardService } from '../../services/loyaltyCardService';
import { useAuth } from '../../contexts/AuthContext';

interface RedemptionVerificationProps {
  className?: string;
}

interface RedemptionDetails {
  id: number;
  tracking_code: string;
  customer_name: string;
  business_name: string;
  program_name: string;
  reward_name: string;
  points_redeemed: number;
  status: 'PENDING' | 'DELIVERED';
  created_at: string;
  delivered_at?: string;
}

export const RedemptionVerification: React.FC<RedemptionVerificationProps> = ({ className }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [trackingCode, setTrackingCode] = useState('');
  const [redemption, setRedemption] = useState<RedemptionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleVerifyCode = async () => {
    if (!trackingCode.trim()) {
      setError('Please enter a tracking code');
      return;
    }

    if (trackingCode.length !== 6) {
      setError('Tracking code must be 6 digits');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await LoyaltyCardService.verifyRedemption(trackingCode);
      
      if (result.success && result.redemption) {
        setRedemption(result.redemption);
        setError(null);
      } else {
        setError(result.message || 'Invalid tracking code');
        setRedemption(null);
      }
    } catch (err) {
      setError('Error verifying tracking code');
      setRedemption(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!redemption || !user?.id) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await LoyaltyCardService.markRedemptionDelivered(
        redemption.tracking_code,
        user.id.toString()
      );

      if (result.success) {
        setSuccess('Redemption marked as delivered successfully!');
        setRedemption({ ...redemption, status: 'DELIVERED', delivered_at: new Date().toISOString() });
      } else {
        setError(result.message || 'Failed to mark as delivered');
      }
    } catch (err) {
      setError('Error marking redemption as delivered');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 6);
    setTrackingCode(value);
    
    // Clear previous results when code changes
    if (redemption) {
      setRedemption(null);
    }
    if (error) {
      setError(null);
    }
    if (success) {
      setSuccess(null);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {t('Redemption Verification')}
        </h2>
        <p className="text-gray-600 text-sm">
          {t('Enter the 6-digit tracking code to verify customer redemptions and confirm delivery')}
        </p>
      </div>

      {/* Tracking Code Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('6-Digit Tracking Code')}
        </label>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={trackingCode}
              onChange={handleCodeChange}
              placeholder="Enter 6-digit code..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl font-mono tracking-widest"
              maxLength={6}
            />
          </div>
          <button
            onClick={handleVerifyCode}
            disabled={loading || trackingCode.length !== 6}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Search className="w-4 h-4" />
            )}
            {t('Verify')}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {/* Redemption Details */}
      {redemption && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              {t('Redemption Details')}
            </h3>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{t('Status')}:</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                redemption.status === 'DELIVERED'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {redemption.status === 'DELIVERED' ? '✅ Delivered' : '⏳ Pending'}
              </span>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-blue-600 uppercase tracking-wide">{t('Customer')}</p>
                  <p className="font-semibold text-blue-900">{redemption.customer_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <Star className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-xs text-purple-600 uppercase tracking-wide">{t('Program')}</p>
                  <p className="font-semibold text-purple-900">{redemption.program_name}</p>
                </div>
              </div>
            </div>

            {/* Reward Details */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">{t('Reward Redeemed')}</h4>
              <p className="text-green-700 text-lg">{redemption.reward_name}</p>
              <p className="text-green-600 text-sm mt-1">
                {redemption.points_redeemed} {t('points redeemed')}
              </p>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-600">{t('Redeemed At')}</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(redemption.created_at)}</p>
                </div>
              </div>

              {redemption.delivered_at && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-xs text-green-600">{t('Delivered At')}</p>
                    <p className="text-sm font-medium text-green-800">{formatDate(redemption.delivered_at)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            {redemption.status === 'PENDING' && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleMarkDelivered}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  {t('Mark as Delivered')}
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  {t('Click this button once you have delivered the reward to the customer')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!redemption && !error && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">{t('How to use')}:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• {t('Customer shows you their 6-digit tracking code')}</li>
            <li>• {t('Enter the code above and click Verify')}</li>
            <li>• {t('Review the redemption details')}</li>
            <li>• {t('Deliver the reward and click "Mark as Delivered"')}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default RedemptionVerification;