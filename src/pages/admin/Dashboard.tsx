import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminAnalyticsDashboard } from '../../components/admin/AdminAnalyticsDashboard';
import { 
  Users, 
  Building, 
  Shield, 
  AlertTriangle, 
  CreditCard, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  X,
  ArrowRight,
  Bell,
  Mail,
  Eye,
  RefreshCcw,
  Plus,
  Calendar,
  MapPin
} from 'lucide-react';

// Mock data for quick actions
const pendingBusinesses = [
  { id: 1, name: 'Green Coffee', email: 'info@greencoffee.com', date: '2023-09-15T10:30:00Z' },
  { id: 2, name: 'Byte Electronics', email: 'contact@byteelectronics.com', date: '2023-09-14T15:45:00Z' },
  { id: 3, name: 'Fresh Grocery', email: 'hello@freshgrocery.com', date: '2023-09-14T09:20:00Z' }
];

// Mock data for recent activities
const recentActivities = [
  { id: 1, type: 'user_registration', message: 'New user registered: Sarah Johnson', time: '10 minutes ago', icon: <Users className="w-4 h-4 text-blue-600" />, bgColor: 'bg-blue-50' },
  { id: 2, type: 'business_application', message: 'New business application: Green Coffee', time: '45 minutes ago', icon: <Building className="w-4 h-4 text-green-600" />, bgColor: 'bg-green-50' },
  { id: 3, type: 'transaction', message: 'Large transaction: $5,230 at Tech Haven', time: '1 hour ago', icon: <DollarSign className="w-4 h-4 text-yellow-600" />, bgColor: 'bg-yellow-50' },
  { id: 4, type: 'system_alert', message: 'System alert: High server load detected', time: '2 hours ago', icon: <AlertTriangle className="w-4 h-4 text-red-600" />, bgColor: 'bg-red-50' },
  { id: 5, type: 'promotion_created', message: 'New promotion created: Summer Discount', time: '3 hours ago', icon: <CreditCard className="w-4 h-4 text-purple-600" />, bgColor: 'bg-purple-50' },
  { id: 6, type: 'system_update', message: 'System update scheduled for maintenance', time: '5 hours ago', icon: <RefreshCcw className="w-4 h-4 text-indigo-600" />, bgColor: 'bg-indigo-50' }
];

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [activeQuickAction, setActiveQuickAction] = useState<'approvals' | 'transactions' | 'alerts' | 'announcements'>('approvals');

  // Function to format date from ISO string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  const renderQuickActionContent = () => {
    switch (activeQuickAction) {
      case 'approvals':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-800">{t('Pending Business Approvals')}</h3>
              <span className="text-sm text-gray-500">{pendingBusinesses.length} pending</span>
            </div>
            {pendingBusinesses.map(business => (
              <div key={business.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <div>
                  <div className="font-medium text-gray-800">{business.name}</div>
                  <div className="text-sm text-gray-500">{business.email}</div>
                  <div className="text-xs text-gray-400 mt-1">Applied: {formatDate(business.date)}</div>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                  <button className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            <button className="w-full py-2 text-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
              {t('View all pending approvals')} <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        );
      case 'transactions':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('Recent Transactions')}</h3>
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium text-gray-800">$456.78 at Coffee Haven</div>
                    <div className="text-sm text-gray-500">2,345 points awarded</div>
                  </div>
                  <div className="text-sm text-gray-500">Today, 10:32 AM</div>
                </div>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium text-gray-800">$1,245.00 at Tech Haven</div>
                    <div className="text-sm text-gray-500">6,225 points awarded</div>
                  </div>
                  <div className="text-sm text-gray-500">Today, 9:14 AM</div>
                </div>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium text-gray-800">$89.50 at Fresh Market</div>
                    <div className="text-sm text-gray-500">448 points awarded</div>
                  </div>
                  <div className="text-sm text-gray-500">Yesterday, 5:23 PM</div>
                </div>
              </div>
            </div>
            <button className="w-full py-2 text-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
              {t('View all transactions')} <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        );
      case 'alerts':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('System Alerts')}</h3>
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="font-medium text-red-800">High Server Load Detected</div>
                  <div className="text-sm text-red-600 mt-1">Database server is experiencing high load (87% CPU usage). Performance may be affected.</div>
                  <div className="mt-3 flex space-x-3">
                    <button className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                      {t('Investigate Now')}
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                      {t('Dismiss')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="font-medium text-yellow-800">Payment Gateway Issues</div>
                  <div className="text-sm text-yellow-600 mt-1">Some users are experiencing delays in payment processing. The payment provider has been notified.</div>
                  <div className="mt-3 flex space-x-3">
                    <button className="px-3 py-1.5 text-xs font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors">
                      {t('View Details')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <button className="w-full py-2 text-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
              {t('View all system alerts')} <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        );
      case 'announcements':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-800">{t('Send Platform Announcement')}</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Recipient Group')}
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">{t('All Users')}</option>
                  <option value="businesses">{t('All Businesses')}</option>
                  <option value="customers">{t('All Customers')}</option>
                  <option value="admins">{t('Admin Staff')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Announcement Title')}
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('Enter announcement title')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Message')}
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder={t('Enter announcement message')}
                />
              </div>
              <div className="flex items-center">
                <input
                  id="urgent"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="urgent" className="ml-2 block text-sm text-gray-700">
                  {t('Mark as urgent')}
                </label>
              </div>
              <button className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                <Mail className="w-4 h-4 mr-2" />
                {t('Send Announcement')}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              {t('adminDashboard.title', 'Admin Dashboard')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('Overview of platform performance and activity')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
              <RefreshCcw className="w-4 h-4" />
            </button>
            <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="today">{t('Today')}</option>
              <option value="week">{t('This Week')}</option>
              <option value="month" selected>{t('This Month')}</option>
              <option value="year">{t('This Year')}</option>
            </select>
          </div>
        </div>

        {/* Platform Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('Total Users')}</p>
                <p className="text-2xl font-bold text-gray-900">24,521</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <p className="text-xs text-green-500">+12.5% vs last month</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500">{t('Customers')}</p>
                <p className="text-sm font-semibold text-gray-700">21,345</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('Businesses')}</p>
                <p className="text-sm font-semibold text-gray-700">3,145</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('Admins')}</p>
                <p className="text-sm font-semibold text-gray-700">31</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-50 p-3 rounded-full">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('Active Programs')}</p>
                <p className="text-2xl font-bold text-gray-900">1,845</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <p className="text-xs text-green-500">+7.2% vs last month</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500">{t('Points')}</p>
                <p className="text-sm font-semibold text-gray-700">1,432</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('Stamps')}</p>
                <p className="text-sm font-semibold text-gray-700">324</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('Tiers')}</p>
                <p className="text-sm font-semibold text-gray-700">89</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-purple-50 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('Transactions')}</p>
                <p className="text-2xl font-bold text-gray-900">128,543</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <p className="text-xs text-green-500">+18.9% vs last month</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500">{t('Today')}</p>
                <p className="text-sm font-semibold text-gray-700">3,421</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('Week')}</p>
                <p className="text-sm font-semibold text-gray-700">24,810</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('Month')}</p>
                <p className="text-sm font-semibold text-gray-700">128,543</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-50 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('Revenue')}</p>
                <p className="text-2xl font-bold text-gray-900">$1.45M</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <p className="text-xs text-green-500">+22.3% vs last month</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500">{t('Platform')}</p>
                <p className="text-sm font-semibold text-gray-700">$435K</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('Business')}</p>
                <p className="text-sm font-semibold text-gray-700">$876K</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('Fees')}</p>
                <p className="text-sm font-semibold text-gray-700">$139K</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-50 p-3 rounded-full">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('New Registrations')}</p>
                <p className="text-2xl font-bold text-gray-900">342</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <p className="text-xs text-green-500">+5.2% vs last month</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500">{t('Today')}</p>
                <p className="text-sm font-semibold text-gray-700">18</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('Week')}</p>
                <p className="text-sm font-semibold text-gray-700">96</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('Month')}</p>
                <p className="text-sm font-semibold text-gray-700">342</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-red-50 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('System Alerts')}</p>
                <p className="text-2xl font-bold text-gray-900">2</p>
                <p className="text-xs text-red-500 mt-1">{t('Requires attention')}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <ul className="space-y-2">
                <li className="text-sm text-red-600 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t('High server load detected')}
                </li>
                <li className="text-sm text-yellow-600 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t('Payment gateway issues')}
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-orange-50 p-3 rounded-full">
                <MapPin className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('Top Regions')}</p>
                <p className="text-2xl font-bold text-gray-900">5</p>
                <p className="text-xs text-gray-500 mt-1">{t('By transaction volume')}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <ol className="space-y-1">
                <li className="text-sm text-gray-700 flex items-center justify-between">
                  <span>New York</span>
                  <span className="font-medium">24.5%</span>
                </li>
                <li className="text-sm text-gray-700 flex items-center justify-between">
                  <span>Los Angeles</span>
                  <span className="font-medium">18.3%</span>
                </li>
                <li className="text-sm text-gray-700 flex items-center justify-between">
                  <span>Chicago</span>
                  <span className="font-medium">12.7%</span>
                </li>
              </ol>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-cyan-50 p-3 rounded-full">
                <Building className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('Pending Approvals')}</p>
                <p className="text-2xl font-bold text-gray-900">24</p>
                <p className="text-xs text-yellow-500 mt-1">{t('Requires attention')}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                {t('Review Approvals')}
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <AdminAnalyticsDashboard />
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveQuickAction('approvals')}
                  className={`px-4 py-3 text-sm font-medium flex-1 text-center transition-colors ${
                    activeQuickAction === 'approvals'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {t('Approve Businesses')}
                </button>
                <button
                  onClick={() => setActiveQuickAction('transactions')}
                  className={`px-4 py-3 text-sm font-medium flex-1 text-center transition-colors ${
                    activeQuickAction === 'transactions'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {t('Transactions')}
                </button>
                <button
                  onClick={() => setActiveQuickAction('alerts')}
                  className={`px-4 py-3 text-sm font-medium flex-1 text-center transition-colors ${
                    activeQuickAction === 'alerts'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {t('Alerts')}
                </button>
                <button
                  onClick={() => setActiveQuickAction('announcements')}
                  className={`px-4 py-3 text-sm font-medium flex-1 text-center transition-colors ${
                    activeQuickAction === 'announcements'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {t('Announcements')}
                </button>
              </div>
            </div>
            <div className="p-6">
              {renderQuickActionContent()}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">{t('Recent Activity')}</h2>
              <div className="flex space-x-2">
                <select className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">{t('All Activity')}</option>
                  <option value="users">{t('Users')}</option>
                  <option value="businesses">{t('Businesses')}</option>
                  <option value="transactions">{t('Transactions')}</option>
                  <option value="system">{t('System')}</option>
                </select>
                <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <RefreshCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                  <div className={`${activity.bgColor} p-2 rounded-full`}>
                    {activity.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
                {t('View all activity')}
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center">
                {t('Export log')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;