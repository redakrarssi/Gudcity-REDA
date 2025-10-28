import React, { useState, useEffect } from 'react';
import { Users, Check, X, AlertCircle, Search, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { CustomerNotificationService } from '../../services/customerNotificationService'; 
import { LoyaltyProgram } from '../../types/loyalty';
import { Confetti } from '../ui/Confetti';
import { useNotifications } from '../../contexts/NotificationContext';
import { listenForUserEvents } from '../../utils/socket';
import { safeEnrollCustomer } from '../../utils/enrollmentHelper';

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
  const [enrollmentStatus, setEnrollmentStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');

  useEffect(() => {
    if (isOpen) {
      fetchPrograms();
      setEnrollmentStatus('none');
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

  // Listen for enrollment response notifications
  useEffect(() => {
    if (!businessId || !isOpen || enrollmentStatus !== 'pending') return;
    
    const handleEnrollmentResponse = (notification: any) => {
      if (!notification) return;
      
      // Check if this is a response to our enrollment request
      if (notification.type === 'ENROLLMENT_ACCEPTED' && 
          notification.data?.customerId === customerId && 
          notification.data?.programId === selectedProgramId) {
        // Customer accepted the enrollment
        setEnrollmentStatus('accepted');
        setSuccess(`${customerName} has accepted the enrollment invitation!`);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      } else if (notification.type === 'ENROLLMENT_REJECTED' && 
                notification.data?.customerId === customerId && 
                notification.data?.programId === selectedProgramId) {
        // Customer rejected the enrollment
        setEnrollmentStatus('rejected');
        setError(`${customerName} has declined the enrollment invitation.`);
      }
    };
    
    // Set up real-time listener for enrollment responses
    const cleanup = listenForUserEvents(businessId, 'notification', handleEnrollmentResponse);
    
    return cleanup;
  }, [businessId, customerId, selectedProgramId, enrollmentStatus, customerName, isOpen]);

  const handleEnrollCustomer = async () => {
    if (!selectedProgramId) {
      setError('Please select a program first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // Get the selected program details for messages
      const program = programs.find(p => p.id === selectedProgramId);
      const programName = program ? program.name : 'the program';
      
      // Use our safer enrollment function that handles errors better
      const result = await safeEnrollCustomer(
        customerId,
        selectedProgramId,
        true // requireApproval = true to trigger customer notification
      );

      if (result && result.success) {
        // Set status to pending - waiting for customer response
        setEnrollmentStatus('pending');
        setSuccess(
          t('notifications.waitingForEnrollmentResponse', {
            customerName,
            programName
          })
        );
        
        // Create a notification for the business dashboard about the pending enrollment
        try {
          await CustomerNotificationService.createNotification({
            customerId: businessId,
            businessId: businessId,
            type: 'ENROLLMENT_PENDING',
            title: t('notifications.enrollmentRequestSent'),
            message: t('notifications.waitingForEnrollmentResponse', { customerName, programName }),
            requiresAction: false,
            actionTaken: false,
            isRead: false,
            data: {
              customerId,
              programName,
              timestamp: new Date().toISOString()
            }
          });
        } catch (notificationError) {
          console.error('Error creating business notification:', notificationError);
          // Don't fail the whole process if just the business notification fails
        }
      } else {
        // Use the specific error message if provided
        const errorMessage = result?.error || result?.message || 'Failed to send enrollment invitation';
        setError(errorMessage);
        console.error('Enrollment error:', result);
        playErrorSound();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {showConfetti && <Confetti active={showConfetti} />}
      
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">{t('Enroll Customer in Program')}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 flex items-start">
              <Check className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}
          
          <div className="mb-4">
            <p className="text-gray-700 mb-2">
              <span className="font-medium">{t('Customer')}:</span> {customerName}
            </p>
          </div>

          {/* Status indicators for enrollment */}
          {enrollmentStatus === 'pending' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
              <span>{t('Waiting for customer response...')}</span>
            </div>
          )}
          
          {enrollmentStatus === 'accepted' && (
            <div className="mb-4 p-3 bg-green-50 border border-green-100 text-green-700 rounded-lg flex items-center">
              <Check className="w-5 h-5 mr-2" />
              <span>{t('Customer has accepted the enrollment invitation!')}</span>
            </div>
          )}
          
          {enrollmentStatus === 'rejected' && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-100 text-amber-700 rounded-lg flex items-center">
              <X className="w-5 h-5 mr-2" />
              <span>{t('Customer has declined the enrollment invitation.')}</span>
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
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredPrograms.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {t('No programs found')}
                </div>
              ) : (
                filteredPrograms.map(program => (
                  <div
                    key={program.id}
                    onClick={() => setSelectedProgramId(program.id)}
                    className={`p-3 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-200 last:border-b-0 ${
                      selectedProgramId === program.id ? 'bg-blue-50' : ''
                    }`}
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
              disabled={!selectedProgramId || isProcessing || enrollmentStatus === 'pending'}
              className={`px-4 py-2 bg-blue-500 text-white rounded-lg transition-colors flex items-center shadow-sm hover:shadow-md ${
                !selectedProgramId || isProcessing || enrollmentStatus === 'pending' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
              }`}
            >
              {isProcessing ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              ) : (
                <Users className="w-4 h-4 mr-2" />
              )}
              {enrollmentStatus === 'pending' ? t('Invitation Sent') : t('Enroll Customer')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};