import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  FileText,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Info,
  AlertCircle,
  Calendar,
  User,
  Shield,
  Download,
  RefreshCw,
  X
} from 'lucide-react';

// Mock log data
interface SystemLog {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug' | 'critical';
  source: 'system' | 'auth' | 'user' | 'api' | 'database' | 'payment';
  message: string;
  user?: string;
  ipAddress?: string;
  details?: string;
}

const MOCK_LOGS: SystemLog[] = [
  {
    id: 1,
    timestamp: '2023-09-18T10:15:30Z',
    level: 'error',
    source: 'auth',
    message: 'Failed login attempt',
    user: 'unknown',
    ipAddress: '192.168.1.45',
    details: 'Multiple failed attempts from same IP'
  },
  {
    id: 2,
    timestamp: '2023-09-18T10:10:23Z',
    level: 'info',
    source: 'user',
    message: 'User profile updated',
    user: 'john.smith@example.com',
    ipAddress: '192.168.1.101'
  },
  {
    id: 3,
    timestamp: '2023-09-18T09:58:15Z',
    level: 'warning',
    source: 'database',
    message: 'Database connection pool nearing capacity',
    details: '85% of connections in use'
  },
  {
    id: 4,
    timestamp: '2023-09-18T09:45:02Z',
    level: 'info',
    source: 'auth',
    message: 'User logged in successfully',
    user: 'admin@gudcity.com',
    ipAddress: '192.168.1.10'
  },
  {
    id: 5,
    timestamp: '2023-09-18T09:30:44Z',
    level: 'critical',
    source: 'system',
    message: 'System resource limit reached',
    details: 'Memory usage exceeded 90% threshold'
  },
  {
    id: 6,
    timestamp: '2023-09-18T09:15:22Z',
    level: 'debug',
    source: 'api',
    message: 'API request processed',
    user: 'system',
    details: 'GET /api/users - 200 OK - 352ms'
  },
  {
    id: 7,
    timestamp: '2023-09-18T09:00:11Z',
    level: 'error',
    source: 'payment',
    message: 'Payment processing failed',
    user: 'sarah.j@example.com',
    details: 'Transaction declined by payment provider'
  },
  {
    id: 8,
    timestamp: '2023-09-18T08:45:30Z',
    level: 'info',
    source: 'user',
    message: 'New user registered',
    user: 'new.user@example.com',
    ipAddress: '192.168.1.150'
  },
  {
    id: 9,
    timestamp: '2023-09-18T08:30:25Z',
    level: 'warning',
    source: 'api',
    message: 'Rate limit approached',
    user: 'api_client_3',
    details: '85% of rate limit used in current window'
  },
  {
    id: 10,
    timestamp: '2023-09-18T08:15:10Z',
    level: 'info',
    source: 'system',
    message: 'System backup completed',
    details: 'Backup size: 1.45GB'
  }
];

const AdminSystemLogs = () => {
  const { t } = useTranslation();
  
  // State for filters and logs
  const [logs, setLogs] = useState<SystemLog[]>(MOCK_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | SystemLog['level']>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | SystemLog['source']>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  
  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Filter logs based on search and filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user && log.user.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesSource = sourceFilter === 'all' || log.source === sourceFilter;
    
    // Apply date range filter if set
    let matchesDateRange = true;
    if (dateRange.start && dateRange.end) {
      const logDate = new Date(log.timestamp);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // Include the entire end day
      
      matchesDateRange = logDate >= startDate && logDate <= endDate;
    }
    
    return matchesSearch && matchesLevel && matchesSource && matchesDateRange;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // Handle log entry click
  const handleViewLogDetails = (log: SystemLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };
  
  // Log level badge component
  const LogLevelBadge = ({ level }: { level: SystemLog['level'] }) => {
    switch (level) {
      case 'info':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Info className="w-3 h-3 mr-1" />
            {t('Info')}
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {t('Warning')}
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            {t('Error')}
          </span>
        );
      case 'debug':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Info className="w-3 h-3 mr-1" />
            {t('Debug')}
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            {t('Critical')}
          </span>
        );
      default:
        return null;
    }
  };
  
  // Source badge component
  const SourceBadge = ({ source }: { source: SystemLog['source'] }) => {
    const getSourceInfo = (src: SystemLog['source']) => {
      switch (src) {
        case 'auth':
          return { bg: 'bg-indigo-100', text: 'text-indigo-800', label: t('Authentication') };
        case 'user':
          return { bg: 'bg-green-100', text: 'text-green-800', label: t('User') };
        case 'system':
          return { bg: 'bg-blue-100', text: 'text-blue-800', label: t('System') };
        case 'api':
          return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: t('API') };
        case 'database':
          return { bg: 'bg-gray-100', text: 'text-gray-800', label: t('Database') };
        case 'payment':
          return { bg: 'bg-pink-100', text: 'text-pink-800', label: t('Payment') };
        default:
          return { bg: 'bg-gray-100', text: 'text-gray-800', label: src };
      }
    };
    
    const { bg, text, label } = getSourceInfo(source);
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
        {label}
      </span>
    );
  };
  
  // Log detail modal
  const LogDetailModal = ({ log, isOpen, onClose }: { log: SystemLog | null; isOpen: boolean; onClose: () => void }) => {
    if (!log || !isOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>
          
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          
          <div 
            className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="modal-headline"
          >
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                      {t('Log Details')}
                    </h3>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500"
                      onClick={onClose}
                    >
                      <span className="sr-only">{t('Close')}</span>
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <LogLevelBadge level={log.level} />
                      <span className="text-sm text-gray-500">{formatTimestamp(log.timestamp)}</span>
                    </div>
                    <p className="text-gray-900 font-medium">{log.message}</p>
                    <div className="mt-2 flex items-center">
                      <SourceBadge source={log.source} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {log.user && (
                      <div className="flex">
                        <span className="text-gray-500 w-24 flex-shrink-0 flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {t('User')}:
                        </span>
                        <span className="text-gray-900">{log.user}</span>
                      </div>
                    )}
                    
                    {log.ipAddress && (
                      <div className="flex">
                        <span className="text-gray-500 w-24 flex-shrink-0 flex items-center">
                          <Shield className="w-4 h-4 mr-1" />
                          {t('IP Address')}:
                        </span>
                        <span className="text-gray-900">{log.ipAddress}</span>
                      </div>
                    )}
                    
                    {log.details && (
                      <div className="flex flex-col">
                        <span className="text-gray-500 flex items-center mb-1">
                          <FileText className="w-4 h-4 mr-1" />
                          {t('Details')}:
                        </span>
                        <div className="bg-gray-50 p-3 rounded text-sm text-gray-800 font-mono whitespace-pre-wrap">
                          {log.details}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={onClose}
              >
                {t('Close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
              <FileText className="w-6 h-6 text-blue-500 mr-2" />
              {t('System Logs')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('View and filter system logs and events')}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => setLogs(MOCK_LOGS)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('Refresh')}
            </button>
            
            <button
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('Export')}
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                {t('Search')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={t('Search logs...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="level-filter" className="block text-sm font-medium text-gray-700 mb-1">
                {t('Level')}
              </label>
              <select
                id="level-filter"
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as any)}
              >
                <option value="all">{t('All Levels')}</option>
                <option value="info">{t('Info')}</option>
                <option value="warning">{t('Warning')}</option>
                <option value="error">{t('Error')}</option>
                <option value="debug">{t('Debug')}</option>
                <option value="critical">{t('Critical')}</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="source-filter" className="block text-sm font-medium text-gray-700 mb-1">
                {t('Source')}
              </label>
              <select
                id="source-filter"
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
              >
                <option value="all">{t('All Sources')}</option>
                <option value="system">{t('System')}</option>
                <option value="auth">{t('Authentication')}</option>
                <option value="user">{t('User')}</option>
                <option value="api">{t('API')}</option>
                <option value="database">{t('Database')}</option>
                <option value="payment">{t('Payment')}</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
                {t('Date Range')}
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  className="flex-1 block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                />
                <input
                  type="date"
                  className="flex-1 block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Logs Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Timestamp')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Level')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Source')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Message')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('User')}
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">{t('View')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      {t('No logs found matching the criteria')}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr 
                      key={log.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewLogDetails(log)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <LogLevelBadge level={log.level} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <SourceBadge source={log.source} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.message}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.user || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewLogDetails(log);
                          }}
                        >
                          {t('View')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Log Detail Modal */}
        <LogDetailModal
          log={selectedLog}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminSystemLogs; 