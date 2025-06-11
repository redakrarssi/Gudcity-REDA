import React, { useState, useEffect } from 'react';
import { 
  Database, RefreshCw, AlertTriangle, Clock, BarChart3, 
  ArrowUp, ArrowDown, Filter, Download, PlusCircle, ChevronDown
} from 'lucide-react';
import { DatabaseStatus } from '../../components/admin/DatabaseStatus';
import telemetry, { Metric, Event } from '../../utils/telemetry';
import db from '../../utils/db';
import databaseConnector from '../../utils/databaseConnector';

// Main page component
export const DatabaseDiagnosticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'events' | 'queries'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [timeWindow, setTimeWindow] = useState<'5m' | '15m' | '1h' | '24h'>('15m');
  const [aggregatedMetrics, setAggregatedMetrics] = useState({
    queryDuration: { min: 0, max: 0, avg: 0, count: 0, p95: 0, p99: 0 },
    connectionLatency: { min: 0, max: 0, avg: 0, count: 0, p95: 0, p99: 0 },
    failedQueries: { count: 0 },
  });
  
  // Helper to get milliseconds for the selected time window
  const getTimeWindowMs = (): number => {
    switch (timeWindow) {
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000;
    }
  };
  
  // Refresh all data
  const refreshData = async () => {
    setIsRefreshing(true);
    
    try {
      // Get metrics and events
      const recentMetrics = telemetry.getRecentMetrics();
      const recentEvents = telemetry.getRecentEvents();
      
      // Filter by time window
      const timeWindowMs = getTimeWindowMs();
      const now = Date.now();
      const filteredMetrics = recentMetrics.filter(m => now - m.timestamp <= timeWindowMs);
      const filteredEvents = recentEvents.filter(e => now - e.timestamp <= timeWindowMs);
      
      setMetrics(filteredMetrics);
      setEvents(filteredEvents);
      
      // Get aggregated metrics
      const queryDuration = telemetry.getAggregatedMetrics('db.query.duration', timeWindowMs);
      const connectionLatency = telemetry.getAggregatedMetrics('db.connection.latency', timeWindowMs);
      const failedMetrics = telemetry.getAggregatedMetrics('db.query.failed', timeWindowMs);
      
      setAggregatedMetrics({
        queryDuration,
        connectionLatency,
        failedQueries: { count: failedMetrics.count }
      });
      
      // Check connection
      await db`SELECT 1 as connected`;
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  // Get color class based on query duration
  const getDurationColorClass = (duration: number): string => {
    if (duration < 50) return 'text-green-600';
    if (duration < 200) return 'text-blue-600';
    if (duration < 500) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  // Get color class based on severity
  const getSeverityColorClass = (severity: string): string => {
    switch (severity) {
      case 'info': return 'text-blue-600 bg-blue-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'critical': return 'text-white bg-red-600';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  // Run diagnostics test
  const runDiagnosticsTest = async () => {
    setIsRefreshing(true);
    
    try {
      // Run a series of database tests
      const tests = [
        { name: 'Connection test', query: 'SELECT 1 as connected' },
        { name: 'Simple query', query: 'SELECT NOW() as time' },
        { name: 'Complex join', query: 'SELECT u.id, u.email, COUNT(l.id) as logs FROM users u LEFT JOIN system_logs l ON u.id = l.user_id GROUP BY u.id, u.email LIMIT 5' },
        { name: 'Transaction test', query: 'BEGIN; SELECT 1; COMMIT;' }
      ];
      
      for (const test of tests) {
        try {
          const startTime = performance.now();
          await db(test.query);
          const duration = performance.now() - startTime;
          
          telemetry.recordMetric('db.query.duration', duration, {
            query: test.name,
            test: 'diagnostics'
          });
          
          console.log(`Test: ${test.name} - Duration: ${duration.toFixed(2)}ms`);
        } catch (error) {
          telemetry.recordMetric('db.query.failed', 1, {
            query: test.name,
            test: 'diagnostics'
          });
          
          telemetry.recordEvent('db.query.error', {
            query: test.name,
            test: 'diagnostics',
            error: error instanceof Error ? error.message : String(error)
          }, 'error');
          
          console.error(`Test failed: ${test.name}`, error);
        }
      }
      
      // Refresh data after tests
      await refreshData();
    } catch (error) {
      console.error('Error running diagnostics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Export data
  const exportData = () => {
    const data = {
      metrics,
      events,
      aggregatedMetrics,
      timestamp: new Date().toISOString(),
      timeWindow
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `db-diagnostics-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Initialize data
  useEffect(() => {
    refreshData();
    
    // Set up refresh interval
    const intervalId = setInterval(refreshData, 60000); // Refresh every minute
    
    return () => clearInterval(intervalId);
  }, [timeWindow]);
  
  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-medium mb-4">Connection Stats</h3>
              <DatabaseStatus showDetails showControls refreshInterval={30000} className="mb-4" />
              
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Connection Performance</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">Avg Latency</div>
                    <div className="text-lg font-semibold">
                      {formatDuration(aggregatedMetrics.connectionLatency.avg)}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">95th %</div>
                    <div className="text-lg font-semibold">
                      {formatDuration(aggregatedMetrics.connectionLatency.p95)}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">Max</div>
                    <div className="text-lg font-semibold">
                      {formatDuration(aggregatedMetrics.connectionLatency.max)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-between">
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  onClick={runDiagnosticsTest}
                  disabled={isRefreshing}
                >
                  {isRefreshing && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                  Run Diagnostics
                </button>
                
                <button
                  className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm flex items-center"
                  onClick={exportData}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export Data
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-medium mb-4">Query Performance</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">Avg Duration</div>
                  <div className="text-2xl font-semibold">
                    {formatDuration(aggregatedMetrics.queryDuration.avg)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    From {aggregatedMetrics.queryDuration.count} queries
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">Failed Queries</div>
                  <div className="text-2xl font-semibold">
                    {aggregatedMetrics.failedQueries.count}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {aggregatedMetrics.queryDuration.count > 0 
                      ? `${(aggregatedMetrics.failedQueries.count / aggregatedMetrics.queryDuration.count * 100).toFixed(2)}% failure rate` 
                      : 'No queries executed'}
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Query Duration Percentiles</h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">Min</div>
                    <div className="text-sm font-semibold">
                      {formatDuration(aggregatedMetrics.queryDuration.min)}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">Avg</div>
                    <div className="text-sm font-semibold">
                      {formatDuration(aggregatedMetrics.queryDuration.avg)}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">95th %</div>
                    <div className="text-sm font-semibold">
                      {formatDuration(aggregatedMetrics.queryDuration.p95)}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">Max</div>
                    <div className="text-sm font-semibold">
                      {formatDuration(aggregatedMetrics.queryDuration.max)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Recent Slow Queries</h4>
                <div className="max-h-40 overflow-y-auto">
                  {metrics
                    .filter(m => m.name === 'db.slow_query')
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 5)
                    .map((m, idx) => (
                      <div key={idx} className="text-xs border-b border-gray-100 py-1 flex justify-between">
                        <span>{m.tags?.query || 'Unknown query'}</span>
                        <span className={getDurationColorClass(m.value)}>
                          {formatDuration(m.value)}
                        </span>
                      </div>
                    ))}
                    
                  {metrics.filter(m => m.name === 'db.slow_query').length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-2">
                      No slow queries detected
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'metrics':
        return (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium">Metrics</h3>
              <p className="text-sm text-gray-500">
                {metrics.length} metrics in the past {timeWindow}
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Metric</th>
                    <th className="text-left p-2">Value</th>
                    <th className="text-left p-2">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((metric, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="p-2 text-xs">{formatTimestamp(metric.timestamp)}</td>
                        <td className="p-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {metric.name}
                          </span>
                        </td>
                        <td className="p-2 font-medium">{
                          metric.name.includes('duration') || metric.name.includes('latency') 
                            ? formatDuration(metric.value)
                            : metric.value
                        }</td>
                        <td className="p-2">
                          {metric.tags && Object.entries(metric.tags).map(([key, value]) => (
                            <span key={key} className="inline-block mr-1 mb-1 px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">
                              {key}={value}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                    
                  {metrics.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-gray-500">
                        No metrics available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
        
      case 'events':
        return (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium">Events</h3>
              <p className="text-sm text-gray-500">
                {events.length} events in the past {timeWindow}
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Event</th>
                    <th className="text-left p-2">Severity</th>
                    <th className="text-left p-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((event, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="p-2 text-xs">{formatTimestamp(event.timestamp)}</td>
                        <td className="p-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {event.name}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColorClass(event.severity)}`}>
                            {event.severity}
                          </span>
                        </td>
                        <td className="p-2 font-mono text-xs">
                          {event.data ? (
                            <details>
                              <summary className="cursor-pointer">View details</summary>
                              <pre className="mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                                {JSON.stringify(event.data, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-gray-500">No details</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-gray-500">
                        No events available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Database className="h-6 w-6 mr-2 text-blue-600" />
            Database Diagnostics
          </h1>
          <p className="text-gray-500">Monitor database performance and connection health</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={timeWindow}
              onChange={e => setTimeWindow(e.target.value as any)}
            >
              <option value="5m">Last 5 minutes</option>
              <option value="15m">Last 15 minutes</option>
              <option value="1h">Last hour</option>
              <option value="24h">Last 24 hours</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          
          <button
            className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md text-sm flex items-center hover:bg-blue-100 transition-colors"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'metrics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('metrics')}
          >
            Metrics
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'events' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('events')}
          >
            Events
          </button>
        </div>
      </div>
      
      {renderTabContent()}
    </div>
  );
};

export default DatabaseDiagnosticsPage; 