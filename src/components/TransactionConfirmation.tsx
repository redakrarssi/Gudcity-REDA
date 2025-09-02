import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Star, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TransactionConfirmationProps {
  type: 'success' | 'error' | 'pending';
  transactionType: 'reward' | 'redemption' | 'enrollment';
  message: string;
  details?: string;
  customerName?: string;
  businessName?: string;
  points?: number;
  amount?: number;
  onClose: () => void;
  onFeedback?: (rating: number, comment: string) => Promise<void>;
}

export const TransactionConfirmation: React.FC<TransactionConfirmationProps> = ({
  type,
  transactionType,
  message,
  details,
  customerName,
  businessName,
  points,
  amount,
  onClose,
  onFeedback
}) => {
  const { t } = useTranslation();
  const [animation, setAnimation] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Trigger animation when component mounts
  useEffect(() => {
    setAnimation(true);
    
    // Auto-hide after 5 seconds if success
    if (type === 'success') {
      const timer = setTimeout(() => {
        setAnimation(false);
        setTimeout(onClose, 300); // Wait for exit animation
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [type, onClose]);

  // Handle animations
  useEffect(() => {
    if (type === 'success') {
      const confetti = document.getElementById('transaction-confetti');
      if (confetti) {
        confetti.classList.add('active');
      }
    }
  }, [type]);

  const handleFeedbackSubmit = async () => {
    if (rating === 0 || !onFeedback) return;
    
    try {
      setSubmittingFeedback(true);
      await onFeedback(rating, comment);
      setFeedbackSubmitted(true);
      setTimeout(() => {
        setAnimation(false);
        setTimeout(onClose, 300);
      }, 1500);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 transition-opacity duration-300 ${animation ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`relative bg-white rounded-xl shadow-lg max-w-md w-full mx-4 overflow-hidden transition-all duration-300 transform ${animation ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        {/* Confetti animation for success */}
        {type === 'success' && (
          <div id="transaction-confetti" className="absolute inset-0 pointer-events-none">
            <div className="confetti-piece"></div>
            <div className="confetti-piece"></div>
            <div className="confetti-piece"></div>
            <div className="confetti-piece"></div>
            <div className="confetti-piece"></div>
            <div className="confetti-piece"></div>
            <div className="confetti-piece"></div>
            <div className="confetti-piece"></div>
            <div className="confetti-piece"></div>
            <div className="confetti-piece"></div>
          </div>
        )}
        
        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-4">
            {type === 'success' && (
              <div className="w-16 h-16 mb-4 rounded-full bg-green-50 flex items-center justify-center animate-pulse">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            )}
            
            {type === 'error' && (
              <div className="w-16 h-16 mb-4 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
            )}
            
            {type === 'pending' && (
              <div className="w-16 h-16 mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">{message}</h3>
            {details && <p className="text-gray-600 mb-2">{details}</p>}
            
            {/* Transaction details */}
            <div className="w-full bg-gray-50 rounded-lg p-4 my-4">
              {customerName && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">{t('Customer')}:</span>
                  <span className="font-medium">{customerName}</span>
                </div>
              )}
              
              {businessName && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">{t('Business')}:</span>
                  <span className="font-medium">{businessName}</span>
                </div>
              )}
              
              {points !== undefined && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">{t('Points')}:</span>
                  <span className="font-medium">{points}</span>
                </div>
              )}
              
              {amount !== undefined && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">{t('Amount')}:</span>
                  <span className="font-medium">${amount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Feedback section - only show for success */}
          {type === 'success' && !feedbackSubmitted && (
            <>
              {!showFeedback ? (
                <button
                  onClick={() => setShowFeedback(true)}
                  className="w-full py-3 px-4 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors mb-3"
                >
                  {t('Rate your experience')}
                </button>
              ) : (
                <div className="animate-fadeIn">
                  <p className="text-gray-700 mb-3 text-center">{t('How was your experience?')}</p>
                  
                  <div className="flex justify-center space-x-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        onClick={() => setRating(star)}
                        className={`p-1 transition-colors ${rating >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
                      >
                        <Star className="w-8 h-8" fill={rating >= star ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                  
                  <div className="mb-4">
                    <textarea
                      placeholder={t('Any additional comments? (optional)')}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-20"
                    />
                  </div>
                  
                  <button
                    onClick={handleFeedbackSubmit}
                    disabled={rating === 0 || submittingFeedback}
                    className={`w-full py-3 px-4 rounded-lg transition-colors ${
                      rating === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {submittingFeedback ? (
                      <span className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        {t('Submitting...')}
                      </span>
                    ) : (
                      t('Submit Feedback')
                    )}
                  </button>
                </div>
              )}
            </>
          )}
          
          {/* Feedback confirmation */}
          {feedbackSubmitted && (
            <div className="text-center text-green-600 mb-4 animate-fadeIn">
              <CheckCircle className="w-6 h-6 mx-auto mb-2" />
              {t('Thank you for your feedback!')}
            </div>
          )}
          
          <button
            onClick={() => {
              setAnimation(false);
              setTimeout(onClose, 300);
            }}
            className={`w-full py-3 px-4 rounded-lg transition-colors ${
              type === 'success' && !showFeedback && !feedbackSubmitted
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type === 'success' ? t('Done') : t('Close')}
          </button>
        </div>
      </div>
    </div>
  );
}; 