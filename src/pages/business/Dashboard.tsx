import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QRScanner } from '../../components/QRScanner';
import { ProgramBuilder } from '../../components/business/ProgramBuilder';
import { Users, QrCode, BarChart, Plus, ArrowUp, ArrowDown, TrendingUp, DollarSign, Gift, Coffee, CreditCard, Award } from 'lucide-react';
import type { LoyaltyProgram } from '../../types/loyalty';
import { BusinessLayout } from '../../components/business/BusinessLayout';

const BusinessDashboard = () => {
  const { t } = useTranslation();
  const [scannerMessage, setScannerMessage] = useState<string>('');
  const [showProgramBuilder, setShowProgramBuilder] = useState(false);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<LoyaltyProgram | null>(null);
  const [animateStats, setAnimateStats] = useState(false);

  useEffect(() => {
    // TODO: Fetch programs from API
    // This is a mock implementation
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
    
    // Trigger stats animation after a short delay
    setTimeout(() => setAnimateStats(true), 300);
  }, []);

  const handleScan = (data: string) => {
    try {
      const qrData = JSON.parse(data);
      if (qrData.type === 'customer_card') {
        setScannerMessage(`Customer ID: ${qrData.customerId} scanned successfully!`);
      }
    } catch (error) {
      setScannerMessage('Invalid QR code');
    }
  };

  const handleError = (error: Error) => {
    setScannerMessage(`Error: ${error.message}`);
  };

  const handleProgramDelete = (programId: string) => {
    // TODO: Implement API call to delete program
    setPrograms(programs.filter((program) => program.id !== programId));
    setShowProgramBuilder(false);
  };

  const handleProgramEdit = (program: LoyaltyProgram) => {
    setSelectedProgram(program);
    setShowProgramBuilder(true);
  };

  const handleProgramSubmit = (program: Partial<LoyaltyProgram>) => {
    // TODO: Implement API call to create/update program
    if (selectedProgram) {
      setPrograms(
        programs.map((p) => (p.id === selectedProgram.id ? { ...p, ...program } as LoyaltyProgram : p))
      );
    } else {
      const newProgram = {
        ...program,
        id: Date.now().toString(),
        businessId: '123', // TODO: Get from auth context
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as LoyaltyProgram;
      setPrograms([...programs, newProgram]);
    }
    setShowProgramBuilder(false);
    setSelectedProgram(null);
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            {t('businessDashboard.title', 'Business Dashboard')}
          </h1>
          <div>
            <button 
              onClick={() => {
                setSelectedProgram(null);
                setShowProgramBuilder(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md"
            >
              <Plus className="w-5 h-5" />
              {t('Create Program')}
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className={`group bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-blue-100 p-6 transition-all duration-500 ease-out transform ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} hover:-translate-y-1 hover:shadow-xl`} style={{ transitionDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('Total Customers')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 group-hover:text-blue-700 transition-colors">1,248</p>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className="flex items-center bg-green-50 px-2 py-0.5 rounded-lg text-green-600 font-medium">
                <ArrowUp className="w-4 h-4 mr-1" />
                12.5%
              </span>
              <span className="text-gray-500 ml-2">vs last month</span>
            </div>
            <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div className={`bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-1000 ease-out ${animateStats ? 'w-[70%]' : 'w-0'}`}></div>
            </div>
          </div>

          <div className={`group bg-gradient-to-br from-white to-green-50 rounded-xl shadow-lg border border-green-100 p-6 transition-all duration-500 ease-out transform ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} hover:-translate-y-1 hover:shadow-xl`} style={{ transitionDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('Points Awarded')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 group-hover:text-green-700 transition-colors">8,492</p>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className="flex items-center bg-green-50 px-2 py-0.5 rounded-lg text-green-600 font-medium">
                <ArrowUp className="w-4 h-4 mr-1" />
                23.1%
              </span>
              <span className="text-gray-500 ml-2">vs last month</span>
            </div>
            <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div className={`bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all duration-1000 ease-out ${animateStats ? 'w-[85%]' : 'w-0'}`}></div>
            </div>
          </div>

          <div className={`group bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg border border-purple-100 p-6 transition-all duration-500 ease-out transform ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} hover:-translate-y-1 hover:shadow-xl`} style={{ transitionDelay: '300ms' }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('Redemptions')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 group-hover:text-purple-700 transition-colors">384</p>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                <Gift className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className="flex items-center bg-green-50 px-2 py-0.5 rounded-lg text-green-600 font-medium">
                <ArrowUp className="w-4 h-4 mr-1" />
                8.3%
              </span>
              <span className="text-gray-500 ml-2">vs last month</span>
            </div>
            <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div className={`bg-gradient-to-r from-purple-400 to-purple-600 h-full rounded-full transition-all duration-1000 ease-out ${animateStats ? 'w-[45%]' : 'w-0'}`}></div>
            </div>
          </div>

          <div className={`group bg-gradient-to-br from-white to-amber-50 rounded-xl shadow-lg border border-amber-100 p-6 transition-all duration-500 ease-out transform ${animateStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} hover:-translate-y-1 hover:shadow-xl`} style={{ transitionDelay: '400ms' }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('Revenue')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 group-hover:text-amber-700 transition-colors">$12,876</p>
              </div>
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className="flex items-center bg-red-50 px-2 py-0.5 rounded-lg text-red-600 font-medium">
                <ArrowDown className="w-4 h-4 mr-1" />
                3.2%
              </span>
              <span className="text-gray-500 ml-2">vs last month</span>
            </div>
            <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div className={`bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full transition-all duration-1000 ease-out ${animateStats ? 'w-[65%]' : 'w-0'}`}></div>
            </div>
          </div>
        </div>

        {/* Programs Section */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center">
            <Award className="w-5 h-5 text-indigo-600 mr-2" />
            {t('Loyalty Programs')}
          </h2>

          {showProgramBuilder ? (
            <ProgramBuilder
              initialProgram={selectedProgram || undefined}
              onSubmit={handleProgramSubmit}
            />
          ) : (
            <div className="space-y-4">
              {programs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {programs.map((program) => (
                    <div
                      key={program.id}
                      className="group border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:border-blue-200 bg-gradient-to-br from-white to-blue-50 transform hover:-translate-y-1"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900 flex items-center group-hover:text-blue-700 transition-colors">
                            {program.type === 'POINTS' && <Coffee className="w-5 h-5 mr-2 text-blue-500" />}
                            {program.name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{program.description}</p>
                          <div className="mt-3 flex items-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              program.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {program.status}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {program.type} • {program.rewardTiers.length} tiers
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleProgramEdit(program)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors shadow-sm hover:shadow"
                          >
                            {t('Edit')}
                          </button>
                          <button
                            onClick={() => handleProgramDelete(program.id)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors shadow-sm hover:shadow"
                          >
                            {t('Delete')}
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-5 pt-5 border-t border-gray-100">
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                          <Gift className="w-4 h-4 mr-1.5 text-blue-500" />
                          Reward Tiers
                        </h4>
                        <div className="space-y-2.5">
                          {program.rewardTiers.map((tier, index) => (
                            <div 
                              key={tier.id} 
                              className="flex justify-between items-center p-2.5 rounded-lg bg-white border border-gray-100 hover:shadow-sm transition-all hover:-translate-y-0.5 transform"
                            >
                              <div className="flex items-center">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium text-xs mr-3 shadow-sm">
                                  {index + 1}
                                </div>
                                <span className="text-sm font-medium text-gray-700">{tier.reward}</span>
                              </div>
                              <div className="flex items-center bg-blue-50 px-2.5 py-1 rounded-lg">
                                <CreditCard className="w-3.5 h-3.5 text-blue-500 mr-1" />
                                <span className="text-sm font-medium text-blue-700">{tier.pointsRequired} pts</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-dashed border-blue-200 shadow-inner">
                  <Plus className="w-14 h-14 text-blue-300 mx-auto mb-4 opacity-70" />
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {t('No programs created yet. Create your first loyalty program to start rewarding your customers!')}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedProgram(null);
                      setShowProgramBuilder(true);
                    }}
                    className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-md text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    {t('Create Program')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Customer Scanner */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <QrCode className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="font-semibold text-gray-800">{t('Scan Customer QR')}</h2>
          </div>
          <QRScanner onScan={handleScan} onError={handleError} />
          {scannerMessage && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg text-sm border border-blue-100 flex items-start">
              <div className="bg-blue-100 p-1 rounded-full mr-2 flex-shrink-0">
                <QrCode className="w-4 h-4 text-blue-600" />
              </div>
              <div>{scannerMessage}</div>
            </div>
          )}
        </div>
      </div>
    </BusinessLayout>
  );
};

export default BusinessDashboard;