import React from 'react';
import { AlertCircle, RefreshCw, Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type ErrorType = 'database' | 'network' | 'unknown';

interface ErrorStateProps {
  error?: Error | string | null;
  errorType?: ErrorType;
  onRetry?: () => void;
  title?: string;
  message?: string;
  isRetrying?: boolean;
  retryCount?: number;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  errorType = 'unknown',
  onRetry,
  title,
  message,
  isRetrying = false,
  retryCount = 0
}) => {
  const { t } = useTranslation();
  
  // Determine error type if not explicitly provided
  const detectedErrorType = errorType || (error?.toString().includes('database') ? 'database' : 'unknown');
  
  // Get error title based on type
  const errorTitle = title || (
    detectedErrorType === 'database' 
      ? t('databaseErrorTitle', 'Database Connection Error')
      : t('unknownErrorTitle', 'Something Went Wrong')
  );
  
  // Get error message based on type
  const errorMessage = message || (
    detectedErrorType === 'database'
      ? t('databaseErrorMessage', 'We\'re having trouble connecting to our database. This might be temporary, please try again.')
      : t('unknownErrorMessage', 'An unexpected error occurred. Please try again or contact support if the problem persists.')
  );
  
  return (
    <div className={`rounded-lg p-6 ${
      detectedErrorType === 'database' 
        ? 'bg-blue-50 text-blue-800 border border-blue-200' 
        : 'bg-red-50 text-red-800 border border-red-200'
    }`}>
      <div className="flex items-center gap-4">
        <div className={`flex-shrink-0 ${
          detectedErrorType === 'database'
            ? 'text-blue-600 bg-blue-100 p-2 rounded-full'
            : 'text-red-600 bg-red-100 p-2 rounded-full'
        }`}>
          {detectedErrorType === 'database' ? (
            <Database className="w-8 h-8" />
          ) : (
            <AlertCircle className="w-8 h-8" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-lg mb-1">
            {errorTitle}
          </h3>
          <p className="text-sm opacity-80">
            {errorMessage}
          </p>
          
          {error && (
            <div className="mt-2 p-2 bg-black/10 rounded-md text-xs font-mono overflow-auto max-h-24 opacity-70">
              {typeof error === 'string' ? error : error.message || 'Unknown error'}
            </div>
          )}
          
          {retryCount > 0 && (
            <div className="mt-2 text-xs">
              {t('retryAttempt', `Retry attempt ${retryCount}`)}
            </div>
          )}
        </div>
        
        {onRetry && (
          <div className="flex-shrink-0">
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 
                ${detectedErrorType === 'database' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-red-600 text-white hover:bg-red-700'
                }
                ${isRetrying ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
            >
              <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? t('retrying', 'Retrying...') : t('retry', 'Retry')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 