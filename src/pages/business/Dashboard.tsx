import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { RedemptionVerification } from '../../components/business/RedemptionVerification';
import { useBusinessCurrency } from '../../contexts/BusinessCurrencyContext';
import { useAuth } from '../../contexts/AuthContext';
import { BusinessSettingsService } from '../../services/businessSettingsService';
import { BusinessAnalyticsService } from '../../services/businessAnalyticsService';
import { 
  CreditCard, 
  QrCode, 
  Gift, 
  Users, 
  BarChart3, 
  Settings, 
  CheckCircle,
  AlertCircle,
  Target,
  Award,
  ChevronRight,
  Info
} from 'lucide-react';

interface DashboardInfoBox {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  step: number;
}

const BusinessDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currency, updateCurrency } = useBusinessCurrency();
  const [businessProfileComplete, setBusinessProfileComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    totalPrograms: 0,
    activeCustomers: 0,
    totalPoints: 0,
    totalRedemptions: 0
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Check if business profile is complete
  useEffect(() => {
    const checkBusinessProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const businessId = user.role === 'staff' && user.business_owner_id 
          ? user.business_owner_id 
          : user.id;
        
        const settings = await BusinessSettingsService.getBusinessSettings(businessId);
        
        if (settings) {
          // Check if essential business information is complete
          const isComplete = !!(
            settings.businessName && 
            settings.phone && 
            settings.address && 
            settings.country
          );
          setBusinessProfileComplete(isComplete);
        } else {
          setBusinessProfileComplete(false);
        }
      } catch (error) {
        console.error('Error checking business profile:', error);
        setBusinessProfileComplete(false);
      } finally {
        setLoading(false);
      }
    };

    checkBusinessProfile();
  }, [user]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.id) {
        setAnalyticsLoading(false);
        return;
      }

      try {
        const businessId = user.role === 'staff' && user.business_owner_id 
          ? user.business_owner_id 
          : user.id;
        
        // Fetch analytics data for the current year
        const analytics = await BusinessAnalyticsService.getBusinessAnalytics(businessId.toString(), 'year');
        
        setAnalyticsData({
          totalPrograms: analytics.totalPrograms,
          activeCustomers: analytics.activeCustomers,
          totalPoints: analytics.totalPoints,
          totalRedemptions: analytics.totalRedemptions
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
        // Keep default values on error
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  const handleCurrencyChange = (newCurrency: string) => {
    if (newCurrency === 'other') {
      navigate('/business/settings');
    } else {
      updateCurrency(newCurrency);
    }
  };


  const infoBoxes: DashboardInfoBox[] = [
    {
      id: 'program-creation',
      title: t('Create Your First Program'),
      description: t('Set up a loyalty program to start rewarding your customers. Create programs, set points rules, and design rewards that keep customers coming back.'),
      icon: <CreditCard className="w-8 h-8 text-blue-500" />,
      link: '/business/programs',
      step: 1
    },
    {
      id: 'qr-scanner',
      title: t('QR Scanner'),
      description: t('Use the QR scanner to enroll customers in your programs and award points instantly. Scan customer QR codes to manage their loyalty journey.'),
      icon: <QrCode className="w-8 h-8 text-green-500" />,
      link: '/business/qr-scanner',
      step: 2
    },
    {
      id: 'promotions',
      title: t('Create Promotions'),
      description: t('Design and launch special offers, discounts, and seasonal campaigns to attract more customers and increase engagement.'),
      icon: <Gift className="w-8 h-8 text-purple-500" />,
      link: '/business/promotions',
      step: 3
    },
    {
      id: 'customers',
      title: t('Manage Customers'),
      description: t('View customer profiles, track their loyalty progress, manage their accounts, and analyze customer behavior patterns.'),
      icon: <Users className="w-8 h-8 text-orange-500" />,
      link: '/business/customers',
      step: 4
    },
    {
      id: 'analytics',
      title: t('Analytics & Insights'),
      description: t('Get detailed insights into your loyalty program performance, customer engagement metrics, and business growth analytics.'),
      icon: <BarChart3 className="w-8 h-8 text-indigo-500" />,
      link: '/business/analytics',
      step: 5
    }
  ];

  if (loading) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-8">
        {/* ⚠️ DIAGNOSIS SECTION - Data Connectivity Issues */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 p-6 rounded-lg shadow-md">
          <div className="flex items-start">
            <Info className="w-6 h-6 text-indigo-600 mt-1 mr-4 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-indigo-800 mb-3">
                🟣 DIAGNOSIS: Business Dashboard Data Issues
              </h3>
              <div className="space-y-3 text-sm">
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-red-700 mb-2">❌ Problem #1: Direct Database Service Calls</h4>
                  <p className="text-red-900 mb-2"><strong>Current State:</strong> Two separate service calls:</p>
                  <ul className="list-disc list-inside text-red-900 ml-4 space-y-1">
                    <li><code className="bg-red-100 px-1 rounded">BusinessSettingsService.getBusinessSettings()</code> (line 62) - checks if business profile complete</li>
                    <li><code className="bg-red-100 px-1 rounded">BusinessAnalyticsService.getBusinessAnalytics()</code> (line 101) - fetches analytics data</li>
                  </ul>
                  <p className="text-red-900 mt-2"><strong>Why It's Broken:</strong> Both services likely query database directly from browser. No API endpoints for business settings or analytics.</p>
                  <p className="text-red-900"><strong>Impact:</strong> Slow page load, potential auth bypass if services don't verify business ownership properly.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-orange-700 mb-2">⚠️ Problem #2: Business ID Resolution Logic (Lines 58-60, 96-98)</h4>
                  <p className="text-orange-900 mb-2"><strong>Current State:</strong> Checks if user is staff with <code className="bg-orange-100 px-1 rounded">user.business_owner_id</code>, falls back to <code className="bg-orange-100 px-1 rounded">user.id</code>.</p>
                  <p className="text-orange-900 mb-2"><strong>Why It's Concerning:</strong> This authorization logic happens client-side. Malicious staff could modify JavaScript to use different business ID.</p>
                  <p className="text-orange-900"><strong>Impact:</strong> Potential IDOR vulnerability - staff could view other businesses' dashboards by changing <code className="bg-orange-100 px-1 rounded">businessId</code> variable.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-yellow-700 mb-2">⚠️ Problem #3: Hardcoded Dashboard Guidance (Lines 129-169)</h4>
                  <p className="text-yellow-900 mb-2"><strong>Current State:</strong> <code className="bg-yellow-100 px-1 rounded">infoBoxes</code> array contains static step-by-step guide: "Create Program", "QR Scanner", etc.</p>
                  <p className="text-yellow-900 mb-2"><strong>Why It's Suboptimal:</strong> Doesn't adapt to business's actual progress. Shows "Create Your First Program" even if they have 10 programs.</p>
                  <p className="text-yellow-900"><strong>Impact:</strong> Poor UX for established businesses. Should show contextual guidance based on account maturity.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-purple-700 mb-2">⚠️ Problem #4: Analytics Cards Show Zero During Load</h4>
                  <p className="text-purple-900 mb-2"><strong>Current State:</strong> Lines 42-46 initialize state with zeros: <code className="bg-purple-100 px-1 rounded">totalPrograms: 0, activeCustomers: 0</code>, etc.</p>
                  <p className="text-purple-900 mb-2"><strong>Why It's Broken:</strong> Cards display "0" for 1-2 seconds before data loads. Should show loading skeleton instead.</p>
                  <p className="text-purple-900"><strong>Impact:</strong> Users momentarily see "0 programs, 0 customers" and panic before real data appears.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-blue-700 mb-2">✅ Solution: Create Business Dashboard API</h4>
                  <ul className="list-disc list-inside text-blue-900 space-y-1">
                    <li>Create <code className="bg-blue-100 px-1 rounded">GET /api/business/dashboard</code> combining settings, analytics, and guidance in one response</li>
                    <li>Server-side business ID resolution with JWT verification - never trust client</li>
                    <li>Adaptive guidance: <code className="bg-blue-100 px-1 rounded">if (programs === 0) show "Create First Program" else show "Create More Programs"</code></li>
                    <li>Return loading states separately: <code className="bg-blue-100 px-1 rounded">{"settingsLoading": true, "analyticsLoading": false}</code></li>
                    <li>Follow fun.md: Consolidate under <code className="bg-blue-100 px-1 rounded">api/business/[[...path]].ts</code> catch-all</li>
                  </ul>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md border-2 border-red-300">
                  <h4 className="font-semibold text-red-700 mb-2">🚨 Security: Staff Permission Bypass Risk</h4>
                  <p className="text-red-900 mb-2"><strong>Attack Scenario:</strong> Staff member opens dev tools, changes <code className="bg-red-100 px-1 rounded">businessId</code> variable from their owner's ID to another business's ID.</p>
                  <p className="text-red-900 mb-2"><strong>Result:</strong> Could view competitor's analytics, steal customer data, see revenue numbers.</p>
                  <p className="text-red-900"><strong>Fix:</strong> API must extract business ID from JWT session token, never from request parameters.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Header with Currency Selector */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <h1 className="text-3xl font-bold mb-2">{t('Business Dashboard')}</h1>
              <p className="text-blue-100 text-lg">
                {t('Welcome back! Manage your loyalty programs and grow your business.')}
              </p>
            </div>
            
            {/* Currency Selector */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <label className="block text-sm font-medium text-blue-100 mb-2">
                {t('Currency')}
              </label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="USD" className="text-gray-900">USD - $</option>
                <option value="EUR" className="text-gray-900">EUR - €</option>
                <option value="GBP" className="text-gray-900">GBP - £</option>
                <option value="AED" className="text-gray-900">AED - د.إ</option>
                <option value="SAR" className="text-gray-900">SAR - ر.س</option>
                <option value="QAR" className="text-gray-900">QAR - ر.ق</option>
                <option value="other" className="text-gray-900">{t('Other...')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Settings Notification */}
        {businessProfileComplete === false && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 rounded-lg p-6">
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-amber-500 mt-0.5 mr-4 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-800 mb-2">
                  {t('Complete Your Business Profile')}
                </h3>
                <p className="text-amber-700 mb-4">
                  {t('Your business information is incomplete. Complete your profile to unlock all features and provide better service to your customers.')}
                </p>
                <Link
                  to="/business/settings"
                  className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {t('Complete Profile')}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('Total Programs')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                  ) : (
                    analyticsData.totalPrograms.toLocaleString()
                  )}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('Active Customers')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                  ) : (
                    analyticsData.activeCustomers.toLocaleString()
                  )}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('Points Awarded')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                  ) : (
                    analyticsData.totalPoints.toLocaleString()
                  )}
                </p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('Redemptions')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                  ) : (
                    analyticsData.totalRedemptions.toLocaleString()
                  )}
                </p>
              </div>
              <Gift className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Step-by-Step Guide */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('Get Started in 5 Simple Steps')}
            </h2>
            <p className="text-gray-600">
              {t('Follow these steps to set up your loyalty program and start growing your business')}
            </p>
          </div>

          <div className="space-y-6">
            {infoBoxes.map((box) => (
              <div
                key={box.id}
                className="group relative bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all duration-200"
              >
                {/* Step Number */}
                <div className="absolute -left-3 -top-3 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {box.step}
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {box.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {box.title}
                    </h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {box.description}
                    </p>
                    
                    <Link
                      to={box.link}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 group-hover:shadow-lg"
                    >
                      {t('Get Started')}
                      <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Redemption Verification */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            {t('Recent Activity')}
          </h2>
          <RedemptionVerification />
        </div>

        {/* Help Section */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-8 border border-indigo-100">
          <div className="text-center">
            <Info className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('Need Help Getting Started?')}
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              {t('Our comprehensive guides and support team are here to help you make the most of your loyalty program.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/business/settings"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                {t('View Settings')}
              </Link>
              <button className="inline-flex items-center px-6 py-3 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors">
                <Target className="w-4 h-4 mr-2" />
                {t('View Help Center')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default BusinessDashboard;