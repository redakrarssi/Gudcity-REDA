import React from 'react';
import { AlertCircle, RefreshCw, DatabaseOff, WifiOff, Clock, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type ErrorType = 'database' | 'network' | 'timeout' | 'server' | 'unknown';

interface ErrorStateProps {
  error?: Error | string | null;
  errorType?: ErrorType;
  onRetry?: () => void;
  title?: string;
  message?: string;
  className?: string;
  compact?: boolean;
  showIcon?: boolean;
  showRetry?: boolean;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  errorType = 'unknown',
  onRetry,
  title,
  message,
  className = '',
  compact = false,
  showIcon = true,
  showRetry = true,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3
}) => {
  const { t } = useTranslation();
  
  // Determine error type if not explicitly provided
  const detectedErrorType = errorType || detectErrorType(error);
  
  // Get appropriate error content based on type
  const errorContent = getErrorContent(detectedErrorType, error, title, message, t);
  
  // Check if retry is disabled (when retryCount >= maxRetries)
  const retryDisabled = maxRetries > 0 && retryCount >= maxRetries;
  
  // Determine if we should show the retry button
  const shouldShowRetry = showRetry && onRetry && !retryDisabled;
  
  return (
    <div className={`rounded-lg overflow-hidden ${compact ? 'p-3' : 'p-6'} ${getErrorClassByType(detectedErrorType)} ${className}`}>
      <div className={`flex ${compact ? 'items-center' : 'flex-col md:flex-row items-start md:items-center'} gap-4`}>
        {showIcon && (
          <div className={`flex-shrink-0 ${getIconContainerClass(detectedErrorType)}`}>
            {getErrorIcon(detectedErrorType, compact)}
          </div>
        )}
        <div className="flex-1">
          <h3 className={`font-medium ${compact ? 'text-sm' : 'text-lg'} mb-1`}>
            {errorContent.title}
          </h3>
          <p className={`${compact ? 'text-xs' : 'text-sm'} opacity-80`}>
            {errorContent.message}
          </p>
          
          {error && !compact && (
            <div className="mt-2 p-2 bg-black/10 rounded-md text-xs font-mono overflow-auto max-h-24 opacity-70">
              {typeof error === 'string' ? error : error.message || 'Unknown error'}
            </div>
          )}
          
          {retryCount > 0 && (
            <div className="mt-2 text-xs">
              {t('retryAttempt', {count: retryCount, max: maxRetries}, `Retry attempt ${retryCount}/${maxRetries}`)}
            </div>
          )}
        </div>
        
        {shouldShowRetry && (
          <div className="flex-shrink-0">
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 
                ${getRetryButtonClass(detectedErrorType)}
                ${isRetrying ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
            >
              <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? t('retrying', 'Retrying...') : t('retry', 'Retry')}
            </button>
          </div>
        )}
      </div>
      
      {retryDisabled && (
        <div className="mt-3 text-center text-sm">
          <p>{t('maxRetriesReached', 'Maximum retry attempts reached. Please try again later.')}</p>
        </div>
      )}
    </div>
  );
};

// Helper function to detect error type based on error message
function detectErrorType(error: Error | string | null | undefined): ErrorType {
  if (!error) return 'unknown';
  
  const errorMessage = typeof error === 'string' ? error : error.message || '';
  
  if (errorMessage.includes('database') || 
      errorMessage.includes('sql') || 
      errorMessage.includes('query') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('DB')) {
    return 'database';
  }
  
  if (errorMessage.includes('network') || 
      errorMessage.includes('internet') ||
      errorMessage.includes('offline')) {
    return 'network';
  }
  
  if (errorMessage.includes('timeout') || 
      errorMessage.includes('timed out')) {
    return 'timeout';
  }
  
  if (errorMessage.includes('server') || 
      errorMessage.includes('500') ||
      errorMessage.includes('503')) {
    return 'server';
  }
  
  return 'unknown';
}

// Get appropriate icon based on error type
function getErrorIcon(type: ErrorType, compact: boolean): React.ReactNode {
  const size = compact ? 'w-5 h-5' : 'w-8 h-8';
  
  switch (type) {
    case 'database':
      return <DatabaseOff className={size} />;
    case 'network':
      return <WifiOff className={size} />;
    case 'timeout':
      return <Clock className={size} />;
    case 'server':
      return <Server className={size} />;
    case 'unknown':
    default:
      return <AlertCircle className={size} />;
  }
}

// Get appropriate background and text color classes based on error type
function getErrorClassByType(type: ErrorType): string {
  switch (type) {
    case 'database':
      return 'bg-blue-50 text-blue-800 border border-blue-200';
    case 'network':
      return 'bg-purple-50 text-purple-800 border border-purple-200';
    case 'timeout':
      return 'bg-yellow-50 text-yellow-800 border border-yellow-200';
    case 'server':
      return 'bg-orange-50 text-orange-800 border border-orange-200';
    case 'unknown':
    default:
      return 'bg-red-50 text-red-800 border border-red-200';
  }
}

// Get appropriate icon container class based on error type
function getIconContainerClass(type: ErrorType): string {
  switch (type) {
    case 'database':
      return 'text-blue-600 bg-blue-100 p-2 rounded-full';
    case 'network':
      return 'text-purple-600 bg-purple-100 p-2 rounded-full';
    case 'timeout':
      return 'text-yellow-600 bg-yellow-100 p-2 rounded-full';
    case 'server':
      return 'text-orange-600 bg-orange-100 p-2 rounded-full';
    case 'unknown':
    default:
      return 'text-red-600 bg-red-100 p-2 rounded-full';
  }
}

// Get appropriate retry button class based on error type
function getRetryButtonClass(type: ErrorType): string {
  switch (type) {
    case 'database':
      return 'bg-blue-600 text-white hover:bg-blue-700';
    case 'network':
      return 'bg-purple-600 text-white hover:bg-purple-700';
    case 'timeout':
      return 'bg-yellow-600 text-white hover:bg-yellow-700';
    case 'server':
      return 'bg-orange-600 text-white hover:bg-orange-700';
    case 'unknown':
    default:
      return 'bg-red-600 text-white hover:bg-red-700';
  }
}

// Get appropriate error content based on error type
function getErrorContent(
  type: ErrorType, 
  error: Error | string | null | undefined,
  customTitle?: string,
  customMessage?: string,
  t?: any
): { title: string; message: string } {
  // Default translation function if not provided
  const translate = t || ((key: string, defaultValue: string) => defaultValue);
  
  // Custom messages take precedence if provided
  if (customTitle && customMessage) {
    return { title: customTitle, message: customMessage };
  }
  
  switch (type) {
    case 'database':
      return {
        title: customTitle || translate('databaseErrorTitle', 'Database Connection Error'),
        message: customMessage || translate('databaseErrorMessage', 
          'We\'re having trouble connecting to our database. This might be temporary, please try again.')
      };
    case 'network':
      return {
        title: customTitle || translate('networkErrorTitle', 'Network Connection Error'),
        message: customMessage || translate('networkErrorMessage', 
          'Please check your internet connection and try again.')
      };
    case 'timeout':
      return {
        title: customTitle || translate('timeoutErrorTitle', 'Request Timeout'),
        message: customMessage || translate('timeoutErrorMessage', 
          'The request took too long to complete. Please try again.')
      };
    case 'server':
      return {
        title: customTitle || translate('serverErrorTitle', 'Server Error'),
        message: customMessage || translate('serverErrorMessage', 
          'Our servers are currently experiencing issues. Our team has been notified.')
      };
    case 'unknown':
    default:
      return {
        title: customTitle || translate('unknownErrorTitle', 'Something Went Wrong'),
        message: customMessage || translate('unknownErrorMessage', 
          'An unexpected error occurred. Please try again or contact support if the problem persists.')
      };
  }
}
