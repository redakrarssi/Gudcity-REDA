import React from 'react';
import { IconRefresh } from '../icons/IconRefresh';

export type FallbackIndicatorPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inline';

interface FallbackIndicatorProps {
  // Whether we're showing fallback data
  isUsingFallback: boolean;
  
  // Type of fallback being shown
  type: 'cache' | 'data' | 'error';
  
  // Position of the indicator
  position?: FallbackIndicatorPosition;
  
  // Callback when user clicks refresh
  onReload?: () => void;
  
  // Whether to show a compact version
  compact?: boolean;
  
  // Custom label
  label?: string;
  
  // Custom class name
  className?: string;
}

/**
 * A visual indicator that shows when we're displaying stale/cached data or fallback data
 */
export const FallbackIndicator: React.FC<FallbackIndicatorProps> = ({
  isUsingFallback,
  type,
  position = 'inline',
  onReload,
  compact = false,
  label,
  className = '',
}) => {
  if (!isUsingFallback) return null;
  
  // Determine label text
  const indicatorLabel = label || {
    cache: 'Showing cached data',
    data: 'Showing fallback data',
    error: 'Error loading latest data',
  }[type];
  
  // Determine position classes
  const positionClasses = {
    'top-left': 'fixed top-2 left-2',
    'top-right': 'fixed top-2 right-2',
    'bottom-left': 'fixed bottom-2 left-2',
    'bottom-right': 'fixed bottom-2 right-2',
    'inline': 'inline-flex',
  }[position];
  
  // Determine indicator color
  const colorClasses = {
    cache: 'bg-blue-100 text-blue-800 border-blue-300',
    data: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    error: 'bg-red-100 text-red-800 border-red-300',
  }[type];
  
  if (compact) {
    return (
      <div 
        className={`${positionClasses} rounded-full p-1 border shadow-sm ${colorClasses} flex items-center ${className}`}
        title={indicatorLabel}
      >
        <span className="sr-only">{indicatorLabel}</span>
        {onReload && (
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onReload();
            }}
            className="p-1 rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label="Refresh data"
            title="Refresh data"
          >
            <IconRefresh className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className={`${positionClasses} rounded-md py-1 px-3 border shadow-sm ${colorClasses} flex items-center ${className}`}>
      <span className="text-sm font-medium">{indicatorLabel}</span>
      {onReload && (
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReload();
          }}
          className="ml-2 p-1 rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="Refresh data"
        >
          <IconRefresh className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}; 