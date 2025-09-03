import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Check, HelpCircle, RefreshCw, X } from 'lucide-react';

export interface EnrollmentErrorDisplayProps {
  id: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  errorCode?: string;
  errorLocation?: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const EnrollmentErrorDisplay: React.FC<EnrollmentErrorDisplayProps> = ({
  id,
  status,
  message,
  errorCode,
  errorLocation,
  details,
  onRetry,
  onDismiss
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const toggleDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDetails(!showDetails);
  };
  
  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRetry) onRetry();
  };
  
  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDismiss) onDismiss();
  };
  
  const getErrorHelp = () => {
    if (!errorCode) return null;
    
    switch (errorCode) {
      case 'ERR_APPROVAL_NOT_FOUND':
        return "The request may have expired or already been processed.";
      case 'ERR_DATABASE':
        return "There might be a temporary issue with our database. Please try again in a moment.";
      case 'ERR_NOTIFICATION_CREATION_FAILED':
        return "We couldn't send a notification, but your request may have been processed.";
      case 'ERR_ENROLLMENT_CREATION_FAILED':
        return "We had trouble enrolling you. Please check your enrollment status in your dashboard.";
      case 'ERR_CARD_CREATION_FAILED':
        return "Your card wasn't created. Try refreshing your cards page in a few moments.";
      case 'ERR_TRANSACTION_FAILED':
        return "The operation couldn't be completed. Please try again or contact support.";
      default:
        return null;
    }
  };
  
  const helpText = getErrorHelp();
  
  return (
    <div className={`mt-2 text-sm rounded-md p-3 ${
      status === 'success' 
        ? 'bg-green-100 text-green-700 border border-green-200' 
        : status === 'warning'
          ? 'bg-amber-100 text-amber-700 border border-amber-200'
          : 'bg-red-100 text-red-700 border border-red-200'
    }`}>
      <div className="flex items-start">
        {status === 'success' ? (
          <Check className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
        ) : status === 'warning' ? (
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p>{message}</p>
          
          {helpText && (
            <p className="text-xs mt-1 italic">
              {helpText}
            </p>
          )}
          
          {status === 'error' && (
            <>
              {errorLocation && (
                <p className="text-xs mt-1 text-red-600">
                  <span className="font-medium">Location:</span> {errorLocation}
                </p>
              )}
              
              {errorCode && (
                <p className="text-xs mt-1 text-red-600">
                  <span className="font-medium">Error code:</span> {errorCode}
                </p>
              )}
              
              {details && (
                <div className="mt-2">
                  <button
                    onClick={toggleDetails}
                    className="text-xs flex items-center text-red-700 hover:text-red-800"
                  >
                    <HelpCircle className="h-3 w-3 mr-1" />
                    {showDetails ? t('hideTechnicalDetails') : t('showTechnicalDetails')}
                  </button>
                  
                  {showDetails && (
                    <pre className="mt-2 p-2 bg-red-50 text-red-800 text-xs overflow-auto max-h-32 rounded">
                      {details}
                    </pre>
                  )}
                </div>
              )}
              
              <div className="flex space-x-2 mt-3">
                {onRetry && (
                  <button
                    onClick={handleRetry}
                    className="px-2 py-1 text-xs rounded-md bg-red-700 text-white hover:bg-red-800 flex items-center"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Try again
                  </button>
                )}
                
                {onDismiss && (
                  <button
                    onClick={handleDismiss}
                    className="px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 hover:bg-red-50 flex items-center"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Dismiss
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnrollmentErrorDisplay; 