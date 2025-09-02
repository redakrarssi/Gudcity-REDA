import React, { useState, useEffect } from 'react';
import { Business, getBusinessActivityOverview, getBusinessLoginHistory, getBusinessAnalytics } from '../../services/businessService';
import { 
  Activity, 
  Users, 
  DollarSign, 
  ShoppingBag, 
  Clock,
  RefreshCw
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface BusinessAnalyticsProps {
  business: Business;
}

// Custom colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Define interfaces for analytics data
interface BusinessActivityOverview {
  allTime: {
    total_logins: number;
    unique_users: number;
    avg_session_duration: number;
    total_transactions: number;
    total_revenue: number;
    total_customers: number;
  };
  last30Days: {
    recent_logins: number;
    recent_users: number;
    recent_avg_session: number;
    recent_transactions: number;
    recent_revenue: number;
    recent_customers: number;
  };
}

interface LoginHistoryItem {
  date: string;
  login_count: number;
  avg_session_duration: number;
}

interface AnalyticsItem {
  date: string;
  activeCustomers: number;
  newCustomers: number;
  totalTransactions: number;
  revenue: number;
  customerRetentionRate: number;
  growthRate: number;
}

export const BusinessAnalytics: React.FC<BusinessAnalyticsProps> = ({ business }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<BusinessActivityOverview>({
    allTime: {
      total_logins: 0,
      unique_users: 0,
      avg_session_duration: 0,
      total_transactions: 0,
      total_revenue: 0,
      total_customers: 0
    },
    last30Days: {
      recent_logins: 0,
      recent_users: 0,
      recent_avg_session: 0,
      recent_transactions: 0,
      recent_revenue: 0,
      recent_customers: 0
    }
  });
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsItem[]>([]);
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    const fetchData = async () => {
      if (!business.id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get business activity overview
        const activityOverview = await getBusinessActivityOverview(business.id);
        setOverview(activityOverview);
        
        // Get login history
        const loginData = await getBusinessLoginHistory(business.id, parseInt(timeRange, 10));
        setLoginHistory(loginData);
        
        // Calculate date range for analytics
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(timeRange, 10));
        const formattedStartDate = startDate.toISOString().split('T')[0];
        
        // Get business analytics
        const analyticsData = await getBusinessAnalytics(business.id, formattedStartDate, endDate);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error('Error fetching business analytics:', err);
        setError('Failed to load business analytics data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [business.id, timeRange]);

  const handleTimeRangeChange = (range: '7' | '30' | '90') => {
    setTimeRange(range);
  };
  
  // Helper function to format seconds into readable time
  const formatSessionDuration = (seconds: number): string => {
    if (!seconds) return '0m';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-800">
        <p className="font-semibold">Error</p>
        <p>{error}</p>
        <button 
          className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // Prepare data for charts
  const loginData = loginHistory.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }),
    logins: item.login_count,
    sessionDuration: item.avg_session_duration ? Math.round(item.avg_session_duration / 60) : 0 // Convert to minutes
  }));
  
  const analyticsData = analytics.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }),
    activeCustomers: item.activeCustomers,
    newCustomers: item.newCustomers,
    transactions: item.totalTransactions,
    revenue: item.revenue,
    retention: item.customerRetentionRate,
    growth: item.growthRate
  }));
  
  // Prepare data for user activity pie chart
  const userActivityData = [
    { name: 'Active Users', value: overview.last30Days.recent_users || 0 },
    { name: 'Transactions', value: overview.last30Days.recent_transactions || 0 },
  ];
  
  // Prepare data for revenue breakdown
  const revenuePerCustomer = 
    overview.last30Days.recent_customers > 0 
      ? overview.last30Days.recent_revenue / overview.last30Days.recent_customers 
      : 0;
  
  return (
    <div className="space-y-8">
      {/* Header with business name and time range selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          {business.name} Analytics
        </h2>
        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => handleTimeRangeChange('7')}
            className={`px-3 py-1 rounded ${
              timeRange === '7' 
                ? 'bg-white shadow-sm' 
                : 'hover:bg-gray-200'
            }`}
          >
            7 Days
          </button>
          <button 
            onClick={() => handleTimeRangeChange('30')}
            className={`px-3 py-1 rounded ${
              timeRange === '30' 
                ? 'bg-white shadow-sm' 
                : 'hover:bg-gray-200'
            }`}
          >
            30 Days
          </button>
          <button 
            onClick={() => handleTimeRangeChange('90')}
            className={`px-3 py-1 rounded ${
              timeRange === '90' 
                ? 'bg-white shadow-sm' 
                : 'hover:bg-gray-200'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>
      
      {/* Key metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Login Activity */}
        <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Login Activity</p>
              <p className="text-2xl font-bold mt-2">{overview.last30Days.recent_logins || 0}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Activity size={24} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              <span className="font-medium">
                {overview.last30Days.recent_users || 0} unique users
              </span> in the last {timeRange} days
            </p>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Avg. Session</span>
              <span className="font-medium">
                {formatSessionDuration(overview.last30Days.recent_avg_session || 0)}
              </span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full mt-1">
              <div 
                className="h-1 bg-blue-500 rounded-full" 
                style={{ 
                  width: `${Math.min(
                    (overview.last30Days.recent_avg_session || 0) / 3600 * 100, 
                    100
                  )}%` 
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Customers */}
        <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Customers</p>
              <p className="text-2xl font-bold mt-2">{overview.last30Days.recent_customers || 0}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <Users size={24} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              <span className={`font-medium ${
                analytics.length > 0 && analytics[analytics.length - 1].customerRetentionRate > 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {analytics.length > 0 
                  ? `${Math.round(analytics[analytics.length - 1].customerRetentionRate || 0)}% retention`
                  : 'No retention data'}
              </span>
            </p>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Lifetime Customers</span>
              <span className="font-medium">{overview.allTime.total_customers || 0}</span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full mt-1">
              <div 
                className="h-1 bg-green-500 rounded-full" 
                style={{ 
                  width: `${
                    overview.allTime.total_customers > 0 
                      ? Math.min((overview.last30Days.recent_customers / overview.allTime.total_customers) * 100, 100)
                      : 0
                  }%` 
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Transactions */}
        <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Transactions</p>
              <p className="text-2xl font-bold mt-2">{overview.last30Days.recent_transactions || 0}</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <ShoppingBag size={24} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              <span className="font-medium">
                {analytics.length > 0 
                  ? `${(analytics.reduce((sum, item) => sum + item.totalTransactions, 0) / analytics.length).toFixed(1)}`
                  : '0'} avg
              </span> per day
            </p>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Growth Rate</span>
              <span className={`font-medium ${
                analytics.length > 0 && analytics[analytics.length - 1].growthRate > 0
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {analytics.length > 0 
                  ? `${Math.round(analytics[analytics.length - 1].growthRate || 0)}%`
                  : '0%'}
              </span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full mt-1">
              <div 
                className={`h-1 ${
                  analytics.length > 0 && analytics[analytics.length - 1].growthRate > 0
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                } rounded-full`}
                style={{ 
                  width: `${
                    analytics.length > 0 
                      ? Math.min(Math.abs(analytics[analytics.length - 1].growthRate || 0), 100)
                      : 0
                  }%` 
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Revenue */}
        <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Revenue</p>
              <p className="text-2xl font-bold mt-2">
                ${(overview.last30Days.recent_revenue || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
              <DollarSign size={24} />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              <span className="font-medium">
                ${revenuePerCustomer.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span> per customer
            </p>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Of Lifetime Revenue</span>
              <span className="font-medium">
                ${(overview.allTime.total_revenue || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full mt-1">
              <div 
                className="h-1 bg-yellow-500 rounded-full" 
                style={{ 
                  width: `${
                    overview.allTime.total_revenue > 0 
                      ? Math.min((overview.last30Days.recent_revenue / overview.allTime.total_revenue) * 100, 100)
                      : 0
                  }%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Login Activity Chart */}
        <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Login Activity</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={loginData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="logins" 
                  name="Logins" 
                  stroke="#0088FE" 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="sessionDuration" 
                  name="Avg. Session (mins)" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Customer Activity Chart */}
        <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Activity</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analyticsData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="activeCustomers" name="Active Customers" fill="#00C49F" />
                <Bar dataKey="newCustomers" name="New Customers" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Transactions & Revenue Chart */}
        <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Transactions & Revenue</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={analyticsData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="transactions" 
                  name="Transactions" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="revenue" 
                  name="Revenue ($)" 
                  stroke="#FF8042" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Customer Retention & Growth Chart */}
        <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Retention & Growth</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={analyticsData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="retention" 
                  name="Retention (%)" 
                  stroke="#00C49F" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="growth" 
                  name="Growth (%)" 
                  stroke="#FFBB28" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Customer Engagement Summary */}
      <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Customer Engagement Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Activity Stats */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">Activity Statistics</h4>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Activity className="text-blue-500 mr-3" size={20} />
                <span className="text-gray-600">Active Users</span>
              </div>
              <span className="font-semibold">{overview.last30Days.recent_users || 0}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Clock className="text-purple-500 mr-3" size={20} />
                <span className="text-gray-600">Avg. Session</span>
              </div>
              <span className="font-semibold">{formatSessionDuration(overview.last30Days.recent_avg_session || 0)}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <RefreshCw className="text-green-500 mr-3" size={20} />
                <span className="text-gray-600">Return Rate</span>
              </div>
              <span className="font-semibold">
                {analytics.length > 0 
                  ? `${Math.round(analytics[analytics.length - 1].customerRetentionRate || 0)}%`
                  : '0%'}
              </span>
            </div>
          </div>
          
          {/* Engagement Visualization */}
          <div className="md:col-span-2">
            <h4 className="font-semibold text-gray-700 mb-3">User Engagement Distribution</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userActivityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {userActivityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 