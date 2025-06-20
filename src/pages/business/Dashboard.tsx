import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, QrCode, BarChart, Plus, ArrowUp, ArrowDown, TrendingUp, DollarSign, Gift, Coffee, CreditCard, Award, AlertTriangle, AlertCircle, Settings, ChevronRight } from 'lucide-react';
import type { LoyaltyProgram } from '../../types/loyalty';
import type { CurrencyCode } from '../../types/currency';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { useAuth } from '../../contexts/AuthContext';
import { BusinessSettingsService } from '../../services/businessSettingsService';
import { AnalyticsService } from '../../services/analyticsService';
import { BusinessAnalyticsDashboard } from '../../components/business/BusinessAnalyticsDashboard';
import { QRScanner } from '../../components/QRScanner';
import { ProgramBuilder } from '../../components/business/ProgramBuilder';
import { Link } from 'react-router-dom';
import { QrCodeService } from '../../services/qrCodeService';
import { NotificationService } from '../../services/notificationService';
import { ScanResult, QrCodeType } from '../../types/qrCode';

// Define business analytics data interface
interface BusinessAnalyticsData {
  totalCustomers: number;
  totalSales: number;
  totalTransactions: number;
  activePrograms: number;
  recentActivity: Array<{
    id: string;
    type: string;
    timestamp: string;
    details: string;
  }>;
  salesByDay: Array<{
    date: string;
    amount: number;
  }>;
  [key: string]: any; // Allow for additional properties
}

const BusinessDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [businessData, setBusinessData] = useState<BusinessAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  
  const [scannerMessage, setScannerMessage] = useState<string>('');
  const [showProgramBuilder, setShowProgramBuilder] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<LoyaltyProgram | null>(null);
  const [animateStats, setAnimateStats] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessHasIncompleteSettings, setBusinessHasIncompleteSettings] = useState(false);

  useEffect(() => {
    async function loadBusinessData() {
      if (!user) {
        setIsLoading(false);
        setError('No user found. Please log in.');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get business profile to determine currency
        const businessProfile = await BusinessSettingsService.getBusinessSettings(user.id);
        if (businessProfile && businessProfile.currency) {
          setCurrency(businessProfile.currency as CurrencyCode);
        }

        console.log(`Loading analytics data for business user ID: ${user.id}`);
        
        // Get analytics data
        const analytics = await AnalyticsService.getBusinessAnalytics(user.id.toString(), currency, period);
        
        if (!analytics) {
          setError('Could not retrieve analytics data. Please try again later.');
          setIsLoading(false);
          return;
        }
        
        console.log('Successfully loaded analytics data:', analytics);
        setBusinessData(analytics);
        
        // Mock program data (will be replaced with real data later)
        setPrograms([
          {
            id: '1',
            businessId: '123',
            name: 'Coffee Rewards',
            description: 'Earn points for every coffee purchase',
            type: 'POINTS',
            pointValue: 1,
            rewardTiers: [
              { id: '1', programId: '1', pointsRequired: 10, reward: 'Free Coffee' },
              { id: '2', programId: '1', pointsRequired: 25, reward: 'Free Dessert' },
              { id: '3', programId: '1', pointsRequired: 50, reward: '$10 Gift Card' }
            ],
            expirationDays: 365,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]);
        
        // Trigger stats animation after data loads
        setTimeout(() => setAnimateStats(true), 300);
        
        // Load the business profile
        if (businessProfile) {
          setBusinessName(businessProfile.businessName || businessProfile.name || user.name || 'Your Business');
          
          // Check for incomplete settings
          const hasIncomplete = !businessProfile.description || 
                               !businessProfile.phone || 
                               !businessProfile.businessHours || 
                               !businessProfile.loyaltySettings.pointsPerDollar;
          
          setBusinessHasIncompleteSettings(hasIncomplete);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading business data:', err);
        setError('Failed to load business data. Please check your connection and try again.');
        setIsLoading(false);
      }
    }

    loadBusinessData();
  }, [user, currency, period]);

  const handlePeriodChange = (newPeriod: 'day' | 'week' | 'month' | 'year') => {
    setPeriod(newPeriod);
  };

  const handleScan = async (result: ScanResult) => {
    // Process QR code data
    setScannerMessage(`Scanned: ${result.rawData || 'unknown'}`);
    
    if (!user?.id) {
      setScannerMessage('Error: Business ID not available');
      setShowScanner(false);
      return;
    }
    
    try {
      // Show processing message
      setScannerMessage('Processing scan...');
      
      // Map QrCodeType to scan type expected by service
      let scanType: QrCodeType = result.type;
      
      // Get default program if available
      const defaultProgram = programs.length > 0 ? programs[0] : null;
      const programId = defaultProgram?.id;
      
      // Extract customer ID based on QR code type
      let customerId: string | undefined;
      if (result.type === 'customer' && 'customerId' in result.data) {
        customerId = String(result.data.customerId);
      } else if (result.type === 'loyaltyCard' && 'customerId' in result.data) {
        customerId = String(result.data.customerId);
      }
      
      // Process the QR code scan
      const scanResult = await QrCodeService.processQrCodeScan(
        scanType,
        user.id,
        result.data,
        {
          customerId,
          programId: programId || (result.type === 'loyaltyCard' && 'programId' in result.data ? String(result.data.programId) : undefined),
          pointsToAward: 10 // Default points to award
        }
      );
      
      if (scanResult.success) {
        // Show success message
        setScannerMessage(`Success! ${scanResult.pointsAwarded || 0} points awarded.`);
        
        // Send notification to business owner
        await NotificationService.createNotification(
          user.id.toString(),
          'POINTS_EARNED',
          'Successful Scan',
          `You successfully scanned a customer QR code and awarded ${scanResult.pointsAwarded || 0} points.`
        );
      } else {
        // Show error message
        setScannerMessage(`Error: ${scanResult.message}`);
        
        // Send notification about failed scan
        await NotificationService.createNotification(
          user.id.toString(),
          'SYSTEM_ALERT',
          'Scan Failed',
          scanResult.message || 'Failed to process QR code scan'
        );
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      setScannerMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Send error notification
      if (user?.id) {
        await NotificationService.createNotification(
          user.id.toString(),
          'SYSTEM_ALERT',
          'Scan Error',
          'An error occurred while processing the QR code'
        );
      }
    } finally {
      // Close scanner after processing
      setTimeout(() => {
        setShowScanner(false);
      }, 2000);
    }
  };

  const handleScanError = (error: Error): void => {
    console.error('Scan error:', error);
    setScannerMessage(`Error scanning QR code: ${error.message}`);
    setShowScanner(false);
  };

  const handleProgramSubmit = (program: Partial<LoyaltyProgram>) => {
    if (selectedProgram) {
      // Update existing program
      setPrograms(programs.map(p => p.id === selectedProgram.id ? { ...p, ...program } as LoyaltyProgram : p));
    } else {
      // Add new program with required fields
      setPrograms([...programs, { 
        ...program, 
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as LoyaltyProgram]);
    }
    setShowProgramBuilder(false);
    setSelectedProgram(null);
  };

  if (isLoading) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">{t('Loading dashboard data...')}</p>
          </div>
        </div>
      </BusinessLayout>
    );
  }

  if (error) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-6 max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('Error Loading Dashboard')}</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {t('Retry')}
            </button>
          </div>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      {/* Dashboard Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('Welcome to your Dashboard')}</h1>
            <p className="text-gray-600 mt-1">{businessName}</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
            <button
              onClick={() => setShowScanner(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 transition-colors"
            >
              <QrCode className="h-5 w-5 mr-2" />
              {t('Scan QR')}
            </button>
            <button
              onClick={() => { setShowProgramBuilder(true); setSelectedProgram(null); }}
              className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center hover:bg-green-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              {t('New Program')}
            </button>
          </div>
        </div>
        
        {businessHasIncompleteSettings && (
          <div className="mt-4 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md">
            <div className="flex">
              <AlertTriangle className="h-6 w-6 text-amber-500 mr-3 flex-shrink-0" />
              <div>
                <p className="text-amber-800 font-medium">{t('Your business profile is incomplete')}</p>
                <p className="text-amber-700 text-sm mt-1">{t('Complete your profile to unlock all features')}</p>
                <Link 
                  to="/business/settings" 
                  className="mt-2 inline-flex items-center text-sm font-medium text-amber-600 hover:text-amber-800"
                >
                  {t('Complete Profile')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={`bg-white rounded-lg shadow p-6 border-l-4 border-blue-500 transition-all duration-500 ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('Total Customers')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{businessData?.totalCustomers || 0}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-md">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className="text-green-500 flex items-center text-sm font-medium">
              <ArrowUp className="h-4 w-4 mr-1" />
              12%
            </span>
            <span className="text-gray-500 text-sm ml-2">{t('vs last period')}</span>
          </div>
        </div>
        
        <div className={`bg-white rounded-lg shadow p-6 border-l-4 border-green-500 transition-all duration-500 delay-100 ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('Total Sales')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{currency} {(businessData?.totalSales || 0).toLocaleString()}</p>
            </div>
            <div className="bg-green-100 p-2 rounded-md">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className="text-green-500 flex items-center text-sm font-medium">
              <ArrowUp className="h-4 w-4 mr-1" />
              8.2%
            </span>
            <span className="text-gray-500 text-sm ml-2">{t('vs last period')}</span>
          </div>
        </div>
        
        <div className={`bg-white rounded-lg shadow p-6 border-l-4 border-purple-500 transition-all duration-500 delay-200 ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('Transactions')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{businessData?.totalTransactions || 0}</p>
            </div>
            <div className="bg-purple-100 p-2 rounded-md">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className="text-red-500 flex items-center text-sm font-medium">
              <ArrowDown className="h-4 w-4 mr-1" />
              3.1%
            </span>
            <span className="text-gray-500 text-sm ml-2">{t('vs last period')}</span>
          </div>
        </div>
        
        <div className={`bg-white rounded-lg shadow p-6 border-l-4 border-amber-500 transition-all duration-500 delay-300 ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('Active Programs')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{businessData?.activePrograms || programs.length}</p>
            </div>
            <div className="bg-amber-100 p-2 rounded-md">
              <Award className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className="text-green-500 flex items-center text-sm font-medium">
              <TrendingUp className="h-4 w-4 mr-1" />
              {t('Active')}
            </span>
            <span className="text-gray-500 text-sm ml-2">{t('All programs running')}</span>
          </div>
        </div>
      </div>
      
      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">{t('Business Analytics')}</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handlePeriodChange('day')}
                  className={`px-3 py-1 text-sm rounded-md ${period === 'day' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {t('Day')}
                </button>
                <button 
                  onClick={() => handlePeriodChange('week')}
                  className={`px-3 py-1 text-sm rounded-md ${period === 'week' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {t('Week')}
                </button>
                <button 
                  onClick={() => handlePeriodChange('month')}
                  className={`px-3 py-1 text-sm rounded-md ${period === 'month' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {t('Month')}
                </button>
                <button 
                  onClick={() => handlePeriodChange('year')}
                  className={`px-3 py-1 text-sm rounded-md ${period === 'year' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {t('Year')}
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <BusinessAnalyticsDashboard 
              businessId={user?.id?.toString() || ''}
              currency={currency}
              period={period}
            />
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-800">{t('Recent Activity')}</h2>
          </div>
          <div className="p-6">
            {businessData && businessData.recentActivity && businessData.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {businessData.recentActivity.map((activity, index) => (
                  <div key={activity.id || index} className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      {activity.type === 'POINTS_AWARDED' && (
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Gift className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                      {activity.type === 'REWARD_REDEEMED' && (
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <Coffee className="h-4 w-4 text-purple-600" />
                        </div>
                      )}
                      {activity.type === 'NEW_CUSTOMER' && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.details}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleTimeString()} - {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <BarChart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t('No recent activity to display')}</p>
                <p className="text-sm text-gray-400 mt-1">{t('Activity will appear here as you use the system')}</p>
              </div>
            )}
          </div>
          <div className="border-t p-4">
            <Link to="/business/analytics" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center">
              {t('View All Activity')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
      
      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">{t('Scan Customer QR Code')}</h2>
                <button 
                  onClick={() => setShowScanner(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <QRScanner 
                onScan={handleScan} 
                onError={handleScanError}
                businessId={user?.id}
              />
              {scannerMessage && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
                  {scannerMessage}
                </div>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-b-lg">
              <button 
                onClick={() => setShowScanner(false)}
                className="w-full py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                {t('Close')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Program Builder Modal */}
      {showProgramBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  {selectedProgram ? t('Edit Loyalty Program') : t('Create New Loyalty Program')}
                </h2>
                <button 
                  onClick={() => setShowProgramBuilder(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <ProgramBuilder 
                initialProgram={selectedProgram || undefined}
                onSubmit={handleProgramSubmit}
                onCancel={() => setShowProgramBuilder(false)}
              />
            </div>
          </div>
        </div>
      )}
    </BusinessLayout>
  );
};

export default BusinessDashboard;