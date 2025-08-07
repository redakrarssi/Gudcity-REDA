import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import env, { FEATURES } from '../utils/env';
import { useFallback } from './FallbackIndicator';
import telemetry from '../utils/telemetry';

const DatabaseConnectionAlert: React.FC = () => {
  const fallbackContext = useFallback();
  const { connectionStatus } = fallbackContext;
  
  // Check if database connection is configured
  const hasDbConnection = !!env.DATABASE_URL;
  const isMockMode = !hasDbConnection || env.MOCK_DATA;
  const showAlert = isMockMode && FEATURES.showMockNotice;
  
  // Set the fallback state based on connection status
  useEffect(() => {
    if (isMockMode) {
      // If we're in mock mode, update the fallback context
      fallbackContext.setFallbackState({
        isUsingFallback: true,
        fallbackType: 'data',
        showIndicator: FEATURES.fallback.showIndicator
      });
      
      // Record telemetry event for mock mode
      telemetry.recordEvent('db.connection.lost', {
        reason: 'Mock data mode enabled',
        configured: hasDbConnection
      }, 'info');
    }
  }, [isMockMode, hasDbConnection, fallbackContext]);

  if (!showAlert) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 fixed bottom-0 right-0 m-4 max-w-md z-50 shadow-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-amber-800">
            {!hasDbConnection ? 'Database Connection Not Configured' : 'Using Mock Data Mode'}
          </h3>
          <p className="mt-2 text-sm text-amber-700">
            The application is running in mock data mode. You can login with these demo accounts:
          </p>
          <ul className="mt-1 text-xs text-amber-700 list-disc ml-6">
            <li><strong>Admin:</strong> admin@vcarda.com / password</li>
            <li><strong>Customer:</strong> customer@example.com / password</li>
            <li><strong>Business:</strong> business@example.com / password</li>
          </ul>
          <p className="mt-2 text-xs text-amber-700">
            {!hasDbConnection 
              ? 'To connect to a real database, configure the VITE_DATABASE_URL environment variable.' 
              : 'To disable mock data mode, set VITE_MOCK_DATA=false in your environment variables.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DatabaseConnectionAlert; 