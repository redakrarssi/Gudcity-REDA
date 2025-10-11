/**
 * User Data Connection Monitor
 * Displays the current status of user data backend connection
 * Following reda.md security guidelines
 */

import React, { useState, useEffect } from 'react';
import UserDataConnectionService, { UserDataConnectionState } from '../services/userDataConnectionService';

interface ConnectionMonitorProps {
  showDetails?: boolean;
  className?: string;
}

const UserDataConnectionMonitor: React.FC<ConnectionMonitorProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const [connectionState, setConnectionState] = useState<UserDataConnectionState>(UserDataConnectionState.DISCONNECTED);
  const [isHealthy, setIsHealthy] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await UserDataConnectionService.testConnection();
        const health = UserDataConnectionService.getConnectionHealth();
        
        setConnectionState(health.state);
        setIsHealthy(health.isHealthy);
        setRetryCount(health.retryCount);
        setLastChecked(new Date());
      } catch (error) {
        console.error('Connection check failed:', error);
        setConnectionState(UserDataConnectionState.ERROR);
        setIsHealthy(false);
      }
    };

    // Check connection immediately
    checkConnection();

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleReconnect = async () => {
    try {
      const success = await UserDataConnectionService.forceReconnect();
      if (success) {
        setConnectionState(UserDataConnectionState.CONNECTED);
        setIsHealthy(true);
        setRetryCount(0);
        setLastChecked(new Date());
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case UserDataConnectionState.CONNECTED:
        return 'text-green-600';
      case UserDataConnectionState.CONNECTING:
        return 'text-yellow-600';
      case UserDataConnectionState.ERROR:
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case UserDataConnectionState.CONNECTED:
        return 'Connected';
      case UserDataConnectionState.CONNECTING:
        return 'Connecting...';
      case UserDataConnectionState.ERROR:
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const getStatusIcon = () => {
    switch (connectionState) {
      case UserDataConnectionState.CONNECTED:
        return '✅';
      case UserDataConnectionState.CONNECTING:
        return '🔄';
      case UserDataConnectionState.ERROR:
        return '❌';
      default:
        return '⚪';
    }
  };

  if (!showDetails && isHealthy) {
    return null; // Don't show anything if connection is healthy and details are not requested
  }

  return (
    <div className={`user-data-connection-monitor ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-sm">
          {getStatusIcon()} {getStatusText()}
        </span>
        
        {!isHealthy && (
          <button
            onClick={handleReconnect}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Reconnect
          </button>
        )}
      </div>

      {showDetails && (
        <div className="mt-2 text-xs text-gray-600">
          <div>Status: <span className={getStatusColor()}>{getStatusText()}</span></div>
          <div>Retry Count: {retryCount}</div>
          {lastChecked && (
            <div>Last Checked: {lastChecked.toLocaleTimeString()}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDataConnectionMonitor;