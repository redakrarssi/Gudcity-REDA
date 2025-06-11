import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Database, Info } from 'lucide-react';
import { FEATURES } from '../utils/env';
import telemetry, { ConnectionStatus } from '../utils/telemetry';

// Define the fallback context state type
interface FallbackContextType {
  isUsingFallback: boolean;
  fallbackType: 'data' | 'connection' | 'cache';
  connectionStatus: ConnectionStatus;
  showIndicator: boolean;
  setFallbackState: (state: Partial<Omit<FallbackContextType, 'setFallbackState'>>) => void;
}

// Create the context with default values
const FallbackContext = createContext<FallbackContextType>({
  isUsingFallback: false,
  fallbackType: 'data',
  connectionStatus: 'connected',
  showIndicator: FEATURES.fallback.showIndicator,
  setFallbackState: () => {}
});

// Provider component to wrap the application with
export const FallbackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fallbackState, setFallbackState] = useState<Omit<FallbackContextType, 'setFallbackState'>>({
    isUsingFallback: false,
    fallbackType: 'data',
    connectionStatus: 'connected',
    showIndicator: FEATURES.fallback.showIndicator
  });
  
  // Update state function
  const updateFallbackState = (newState: Partial<Omit<FallbackContextType, 'setFallbackState'>>) => {
    setFallbackState(prevState => ({
      ...prevState,
      ...newState
    }));
  };
  
  // Subscribe to connection status changes
  useEffect(() => {
    if (!FEATURES.fallback.enabled) return;
    
    const unsubscribe = telemetry.subscribeToConnectionStatus((status) => {
      updateFallbackState({
        connectionStatus: status,
        isUsingFallback: status !== 'connected',
        fallbackType: 'connection'
      });
    });
    
    return unsubscribe;
  }, []);
  
  return (
    <FallbackContext.Provider value={{
      ...fallbackState,
      setFallbackState: updateFallbackState
    }}>
      {children}
    </FallbackContext.Provider>
  );
};

// Hook to use the fallback context
export const useFallback = () => useContext(FallbackContext);

// Function to set global fallback state from anywhere
export const setGlobalFallbackState = (state: Partial<Omit<FallbackContextType, 'setFallbackState'>>) => {
  const context = useContext(FallbackContext);
  if (context) {
    context.setFallbackState(state);
  }
};

interface FallbackIndicatorProps {
  isUsingFallback?: boolean;
  type?: 'data' | 'connection' | 'cache';
  message?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'banner';
  onReload?: () => void;
  compact?: boolean;
}

/**
 * Component that shows a visual indicator when fallback data is being used
 * instead of real-time database data.
 */
export const FallbackIndicator: React.FC<FallbackIndicatorProps> = ({
  isUsingFallback: propIsUsingFallback,
  type: propType = 'data',
  message,
  position = 'top-right',
  onReload,
  compact = false
}) => {
  const { t } = useTranslation();
  const fallbackContext = useFallback();
  
  // Use prop values if provided, otherwise use context values
  const isUsingFallback = propIsUsingFallback !== undefined 
    ? propIsUsingFallback 
    : fallbackContext.isUsingFallback;
    
  const type = propType || fallbackContext.fallbackType;
  
  // Don't render anything if not using fallback or indicators are disabled
  if (!isUsingFallback || !FEATURES.fallback.showIndicator || !fallbackContext.showIndicator) {
    return null;
  }
  
  // Get position classes
  const positionClasses = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-right': 'bottom-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'banner': 'top-0 left-0 right-0'
  }[position];
  
  // Get icon and colors based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'connection':
        return {
          icon: <Database className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200'
        };
      case 'cache':
        return {
          icon: <Info className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
          bgColor: 'bg-green-50',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'data':
      default:
        return {
          icon: <AlertTriangle className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-800',
          borderColor: 'border-amber-200'
        };
    }
  };
  
  const { icon, bgColor, textColor, borderColor } = getTypeConfig();
  
  // Get connection status message if applicable
  const getConnectionStatusMessage = () => {
    if (type !== 'connection') return null;
    
    switch (fallbackContext.connectionStatus) {
      case 'disconnected':
        return t('databaseDisconnected', 'Database disconnected');
      case 'reconnecting':
        return t('databaseReconnecting', 'Reconnecting to database...');
      case 'degraded':
        return t('databaseDegraded', 'Database performance issues');
      default:
        return null;
    }
  };
  
  // Default messages based on type
  const defaultMessage = getConnectionStatusMessage() || {
    'data': t('usingFallbackData', 'Using offline fallback data'),
    'connection': t('databaseUnavailable', 'Database connection unavailable'),
    'cache': t('usingCachedData', 'Using cached data')
  }[type];
  
  // If banner, use a full-width notification
  if (position === 'banner') {
    return (
      <div className={`fixed ${positionClasses} z-50 ${bgColor} ${textColor} py-1 px-2 text-center text-xs shadow-md border-b ${borderColor}`}>
        <div className="container mx-auto flex items-center justify-center gap-2">
          {icon}
          <span>{message || defaultMessage}</span>
          {onReload && (
            <button 
              onClick={onReload}
              className={`ml-2 underline ${textColor} hover:opacity-80 font-medium`}
            >
              {t('reload', 'Reload')}
            </button>
          )}
        </div>
      </div>
    );
  }
  
  // Otherwise use a corner badge
  return (
    <div className={`fixed ${positionClasses} z-50 ${bgColor} ${textColor} py-1 px-2 rounded-md text-xs shadow-md border ${borderColor} max-w-xs`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="truncate">{message || defaultMessage}</span>
        {onReload && !compact && (
          <button 
            onClick={onReload}
            className={`ml-1 underline ${textColor} hover:opacity-80`}
          >
            {t('reload', 'Reload')}
          </button>
        )}
      </div>
    </div>
  );
}; 