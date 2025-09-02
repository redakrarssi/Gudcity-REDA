import React, { ReactNode, useEffect } from 'react';
import { FallbackIndicator, useFallback } from '../FallbackIndicator';
import { ErrorState } from './ErrorState';
import { FEATURES } from '../../utils/env';

interface DataLoaderProps<TData> {
  // The data to display
  data: TData | undefined;
  
  // Loading state
  isLoading: boolean;
  
  // Error state
  isError: boolean;
  error?: Error | null;
  
  // Stale/fallback data flags
  isUsingStaleData?: boolean;
  isUsingFallbackData?: boolean;
  
  // Function to reload data
  refetch?: () => Promise<any>;
  
  // Whether to show a fallback indicator
  showFallbackIndicator?: boolean;
  
  // Element to show when loading
  loadingElement?: ReactNode;
  
  // Element to show when there's an error
  errorElement?: ReactNode;
  
  // Function to render the data
  children: (data: TData) => ReactNode;
}

/**
 * A consistent wrapper for data-fetching components
 * Handles loading, error, and empty states
 */
export function DataLoader<TData>({
  data,
  isLoading,
  isError,
  error,
  isUsingStaleData = false,
  isUsingFallbackData = false,
  refetch,
  showFallbackIndicator = true,
  loadingElement = <div className="p-4 text-center">Loading...</div>,
  errorElement,
  children,
}: DataLoaderProps<TData>): JSX.Element {
  // Access the fallback context
  const fallbackContext = useFallback();
  
  // Update fallback context when component mounts or status changes
  useEffect(() => {
    if (!FEATURES.fallback.enabled) return;
    
    // Only update if this component is using fallback data and it's not already set
    if ((isUsingStaleData || isUsingFallbackData) && !fallbackContext.isUsingFallback) {
      fallbackContext.setFallbackState({
        isUsingFallback: true,
        fallbackType: isUsingStaleData ? 'cache' : 'data'
      });
    }
  }, [isUsingStaleData, isUsingFallbackData, fallbackContext]);
  
  // Show loading state if loading and no data
  if (isLoading && !data) {
    return <>{loadingElement}</>;
  }
  
  // Show error state if error and no data
  if (isError && !data) {
    return errorElement ? (
      <>{errorElement}</>
    ) : (
      <ErrorState 
        error={error} 
        onRetry={refetch} 
        title="Unable to load data" 
      />
    );
  }
  
  // If we have data, render it with an optional fallback indicator
  if (data) {
    const shouldShowLocalIndicator = 
      showFallbackIndicator && 
      (isUsingStaleData || isUsingFallbackData) && 
      !fallbackContext.isUsingFallback; // Don't show local if global is showing
      
    return (
      <>
        {shouldShowLocalIndicator && (
          <FallbackIndicator
            isUsingFallback={true}
            type={isUsingStaleData ? 'cache' : 'data'}
            position="top-right"
            onReload={refetch}
            compact
          />
        )}
        {children(data)}
      </>
    );
  }
  
  // No data, no loading, no error - show empty state
  return <div className="p-4 text-center text-gray-500">No data available</div>;
}

export default DataLoader; 