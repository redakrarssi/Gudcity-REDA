import React, { useState, useEffect } from 'react';
import { Award, Check, X, AlertCircle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { TransactionService } from '../../services/transactionService';
import { LoyaltyProgram, RewardTier } from '../../types/loyalty';
import { Confetti } from '../ui/Confetti';

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
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<LoyaltyProgram | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPrograms();
    }
  }, [isOpen, businessId]);
  
  useEffect(() => {
    // Find and set the selected program object when the ID changes
    if (selectedProgramId) {
      const program = programs.find(p => p.id === selectedProgramId);
      setSelectedProgram(program || null);
    } else {
      setSelectedProgram(null);
    }
  }, [selectedProgramId, programs]);

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
        // Trigger confetti animation
        setShowConfetti(true);
        
        // Hide confetti after 3 seconds
        setTimeout(() => {
          setShowConfetti(false);
        }, 3000);
      } else {
        setError(result.error || 'Failed to award points');
        playErrorSound();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error awarding points:', err);
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
  
  // Get minimum points required for a reward in the selected program
  const getMinPointsForReward = (): number | null => {
    if (!selectedProgram || !selectedProgram.rewardTiers || selectedProgram.rewardTiers.length === 0) {
      return null;
    }
    
    // Find the minimum points required across all reward tiers
    return Math.min(...selectedProgram.rewardTiers.map(tier => tier.pointsRequired));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative overflow-hidden">
        {/* Use our reusable Confetti component */}
        <Confetti active={showConfetti} count={50} duration={3000} />
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            <Award className={`w-5 h-5 text-green-500 mr-2 ${showConfetti ? 'animate-pulse' : ''}`} />
            {t('Give Reward Points')}
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
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center animate-shake">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg flex items-center animate-fadeIn">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
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
            
            {selectedProgram && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-1">{selectedProgram.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{selectedProgram.description}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <Info className="w-4 h-4 mr-1" />
                  <span>{t('Points needed for reward')}: {getMinPointsForReward() || '—'}</span>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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