import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  error: Error | string | null | undefined;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

/**
 * Reusable error state component for displaying errors with retry capability
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  title,
  className = ''
}) => {
  const { t } = useTranslation();
  
  // Extract error message from different error types
  const errorMessage = error 
    ? (typeof error === 'string' 
        ? error 
        : (error instanceof Error 
            ? error.message 
            : 'An unknown error occurred'))
    : 'An error occurred';
  
  return (
    <div className={`bg-red-50 border border-red-200 rounded-xl p-6 text-center ${className}`}>
      <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
      {title && <h3 className="text-lg font-medium text-red-700 mb-2">{title}</h3>}
      <p className="text-red-600 mb-3">{errorMessage}</p>
      {onRetry && (
        <button 
          onClick={onRetry} 
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          {t('retry', 'Retry')}
        </button>
      )}
    </div>
  );
}; 