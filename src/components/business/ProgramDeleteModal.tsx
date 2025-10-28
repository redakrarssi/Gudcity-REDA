import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, Users, Bell } from 'lucide-react';

interface ProgramDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  programName: string;
  enrolledCustomersCount?: number;
}

export const ProgramDeleteModal: React.FC<ProgramDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  programName,
  enrolledCustomersCount = 0
}) => {
  const { t } = useTranslation();
  const [confirmationText, setConfirmationText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const requiredText = 'I WANT TO DELETE THIS PROGRAM';
  const isConfirmationValid = confirmationText.trim() === requiredText;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmationText('');
      setIsTyping(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (isConfirmationValid) {
      onConfirm();
      onClose();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmationText(e.target.value);
    setIsTyping(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {t('business.Delete Program')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  {t('business.Permanent Action Warning')}
                </h3>
                <p className="text-sm text-red-700">
                  {t('business.You are about to permanently delete the program')} "<span className="font-semibold">{programName}</span>". 
                  {t('business.This action cannot be undone.')}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Notification Warning */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex items-center mr-3">
                <Users className="w-5 h-5 text-orange-500" />
                <Bell className="w-4 h-4 text-orange-500 -ml-1" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-orange-800 mb-1">
                  {t('business.Customer Notification')}
                </h3>
                <p className="text-sm text-orange-700">
                  {enrolledCustomersCount > 0 ? (
                    <>
                      <span className="font-semibold">{enrolledCustomersCount}</span> {t('business.enrolled customers will be automatically notified')} 
                      {t('business.about this program deletion via red alert notifications.')}
                    </>
                  ) : (
                    t('business.All enrolled customers will be automatically notified about this program deletion via red alert notifications.')
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* What will happen */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-2">
              {t('business.What will happen:')}
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• {t('business.Program will be permanently deleted')}</li>
              <li>• {t('business.All customer enrollments will be removed')}</li>
              <li>• {t('business.All reward tiers will be deleted')}</li>
              <li>• {t('business.Customer points from this program will be lost')}</li>
              <li className="text-red-600 font-medium">• {t('business.All enrolled customers will receive red alert notifications')}</li>
            </ul>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {t('business.To confirm deletion, type exactly:')} 
              <span className="block font-mono text-red-600 bg-red-50 p-2 rounded mt-1 text-center">
                {requiredText}
              </span>
            </label>
            
            <input
              type="text"
              value={confirmationText}
              onChange={handleInputChange}
              placeholder={t('business.Type the confirmation text here...')}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none font-mono text-center ${
                isTyping 
                  ? isConfirmationValid 
                    ? 'border-green-300 focus:ring-green-500 bg-green-50' 
                    : 'border-red-300 focus:ring-red-500 bg-red-50'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              autoComplete="off"
              spellCheck={false}
            />
            
            {isTyping && (
              <div className={`text-sm text-center ${
                isConfirmationValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {isConfirmationValid 
                  ? t('business.✓ Confirmation text matches. You can now delete the program.')
                  : t('business.✗ Confirmation text does not match. Please type exactly as shown above.')
                }
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('business.Cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmationValid}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isConfirmationValid
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {t('business.Delete Program')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgramDeleteModal;
