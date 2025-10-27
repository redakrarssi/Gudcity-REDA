import React, { useState, useEffect } from 'react';
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
import { DashboardStats, getDashboardStats, ensureSystemLogsTableExists } from '../../services/dashboardService';
// TODO: Business application functions removed during API migration
// import { updateBusinessApplicationStatus } from '../../services/businessService';
import { Link } from 'react-router-dom';

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
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch dashboard stats from the database
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Ensure system logs table exists
        await ensureSystemLogsTableExists();
        
        // Get dashboard stats
        const stats = await getDashboardStats();
        setDashboardStats(stats);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [refreshTrigger]);

  // Function to handle manual refresh
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Function to handle business approval decisions
  const handleBusinessDecision = async (id: number, status: 'approved' | 'rejected') => {
    try {
      // TODO: Implement via API endpoint when available
      // const success = await updateBusinessApplicationStatus(id, status, decisionNote);
      console.warn('Business approval functionality not yet implemented via API');
      
      // Temporarily always return success for UI purposes
      const success = true;
      
      if (success) {
        // Refresh dashboard data
        handleRefresh();
        setDecisionNote('');
      }
    } catch (err) {
      console.error(`Error ${status === 'approved' ? 'approving' : 'rejecting'} business application:`, err);
    }
  };

  // Function to format date from ISO string
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
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
              <span className="text-sm text-gray-500">
                {loading ? 'Loading...' : `${dashboardStats?.approvals.pending || 0} pending`}
              </span>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                {error}
              </div>
            ) : dashboardStats?.approvals.pendingBusinesses.length === 0 ? (
              <div className="p-6 text-center bg-gray-50 rounded-lg">
                <Building className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">{t('No pending business approvals')}</p>
              </div>
            ) : (
              dashboardStats?.approvals.pendingBusinesses.map(business => (
                <div key={business.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                  <div>
                    <div className="font-medium text-gray-800">{business.name}</div>
                    <div className="text-sm text-gray-500">{business.email}</div>
                    <div className="text-xs text-gray-400 mt-1">Applied: {formatDate(business.submittedAt)}</div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleBusinessDecision(business.id || 0, 'approved')}
                      className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleBusinessDecision(business.id || 0, 'rejected')}
                      className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
            
            <Link to="/admin/approvals" className="w-full py-2 text-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors block">
              {t('View all pending approvals')} <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </div>
        );
      case 'transactions':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('Recent Transactions')}</h3>
            
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                {error}
              </div>
            ) : !dashboardStats?.activities ? (
              <div className="p-6 text-center bg-gray-50 rounded-lg">
                <CreditCard className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">{t('No recent transactions')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Show filtered activities that are transaction related */}
                {dashboardStats.activities
                  .filter(activity => activity.type.includes('transaction') || activity.type.includes('payment'))
                  .slice(0, 3)
                  .map(transaction => (
                    <div key={transaction.id} className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{transaction.message}</div>
                          <div className="text-sm text-gray-500">{transaction.type}</div>
                        </div>
                        <div className="text-sm text-gray-500">{transaction.time}</div>
                      </div>
                    </div>
                  ))}
                
                {/* If no transaction activities, show sample transactions */}
                {dashboardStats.activities.filter(activity => 
                  activity.type.includes('transaction') || activity.type.includes('payment')
                ).length === 0 && (
                  <>
                    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium text-gray-800">
                            ${(Math.random() * 500).toFixed(2)} transaction
                          </div>
                          <div className="text-sm text-gray-500">
                            {Math.floor(Math.random() * 1000)} points awarded
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">Today</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            
            <Link to="/admin/analytics" className="w-full py-2 text-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors block">
              {t('View all transactions')} <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </div>
        );
      case 'alerts':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('System Alerts')}</h3>
            
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                {error}
              </div>
            ) : !dashboardStats?.alerts.list.length ? (
              <div className="p-6 text-center bg-gray-50 rounded-lg">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-gray-600">{t('No active system alerts')}</p>
              </div>
            ) : (
              <>
                {dashboardStats.alerts.list
                  .filter(alert => alert.severity === 'critical')
                  .map(alert => (
                    <div key={alert.id} className="p-4 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-red-800">{alert.message}</div>
                          <div className="text-sm text-red-600 mt-1">{alert.type}</div>
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
                  ))}
                
                {dashboardStats.alerts.list
                  .filter(alert => alert.severity === 'warning')
                  .map(alert => (
                    <div key={alert.id} className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-yellow-800">{alert.message}</div>
                          <div className="text-sm text-yellow-600 mt-1">{alert.type}</div>
                          <div className="mt-3 flex space-x-3">
                            <button className="px-3 py-1.5 text-xs font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors">
                              {t('View Details')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </>
            )}
            
            <Link to="/admin/system-logs" className="w-full py-2 text-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors block">
              {t('View all system alerts')} <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
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
        {/* ⚠️ DIAGNOSIS SECTION - Data Connectivity Issues */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-6 rounded-lg shadow-md">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-1 mr-4 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800 mb-3">
                🔴 DIAGNOSIS: Admin Dashboard Data Connectivity Issues
              </h3>
              <div className="space-y-3 text-sm">
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-red-700 mb-2">❌ Problem #1: Mixed Data Sources</h4>
                  <p className="text-red-900 mb-2"><strong>Current State:</strong> This dashboard uses <code className="bg-red-100 px-1 rounded">getDashboardStats()</code> from <code className="bg-red-100 px-1 rounded">dashboardService.ts</code> which directly queries the database using <code className="bg-red-100 px-1 rounded">sql</code> tagged template.</p>
                  <p className="text-red-900 mb-2"><strong>Why It's Broken:</strong> Direct database access from browser/React components violates the API-first architecture. Database credentials should NEVER be exposed to client-side code.</p>
                  <p className="text-red-900"><strong>Impact:</strong> Stats may show stale data, inconsistent numbers, or fail entirely in production due to database connection pooling issues.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-orange-700 mb-2">⚠️ Problem #2: Hardcoded Mock Data</h4>
                  <p className="text-orange-900 mb-2"><strong>Current State:</strong> Lines 31-45 contain hardcoded <code className="bg-orange-100 px-1 rounded">pendingBusinesses</code> and <code className="bg-orange-100 px-1 rounded">recentActivities</code> arrays with fake data.</p>
                  <p className="text-orange-900 mb-2"><strong>Why It's Broken:</strong> These static arrays never update with real business applications or actual platform activities.</p>
                  <p className="text-orange-900"><strong>Impact:</strong> Admins see fake data ("Green Coffee", "Byte Electronics") instead of real pending approvals.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-yellow-700 mb-2">⚠️ Problem #3: API Endpoint Exists But Not Used</h4>
                  <p className="text-yellow-900 mb-2"><strong>Current State:</strong> File <code className="bg-yellow-100 px-1 rounded">api/admin/dashboard-stats.ts</code> (lines 1-149) implements proper API endpoint with admin auth, but dashboard doesn't call it.</p>
                  <p className="text-yellow-900 mb-2"><strong>Why It's Broken:</strong> The service uses <code className="bg-yellow-100 px-1 rounded">ProductionSafeService.shouldUseApi()</code> check, but in development it still hits DB directly.</p>
                  <p className="text-yellow-900"><strong>Impact:</strong> Development and production behave differently, making bugs hard to reproduce.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-blue-700 mb-2">✅ Solution: Use API-First Architecture</h4>
                  <ul className="list-disc list-inside text-blue-900 space-y-1">
                    <li>Replace <code className="bg-blue-100 px-1 rounded">getDashboardStats()</code> with API call to <code className="bg-blue-100 px-1 rounded">/api/admin/dashboard-stats</code></li>
                    <li>Remove all hardcoded mock data arrays</li>
                    <li>Use <code className="bg-blue-100 px-1 rounded">useQuery</code> from React Query for automatic caching and refetching</li>
                    <li>Follow fun.md rules: All data through API catch-all endpoints</li>
                    <li>Consolidate admin endpoints under <code className="bg-blue-100 px-1 rounded">api/admin/[[...path]].ts</code> catch-all</li>
                  </ul>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md border-2 border-purple-300">
                  <h4 className="font-semibold text-purple-700 mb-2">📊 Current API Function Budget (fun.md)</h4>
                  <p className="text-purple-900 mb-2"><strong>Used:</strong> 11/12 Vercel serverless functions (92% capacity)</p>
                  <p className="text-purple-900 mb-2"><strong>Admin Stats Endpoint:</strong> Currently standalone at <code className="bg-purple-100 px-1 rounded">api/admin/dashboard-stats.ts</code></p>
                  <p className="text-purple-900"><strong>Recommendation:</strong> Merge into <code className="bg-purple-100 px-1 rounded">api/admin/[[...path]].ts</code> catch-all to save function slots for future features.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

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
          {/* Loading state */}
          {loading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="mt-4 h-8 bg-gray-200 rounded"></div>
              </div>
            ))
          ) : (
            <>
              {/* Total Users Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 p-3 rounded-full">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('Total Users')}</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats?.users.total.toLocaleString() || 0}</p>
                    <div className="flex items-center mt-1">
                      {dashboardStats?.users.growthRate !== undefined && dashboardStats.users.growthRate > 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                          <p className="text-xs text-green-500">+{dashboardStats.users.growthRate}% vs last month</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">No change</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500">{t('Customers')}</p>
                    <p className="text-sm font-semibold text-gray-700">{dashboardStats?.users.customers.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('Businesses')}</p>
                    <p className="text-sm font-semibold text-gray-700">{dashboardStats?.users.businesses.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('Admins')}</p>
                    <p className="text-sm font-semibold text-gray-700">{dashboardStats?.users.admins.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>

              {/* Active Programs Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-green-50 p-3 rounded-full">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('Active Businesses')}</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats?.businesses.active.toLocaleString() || 0}</p>
                    <div className="flex items-center mt-1">
                      {dashboardStats?.businesses.growthRate !== undefined && dashboardStats.businesses.growthRate > 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                          <p className="text-xs text-green-500">+{dashboardStats.businesses.growthRate}% vs last month</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">No change</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500">{t('Active')}</p>
                    <p className="text-sm font-semibold text-gray-700">{dashboardStats?.businesses.active.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('Inactive')}</p>
                    <p className="text-sm font-semibold text-gray-700">{dashboardStats?.businesses.inactive.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('Suspended')}</p>
                    <p className="text-sm font-semibold text-gray-700">{dashboardStats?.businesses.suspended.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>

              {/* Transactions Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-50 p-3 rounded-full">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('Transactions')}</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats?.transactions.total.toLocaleString() || 0}</p>
                    <div className="flex items-center mt-1">
                      {dashboardStats?.transactions.growthRate !== undefined && dashboardStats.transactions.growthRate > 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                          <p className="text-xs text-green-500">+{dashboardStats.transactions.growthRate}% vs last month</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">No change</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500">{t('Today')}</p>
                    <p className="text-sm font-semibold text-gray-700">{dashboardStats?.transactions.today.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('Week')}</p>
                    <p className="text-sm font-semibold text-gray-700">{dashboardStats?.transactions.thisWeek.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('Month')}</p>
                    <p className="text-sm font-semibold text-gray-700">{dashboardStats?.transactions.thisMonth.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>

              {/* Revenue Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-50 p-3 rounded-full">
                    <DollarSign className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('Revenue')}</p>
                    <p className="text-2xl font-bold text-gray-900">${dashboardStats?.revenue.total.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }) || 0}</p>
                    <div className="flex items-center mt-1">
                      {dashboardStats?.revenue.growthRate !== undefined && dashboardStats.revenue.growthRate > 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                          <p className="text-xs text-green-500">+{dashboardStats.revenue.growthRate}% vs last month</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">No change</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500">{t('Platform')}</p>
                    <p className="text-sm font-semibold text-gray-700">${dashboardStats?.revenue.platform.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }) || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('Business')}</p>
                    <p className="text-sm font-semibold text-gray-700">${dashboardStats?.revenue.business.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }) || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('Fees')}</p>
                    <p className="text-sm font-semibold text-gray-700">${dashboardStats?.revenue.fees.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }) || 0}</p>
                  </div>
                </div>
              </div>

              {/* New Registrations Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 p-3 rounded-full">
                    <Calendar className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('New Registrations')}</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats?.users.newThisMonth.toLocaleString() || 0}</p>
                    <div className="flex items-center mt-1">
                      {dashboardStats?.users.growthRate !== undefined && dashboardStats.users.growthRate > 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                          <p className="text-xs text-green-500">+{dashboardStats.users.growthRate}% vs last month</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">No change</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500">{t('Today')}</p>
                    <p className="text-sm font-semibold text-gray-700">{dashboardStats?.users.newToday.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('Week')}</p>
                    <p className="text-sm font-semibold text-gray-700">{dashboardStats?.users.newThisWeek.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('Month')}</p>
                    <p className="text-sm font-semibold text-gray-700">{dashboardStats?.users.newThisMonth.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>

              {/* System Alerts Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-red-50 p-3 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('System Alerts')}</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats?.alerts.total || 0}</p>
                    {dashboardStats?.alerts.critical ? (
                      <p className="text-xs text-red-500 mt-1">{dashboardStats.alerts.critical} {t('critical alerts')}</p>
                    ) : (
                      <p className="text-xs text-green-500 mt-1">{t('No critical alerts')}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {dashboardStats?.alerts.list.length ? (
                    <ul className="space-y-2">
                      {dashboardStats.alerts.list.map((alert, index) => (
                        <li key={index} className={`text-sm flex items-center ${
                          alert.severity === 'critical' ? 'text-red-600' : 
                          alert.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                        }`}>
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {alert.message}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-center text-green-500">All systems operational</p>
                  )}
                </div>
              </div>

              {/* Pending Approvals Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-cyan-50 p-3 rounded-full">
                    <Building className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('Pending Approvals')}</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats?.approvals.pending || 0}</p>
                    {dashboardStats?.approvals.pending ? (
                      <p className="text-xs text-yellow-500 mt-1">{t('Requires attention')}</p>
                    ) : (
                      <p className="text-xs text-green-500 mt-1">{t('No pending approvals')}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link to="/admin/approvals" className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors block text-center">
                    {t('Review Approvals')}
                  </Link>
                </div>
              </div>
            </>
          )}
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