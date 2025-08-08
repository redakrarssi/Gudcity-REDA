import React, { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Search, Filter, AlertTriangle, RefreshCw, Shield } from 'lucide-react';

// Placeholder log data structure (replace with real API integration later)
const MOCK_ACTIVITY_LOGS = [
  {
    id: 1,
    timestamp: '2024-06-01T12:34:56Z',
    action: 'User Registered',
    performedBy: 'system',
    target: 'user:alice@example.com',
    details: 'Registered via web form',
  },
  {
    id: 2,
    timestamp: '2024-06-01T12:40:00Z',
    action: 'Business Restricted',
    performedBy: 'admin:42',
    target: 'business:Urban Eats',
    details: 'Reason: suspicious activity',
  },
  {
    id: 3,
    timestamp: '2024-06-01T13:00:00Z',
    action: 'Points Issued',
    performedBy: 'user:alice@example.com',
    target: 'program:Summer Rewards',
    details: '50 points issued to customer: bob@example.com',
  },
  {
    id: 4,
    timestamp: '2024-06-01T13:10:00Z',
    action: 'Admin Deleted Business',
    performedBy: 'admin:99',
    target: 'business:Old Cafe',
    details: 'Deleted by admin for ToS violation',
  },
  {
    id: 5,
    timestamp: '2024-06-01T13:15:00Z',
    action: 'Promo Code Sent',
    performedBy: 'system',
    target: 'user:bob@example.com',
    details: 'Promo code SUMMER2024 sent',
  },
];

const MOCK_ERROR_LOGS = [
  {
    id: 101,
    timestamp: '2024-06-01T13:20:00Z',
    action: 'Error',
    performedBy: 'system',
    target: 'api/award-points',
    details: 'Database timeout when awarding points',
  },
  {
    id: 102,
    timestamp: '2024-06-01T13:22:00Z',
    action: 'Failed Login',
    performedBy: 'user:charlie@example.com',
    target: 'login',
    details: 'Invalid password',
  },
];

const ACTION_TYPES = [
  'All',
  'User Registered',
  'Business Restricted',
  'Points Issued',
  'Points Redeemed',
  'Promo Code Sent',
  'Admin Deleted Business',
  'Admin Banned User',
  'Login',
  'Program Created',
  'Error',
  'Failed Login',
];

function formatDateTime(dt: string) {
  const d = new Date(dt);
  return d.toLocaleString();
}

const SystemLogs: React.FC = () => {
  // Simulate user role (replace with real auth context)
  const userRole = 'admin'; // or 'staff', 'user', etc.

  // Tabs: 'activity' or 'error'
  const [activeTab, setActiveTab] = useState<'activity' | 'error'>('activity');
  // Filters
  const [actionType, setActionType] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // Polling for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshing(true);
      setTimeout(() => setRefreshing(false), 500); // Simulate refresh
    }, 10000); // 10s
    return () => clearInterval(interval);
  }, []);

  // Filtered logs
  const logs = useMemo(() => {
    const data = activeTab === 'activity' ? MOCK_ACTIVITY_LOGS : MOCK_ERROR_LOGS;
    return data.filter((log) => {
      if (actionType !== 'All' && log.action !== actionType) return false;
      if (dateFrom && new Date(log.timestamp) < new Date(dateFrom)) return false;
      if (dateTo && new Date(log.timestamp) > new Date(dateTo)) return false;
      if (search && !(
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.performedBy.toLowerCase().includes(search.toLowerCase()) ||
        log.target.toLowerCase().includes(search.toLowerCase()) ||
        log.details.toLowerCase().includes(search.toLowerCase())
      )) return false;
      return true;
    });
  }, [activeTab, actionType, dateFrom, dateTo, search, refreshing]);

  if (userRole !== 'admin' && userRole !== 'staff') {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto mt-20 p-8 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
          <Shield className="mx-auto h-10 w-10 text-yellow-400 mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Access Restricted</h2>
          <p className="text-yellow-700">You do not have permission to view system logs. Please contact an administrator if you believe this is an error.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">System Logs</h1>
            <p className="text-sm text-gray-600 mt-1">Monitor key admin and system activity across the platform in real time.</p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              className={`p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50 ${refreshing ? 'animate-spin' : ''}`}
              title="Refresh"
              onClick={() => setRefreshing(true)}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'activity' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
              onClick={() => setActiveTab('activity')}
            >
              Activity Logs
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'error' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
              onClick={() => setActiveTab('error')}
            >
              Error Logs
            </button>
          </div>
        </div>
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-1/3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search logs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select
              className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={actionType}
              onChange={e => setActionType(e.target.value)}
            >
              {ACTION_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <input
              type="date"
              className="block pl-3 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              placeholder="From"
            />
            <input
              type="date"
              className="block pl-3 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              placeholder="To"
            />
            <button className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50" title="Filter">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Log Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performed By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No logs found for the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(log.timestamp)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.action}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.performedBy}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.target}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-400 mt-4 text-right">Logs update every 10 seconds. All times are local.</div>
      </div>
    </AdminLayout>
  );
};

export default SystemLogs; 