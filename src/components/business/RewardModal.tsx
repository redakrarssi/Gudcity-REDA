import React, { useState, useEffect } from 'react';
import { Award, Check, X, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { TransactionService } from '../../services/transactionService';
import { LoyaltyProgram } from '../../types/loyalty';

interface RewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  businessId: string;
  customerName?: string;
}

export const RewardModal: React.FC<RewardModalProps> = ({
  isOpen,
  onClose,
  customerId,
  businessId,
  customerName = 'Customer'
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [pointsToAward, setPointsToAward] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPrograms();
    }
  }, [isOpen, businessId]);

  const fetchPrograms = async () => {
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

  const handleAwardPoints = async () => {
    if (!selectedProgramId) {
      setError('Please select a program first');
      return;
    }

    if (pointsToAward <= 0) {
      setError('Points must be a positive number');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // Award points to the customer
      const result = await TransactionService.awardPoints(
        customerId,
        businessId,
        selectedProgramId,
        pointsToAward
      );

      if (result.success) {
        setSuccess(`Successfully awarded ${pointsToAward} points to ${customerName}!`);
      } else {
        setError(result.error || 'Failed to award points');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error awarding points:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            <Award className="w-5 h-5 text-green-500 mr-2" />
            {t('Give Reward Points')}
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

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('Select Program')}
              </label>
              
              {programs.length === 0 ? (
                <div className="bg-gray-50 p-4 text-center rounded-lg">
                  <p className="text-gray-600">{t('No loyalty programs found')}</p>
                </div>
              ) : (
                <select
                  value={selectedProgramId || ''}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isProcessing}
                >
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('Points to Award')}
              </label>
              <input
                type="number"
                min="1"
                value={pointsToAward}
                onChange={(e) => setPointsToAward(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={isProcessing || programs.length === 0}
              />
              <p className="mt-1 text-sm text-gray-500">
                {t('Enter the number of points to award to this customer')}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
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
              <Award className="w-4 h-4 mr-2" />
            )}
            {t('Award Points')}
          </button>
        </div>
      </div>
    </div>
  );
}; 