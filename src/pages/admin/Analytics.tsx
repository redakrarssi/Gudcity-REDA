import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  BarChart2,
  TrendingUp,
  Users,
  Building,
  CreditCard,
  Calendar,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Zap,
  Map,
  DollarSign,
  PieChart,
  Activity
} from 'lucide-react';

const AdminAnalytics = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [reportType, setReportType] = useState<'overview' | 'users' | 'businesses' | 'transactions'>('overview');
  
  // Placeholder data for charts
  const platformGrowthData = {
    users: [1200, 1350, 1400, 1600, 1800, 2100, 2300, 2450, 2600, 2750, 2900, 3100],
    businesses: [45, 48, 52, 55, 60, 65, 68, 72, 78, 82, 88, 95],
    transactions: [3200, 3600, 4100, 4800, 5300, 6200, 7100, 7800, 8500, 9400, 10200, 11500],
    revenue: [12500, 14000, 15800, 18200, 20500, 24100, 27800, 31000, 34500, 38200, 42000, 47500]
  };
  
  const userEngagementData = {
    activeUsers: 2450,
    activeUsersChange: 12.5,
    newUsers: 420,
    newUsersChange: 8.3,
    returningUsers: 1850,
    returningUsersChange: 5.2,
    churnRate: 2.1,
    churnRateChange: -0.8
  };
  
  const businessPerformanceData = {
    activeBusinesses: 85,
    activeBusinessesChange: 6.3,
    topBusinessTypes: [
      { type: 'Food & Beverage', percentage: 32 },
      { type: 'Retail', percentage: 28 },
      { type: 'Health & Beauty', percentage: 18 },
      { type: 'Electronics', percentage: 12 },
      { type: 'Other', percentage: 10 }
    ],
    averageProgramsPerBusiness: 2.4,
    averageProgramsChange: 0.3
  };
  
  const transactionData = {
    totalTransactions: 11500,
    transactionsChange: 15.8,
    averageTransactionValue: 42.50,
    averageValueChange: 3.2,
    totalRevenue: 47500,
    revenueChange: 18.5,
    successRate: 98.2,
    successRateChange: 0.7
  };
  
  // Helper for formatting numbers with k/M suffix
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };
  
  // Helper for formatting percentage changes
  const formatChange = (change: number): string => {
    return change > 0 ? `+${change}%` : `${change}%`;
  };
  
  // Stat card component
  const StatCard = ({ title, value, change, icon }: { title: string, value: string, change: string, icon: React.ReactNode }) => {
    const isPositive = !change.includes('-');
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
            <div className={`flex items-center mt-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              <span className="text-xs font-medium">{change}</span>
            </div>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
            {icon}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
              <BarChart2 className="w-6 h-6 text-blue-500 mr-2" />
              {t('Platform Analytics')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('Comprehensive insights into platform performance')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="inline-flex rounded-md shadow-sm">
              <button
                onClick={() => setDateRange('week')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                  dateRange === 'week'
                    ? 'bg-blue-50 text-blue-600 border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('Week')}
              </button>
              <button
                onClick={() => setDateRange('month')}
                className={`px-4 py-2 text-sm font-medium border-t border-b ${
                  dateRange === 'month'
                    ? 'bg-blue-50 text-blue-600 border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('Month')}
              </button>
              <button
                onClick={() => setDateRange('quarter')}
                className={`px-4 py-2 text-sm font-medium border-t border-b ${
                  dateRange === 'quarter'
                    ? 'bg-blue-50 text-blue-600 border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('Quarter')}
              </button>
              <button
                onClick={() => setDateRange('year')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                  dateRange === 'year'
                    ? 'bg-blue-50 text-blue-600 border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('Year')}
              </button>
            </div>
            
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
              <Download className="w-4 h-4 mr-2" />
              {t('Export Report')}
            </button>
          </div>
        </div>
        
        {/* Analytics dashboard content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
            <div className="flex gap-4">
              <button
                onClick={() => setReportType('overview')}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  reportType === 'overview'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('Overview')}
              </button>
              <button
                onClick={() => setReportType('users')}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  reportType === 'users'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('Users')}
              </button>
              <button
                onClick={() => setReportType('businesses')}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  reportType === 'businesses'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('Businesses')}
              </button>
              <button
                onClick={() => setReportType('transactions')}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  reportType === 'transactions'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('Transactions')}
              </button>
            </div>
          </div>
          
          {reportType === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title={t('Total Users')}
                  value={formatNumber(userEngagementData.activeUsers)}
                  change={formatChange(userEngagementData.activeUsersChange)}
                  icon={<Users className="w-5 h-5" />}
                />
                <StatCard
                  title={t('Active Businesses')}
                  value={formatNumber(businessPerformanceData.activeBusinesses)}
                  change={formatChange(businessPerformanceData.activeBusinessesChange)}
                  icon={<Building className="w-5 h-5" />}
                />
                <StatCard
                  title={t('Total Transactions')}
                  value={formatNumber(transactionData.totalTransactions)}
                  change={formatChange(transactionData.transactionsChange)}
                  icon={<CreditCard className="w-5 h-5" />}
                />
                <StatCard
                  title={t('Platform Revenue')}
                  value={`$${formatNumber(transactionData.totalRevenue)}`}
                  change={formatChange(transactionData.revenueChange)}
                  icon={<DollarSign className="w-5 h-5" />}
                />
              </div>
              
              {/* Placeholder for growth chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">{t('Platform Growth')}</h3>
                  <div className="flex gap-2">
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                      <span className="text-xs text-gray-500">{t('Users')}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                      <span className="text-xs text-gray-500">{t('Businesses')}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-purple-500 rounded-full mr-1"></span>
                      <span className="text-xs text-gray-500">{t('Transactions')}</span>
                    </div>
                  </div>
                </div>
                
                {/* Simple chart visualization placeholder */}
                <div className="h-60 flex items-end">
                  {platformGrowthData.users.map((value, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="relative w-full h-48">
                        <div 
                          className="absolute bottom-0 w-2 bg-blue-500 rounded-t mx-auto left-0 right-0"
                          style={{ height: `${(value / 3100) * 100}%` }}
                        ></div>
                        <div 
                          className="absolute bottom-0 w-2 bg-green-500 rounded-t mx-auto left-0 right-0 ml-3"
                          style={{ height: `${(platformGrowthData.businesses[index] / 95) * 100}%` }}
                        ></div>
                        <div 
                          className="absolute bottom-0 w-2 bg-purple-500 rounded-t mx-auto left-0 right-0 ml-6"
                          style={{ height: `${(platformGrowthData.transactions[index] / 11500) * 60}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-2">
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Regional data placeholder */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{t('Regional Activity')}</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500">{t('North America')}</span>
                        <span className="text-sm font-medium text-gray-900">42%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '42%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500">{t('Europe')}</span>
                        <span className="text-sm font-medium text-gray-900">28%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '28%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500">{t('Asia Pacific')}</span>
                        <span className="text-sm font-medium text-gray-900">18%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '18%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500">{t('Latin America')}</span>
                        <span className="text-sm font-medium text-gray-900">8%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '8%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500">{t('Other Regions')}</span>
                        <span className="text-sm font-medium text-gray-900">4%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '4%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{t('System Performance')}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Zap className="w-4 h-4 text-yellow-500 mr-2" />
                        <span className="text-sm text-gray-700">{t('API Response Time')}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">145ms</div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Activity className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-700">{t('Uptime')}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">99.98%</div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <CreditCard className="w-4 h-4 text-blue-500 mr-2" />
                        <span className="text-sm text-gray-700">{t('Transaction Success Rate')}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">98.2%</div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-purple-500 mr-2" />
                        <span className="text-sm text-gray-700">{t('Concurrent Users')}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">832</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Other report types would be added here */}
          {reportType !== 'overview' && (
            <div className="flex items-center justify-center h-60 border border-gray-200 rounded-lg bg-gray-50">
              <div className="text-center">
                <BarChart2 className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">{t('Detailed analytics for')} {reportType} {t('will be implemented soon')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics; 