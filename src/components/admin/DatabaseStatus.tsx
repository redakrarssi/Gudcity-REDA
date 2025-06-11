import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, AlertCircle, Clock, Activity } from 'lucide-react';
import telemetry, { ConnectionStatus } from '../../utils/telemetry';
import db, { getConnectionState, forceReconnect, getConnectionMetrics } from '../../utils/db';
import databaseConnector from '../../utils/databaseConnector';

interface DatabaseStatusProps {
  showDetails?: boolean;
  showControls?: boolean;
  refreshInterval?: number; // in milliseconds
  className?: string;
}

/**
 * Component to display the current database connection status with real-time updates
 * Can be used in admin interfaces to provide visibility into database health
 */
export const DatabaseStatus: React.FC<DatabaseStatusProps> = ({
  showDetails = true,
  showControls = true,
  refreshInterval = 10000,
  className = ''
}) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [lastStatusChange, setLastStatusChange] = useState<number>(0);
  const [metrics, setMetrics] = useState({
    queryCount: 0,
    avgQueryTime: 0,
    errorRate: 0,
    slowQueryCount: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionMetrics, setConnectionMetrics] = useState({
    totalQueries: 0,
    failedQueries: 0,
    lastQueryTime: 0,
    connectedSince: 0,
    healthCheckLatency: 0
  });
  
  // Format the status for display
  const getStatusText = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'degraded': return 'Degraded';
      case 'reconnecting': return 'Reconnecting';
      default: return 'Unknown';
    }
  };
  
  // Get the color for the status
  const getStatusColor = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-red-600';
      case 'degraded': return 'text-yellow-600';
      case 'reconnecting': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  // Get the background color for the status
  const getStatusBgColor = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected': return 'bg-green-100';
      case 'disconnected': return 'bg-red-100';
      case 'degraded': return 'bg-yellow-100';
      case 'reconnecting': return 'bg-blue-100';
      default: return 'bg-gray-100';
    }
  };
  
  // Update the database status from the telemetry system
  const updateStatus = () => {
    const { status, metrics: dbMetrics } = databaseConnector.getDatabaseStatus();
    const dbConnectionMetrics = getConnectionMetrics();
    
    setConnectionStatus(status as ConnectionStatus);
    setMetrics(dbMetrics);
    setConnectionMetrics(dbConnectionMetrics);
  };
  
  // Manually refresh the status
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await db`SELECT 1 as connected`;
      updateStatus();
    } catch (error) {
      console.error('Error checking database connection:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Manually force a reconnection
  const handleForceReconnect = () => {
    forceReconnect();
    updateStatus();
  };
  
  // Subscribe to connection status changes
  useEffect(() => {
    // Initial update
    updateStatus();
    
    // Subscribe to telemetry events
    const unsubscribe = telemetry.subscribeToConnectionStatus((status, timestamp) => {
      setConnectionStatus(status);
      setLastStatusChange(timestamp);
      updateStatus();
    });
    
    // Set up refresh interval
    const intervalId = setInterval(updateStatus, refreshInterval);
    
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [refreshInterval]);
  
  // Format duration from timestamp
  const formatDuration = (timestamp: number): string => {
    if (!timestamp) return 'N/A';
    
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  };
  
  return (
    <div className={`rounded-lg shadow-sm border ${getStatusBgColor(connectionStatus)} ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Database className={`h-5 w-5 mr-2 ${getStatusColor(connectionStatus)}`} />
            <h3 className="text-sm font-medium">Database Status</h3>
          </div>
          
          <div className="flex items-center">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(connectionStatus)} ${getStatusColor(connectionStatus)}`}>
              {getStatusText(connectionStatus)}
            </span>
            
            {showControls && (
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="ml-2 p-1 rounded-full hover:bg-gray-100 focus:outline-none"
                title="Refresh status"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-500' : 'text-gray-500'}`} />
              </button>
            )}
          </div>
        </div>
        
        {showDetails && (
          <div className="mt-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <Clock className="h-3 w-3 text-gray-500 mr-1" />
                <span className="text-gray-600">Last change:</span>
                <span className="ml-1 font-medium">{formatDuration(lastStatusChange)}</span>
              </div>
              
              <div className="flex items-center">
                <Activity className="h-3 w-3 text-gray-500 mr-1" />
                <span className="text-gray-600">Queries:</span>
                <span className="ml-1 font-medium">{connectionMetrics.totalQueries}</span>
              </div>
              
              <div className="flex items-center">
                <AlertCircle className="h-3 w-3 text-gray-500 mr-1" />
                <span className="text-gray-600">Failed:</span>
                <span className="ml-1 font-medium">
                  {connectionMetrics.failedQueries} 
                  {connectionMetrics.totalQueries > 0 && (
                    <span className="text-gray-500">
                      ({(connectionMetrics.failedQueries / connectionMetrics.totalQueries * 100).toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-3 w-3 text-gray-500 mr-1" />
                <span className="text-gray-600">Avg time:</span>
                <span className="ml-1 font-medium">{metrics.avgQueryTime.toFixed(2)}ms</span>
              </div>
              
              <div className="flex items-center">
                <AlertCircle className="h-3 w-3 text-gray-500 mr-1" />
                <span className="text-gray-600">Slow queries:</span>
                <span className="ml-1 font-medium">{metrics.slowQueryCount}</span>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-3 w-3 text-gray-500 mr-1" />
                <span className="text-gray-600">Latency:</span>
                <span className="ml-1 font-medium">{connectionMetrics.healthCheckLatency.toFixed(2)}ms</span>
              </div>
            </div>
            
            {showControls && connectionStatus !== 'connected' && (
              <div className="mt-3">
                <button 
                  onClick={handleForceReconnect}
                  className="w-full text-xs py-1 px-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Force Reconnect
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 