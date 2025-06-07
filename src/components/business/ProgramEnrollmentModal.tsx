import React, { useState, useEffect } from 'react';
import { Users, Check, X, AlertCircle, Search, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { LoyaltyProgram } from '../../types/loyalty';
import { Confetti } from '../ui/Confetti';

interface ProgramEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  businessId: string;
  customerName?: string;
}

export const ProgramEnrollmentModal: React.FC<ProgramEnrollmentModalProps> = ({
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

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
    } catch (err) {
      setError('Failed to load loyalty programs');
      console.error('Error fetching business programs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnrollCustomer = async () => {
    if (!selectedProgramId) {
      setError('Please select a program first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // Enroll customer in the selected program
      const result = await LoyaltyProgramService.enrollCustomer(
        customerId,
        selectedProgramId
      );

      if (result && result.success) {
        // Get the selected program details for the success message
        const program = programs.find(p => p.id === selectedProgramId);
        const programName = program ? program.name : 'the program';
        
        setSuccess(`Successfully enrolled ${customerName} in ${programName}!`);
        setSelectedProgramId(null);
        setShowConfetti(true);
        
        // Hide confetti after a few seconds
        setTimeout(() => {
          setShowConfetti(false);
        }, 3000);
      } else {
        setError(result?.error || 'Failed to enroll customer');
        playErrorSound();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error enrolling customer:', err);
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

  // Filter programs by search term
  const filteredPrograms = programs.filter(program =>
    program.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 relative overflow-hidden">
        {/* Confetti animation */}
        <Confetti active={showConfetti} count={50} duration={3000} />
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            <Users className={`w-5 h-5 text-blue-500 mr-2 ${showConfetti ? 'animate-pulse' : ''}`} />
            {t('Enroll in Loyalty Program')}
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

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder={t('Search programs...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-shadow"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : programs.length === 0 ? (
          <div className="bg-gray-50 p-6 text-center rounded-lg">
            <p className="text-gray-600">{t('No loyalty programs found')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('Create a loyalty program first')}</p>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto mb-4 border border-gray-200 rounded-lg shadow-sm">
            {filteredPrograms.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-gray-500">{t('No matching programs found')}</p>
              </div>
            ) : (
              filteredPrograms.map(program => (
                <div
                  key={program.id}
                  className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors ${
                    selectedProgramId === program.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => setSelectedProgramId(program.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-900">{program.name}</h4>
                      <p className="text-sm text-gray-600 mt-0.5">{program.description}</p>
                      <div className="flex items-center mt-1 space-x-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          {t(program.type)}
                        </span>
                        {program.rewardTiers && program.rewardTiers.length > 0 && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center">
                            <Award className="w-3 h-3 mr-1" />
                            {program.rewardTiers.length} {program.rewardTiers.length === 1 ? t('Reward') : t('Rewards')}
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedProgramId === program.id && (
                      <Check className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors shadow-sm"
            disabled={isProcessing}
          >
            {t('Cancel')}
          </button>
          <button
            onClick={handleEnrollCustomer}
            disabled={!selectedProgramId || isProcessing}
            className={`px-4 py-2 bg-blue-500 text-white rounded-lg transition-colors flex items-center shadow-sm hover:shadow-md ${
              !selectedProgramId || isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            {isProcessing ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
            ) : (
              <Users className="w-4 h-4 mr-2" />
            )}
            {t('Enroll Customer')}
          </button>
        </div>
      </div>
    </div>
  );
}; 