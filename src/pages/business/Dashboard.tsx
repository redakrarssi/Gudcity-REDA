import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, QrCode, BarChart, Plus, ArrowUp, ArrowDown, TrendingUp, DollarSign, Gift, Coffee, CreditCard, Award, AlertTriangle, AlertCircle } from 'lucide-react';
import type { LoyaltyProgram } from '../../types/loyalty';
import type { CurrencyCode } from '../../types/currency';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { useAuth } from '../../contexts/AuthContext';
import { BusinessSettingsService } from '../../services/businessSettingsService';
import { AnalyticsService } from '../../services/analyticsService';
import { BusinessAnalyticsDashboard } from '../../components/business/BusinessAnalyticsDashboard';
import { QRScanner } from '../../components/QRScanner';
import { ProgramBuilder } from '../../components/business/ProgramBuilder';

// Use the same interface as in QRScanner component
interface ScanResult {
  type: string;
  data: any;
  timestamp: string;
  raw: string;
}

const BusinessDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [businessData, setBusinessData] = useState<any>(null);
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

  const handleScan = (result: ScanResult) => {
    // TODO: Process QR code data
    setScannerMessage(`Scanned: ${result.raw}`);
    setShowScanner(false);
  };

  const handleScanError = (err: any) => {
    console.error(err);
    setScannerMessage('Error scanning QR code');
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
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('Error')}</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              {t('Retry')}
            </button>
          </div>
        </div>
      </BusinessLayout>
    );
  }

  if (!businessData) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-6 max-w-md">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('No Data Available')}</h3>
            <p className="text-gray-600 mb-4">{t('We couldn\'t find any analytics data for your business.')}</p>
          </div>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      {showScanner && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-4">{t('Scan Customer QR Code')}</h3>
            <QRScanner onScan={handleScan} />
            <p className="mt-4 text-center text-gray-600">{scannerMessage}</p>
            <button
              onClick={() => setShowScanner(false)}
              className="mt-4 w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              {t('Cancel')}
            </button>
          </div>
        </div>
      )}

      {showProgramBuilder && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {selectedProgram ? t('Edit Loyalty Program') : t('Create New Loyalty Program')}
            </h3>
            <ProgramBuilder 
              initialProgram={selectedProgram || undefined} 
              onSubmit={handleProgramSubmit} 
              onCancel={() => {
                setShowProgramBuilder(false);
                setSelectedProgram(null);
              }} 
            />
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('Business Dashboard')}</h1>
            <p className="text-gray-600">{t('Analytics and insights for your business')}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-700">{t('Period')}:</span>
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value as any)}
              className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">{t('Today')}</option>
              <option value="week">{t('This Week')}</option>
              <option value="month">{t('This Month')}</option>
              <option value="year">{t('This Year')}</option>
            </select>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <BusinessAnalyticsDashboard analytics={businessData} currency={currency} />

        {/* Programs Section */}
        <div className="mt-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">{t('Loyalty Programs')}</h2>
            <button
              onClick={() => {
                setSelectedProgram(null);
                setShowProgramBuilder(true);
              }}
              className="flex items-center text-sm font-medium px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('New Program')}
            </button>
          </div>

          {programs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <Gift className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('No Loyalty Programs')}</h3>
              <p className="text-gray-600 mb-4">{t('Create your first loyalty program to start rewarding your customers.')}</p>
              <button
                onClick={() => {
                  setSelectedProgram(null);
                  setShowProgramBuilder(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('Create Program')}
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {programs.map(program => (
                <div key={program.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {program.type === 'POINTS' ? (
                        <Award className="w-6 h-6 text-blue-600" />
                      ) : program.name.toLowerCase().includes('coffee') ? (
                        <Coffee className="w-6 h-6 text-blue-600" />
                      ) : (
                        <Gift className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      program.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {program.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{program.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{program.description}</p>
                  
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('Reward Tiers')}</span>
                      <span className="font-medium text-gray-900">{program.rewardTiers.length}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">{t('Expiration')}</span>
                      <span className="font-medium text-gray-900">{program.expirationDays} {t('days')}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedProgram(program);
                        setShowProgramBuilder(true);
                      }}
                      className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {t('Edit')}
                    </button>
                    <button
                      onClick={() => setShowScanner(true)}
                      className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <QrCode className="w-3 h-3 mr-1" />
                      {t('Scan')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BusinessLayout>
  );
};

export default BusinessDashboard;