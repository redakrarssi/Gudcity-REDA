import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCard } from '../../components/QRCard';
import { ProgramBrowser } from '../../components/customer/ProgramBrowser';
import { EnrolledPrograms } from '../../components/customer/EnrolledPrograms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { BadgeCheck, Search, TrendingUp, Sparkles, Star, Gift, Activity, Coffee } from 'lucide-react';

const CustomerDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('enrolled');
  const [animateIn, setAnimateIn] = useState(false);
  
  // TODO: Replace with actual user data from authentication
  const mockUser = {
    id: '123456789',
    name: 'John Doe'
  };

  useEffect(() => {
    // Trigger animation after a short delay
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  const handleEnroll = async (programId: string) => {
    // TODO: Implement enrollment API call
    console.log('Enrolling in program:', programId);
  };

  const handleRedeem = async (programId: string, rewardId: string) => {
    // TODO: Implement redemption API call
    console.log('Redeeming reward:', rewardId, 'from program:', programId);
  };

  return (
    <CustomerLayout>
      <div className="space-y-8">
        <div className={`transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
              <Sparkles className="w-6 h-6 text-blue-500 mr-2" />
              {t('customerDashboard.title', 'Customer Dashboard')}
            </h1>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 rounded-full text-white text-sm font-medium flex items-center shadow-md">
              <TrendingUp className="w-4 h-4 mr-1.5" />
              120 Points
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-2xl shadow-xl p-8 mb-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 backdrop-blur-sm opacity-30"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative flex flex-col md:flex-row justify-between items-center">
              <div className="text-white mb-6 md:mb-0">
                <h2 className="text-2xl font-bold">Welcome back, {mockUser.name}!</h2>
                <p className="opacity-80 mt-2 text-blue-100">Scan your QR code to earn rewards</p>
                
                <div className="flex items-center mt-4 text-sm space-x-4">
                  <div className="flex items-center bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <BadgeCheck className="w-4 h-4 text-blue-200 mr-1.5" />
                    <span className="text-blue-100">3 Programs</span>
                  </div>
                  <div className="flex items-center bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <Gift className="w-4 h-4 text-blue-200 mr-1.5" />
                    <span className="text-blue-100">2 Rewards Ready</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-2xl transform transition-transform group-hover:scale-105 group-hover:-rotate-1 border border-white/20">
                <QRCard userId={mockUser.id} userName={mockUser.name} />
                <div className="mt-2 text-center text-xs text-white/80">Tap to enlarge</div>
              </div>
            </div>
          </div>
        </div>

        <div className={`bg-white rounded-xl shadow-xl border border-gray-100 transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: '200ms' }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b px-6 pt-5 pb-2">
              <div className="bg-gray-100/70 p-1 rounded-lg inline-flex">
                <TabsList>
                  <TabsTrigger 
                    value="enrolled" 
                    className="flex items-center justify-center py-2.5 px-5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md rounded-md transition-all"
                  >
                    <BadgeCheck className="w-4 h-4 mr-2" />
                    {t('enrolledPrograms')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="browse"
                    className="flex items-center justify-center py-2.5 px-5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md rounded-md transition-all"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {t('browsePrograms')}
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="p-6">
              <TabsContent value="enrolled">
                <EnrolledPrograms onRedeem={handleRedeem} />
              </TabsContent>

              <TabsContent value="browse">
                <ProgramBrowser onEnroll={handleEnroll} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: '400ms' }}>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all hover:-translate-y-1 group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-800 flex items-center">
                <Activity className="w-4 h-4 text-blue-500 mr-1.5" />
                Recent Activity
              </h3>
              <span className="text-xs bg-blue-50 px-2 py-1 rounded-full text-blue-700">Last 7 days</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center p-3 rounded-lg bg-gradient-to-r hover:from-blue-50 hover:to-blue-50 transition-colors border border-transparent hover:border-blue-100">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mr-3 shadow-md group-hover:scale-105 transition-transform">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Earned 10 points</p>
                  <p className="text-xs text-gray-500">Local Coffee Shop • Yesterday</p>
                </div>
              </div>
              <div className="flex items-center p-3 rounded-lg bg-gradient-to-r hover:from-blue-50 hover:to-blue-50 transition-colors border border-transparent hover:border-blue-100">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center mr-3 shadow-md group-hover:scale-105 transition-transform">
                  <BadgeCheck className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Redeemed Free Coffee</p>
                  <p className="text-xs text-gray-500">Local Coffee Shop • 3 days ago</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-blue-100 p-6 hover:shadow-xl transition-all hover:-translate-y-1 group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-800 flex items-center">
                <Gift className="w-4 h-4 text-blue-500 mr-1.5" />
                Next Rewards
              </h3>
              <span className="text-xs text-blue-600 cursor-pointer hover:underline">View all</span>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm group-hover:shadow transition-shadow">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-2 shadow-sm">
                      <Coffee className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-800">Free Coffee</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">5 points more</span>
                </div>
                <div className="w-full bg-white/80 rounded-full h-2.5 shadow-inner overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full" style={{ width: '50%' }}></div>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-500">5/10 points</span>
                  <span className="text-xs text-blue-700 font-medium">50% complete</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg border border-purple-100 p-6 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-800 flex items-center">
                <Sparkles className="w-4 h-4 text-purple-500 mr-1.5" />
                Trending Rewards
              </h3>
              <span className="text-xs bg-purple-50 px-2 py-1 rounded-full text-purple-700">Popular now</span>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm hover:shadow-md transition-shadow transform hover:-translate-y-0.5">
                <p className="text-sm font-medium text-purple-800 flex items-center">
                  <span className="w-6 h-6 flex items-center justify-center bg-purple-100 rounded-full text-purple-800 mr-2 text-xs font-bold">1</span>
                  20% Off at Fashion Store
                </p>
                <p className="text-xs text-purple-600 mt-2 ml-8">Limited time offer • 230 redeemed</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200 shadow-sm hover:shadow-md transition-shadow transform hover:-translate-y-0.5">
                <p className="text-sm font-medium text-amber-800 flex items-center">
                  <span className="w-6 h-6 flex items-center justify-center bg-amber-100 rounded-full text-amber-800 mr-2 text-xs font-bold">2</span>
                  Free Dessert at Local Restaurant
                </p>
                <p className="text-xs text-amber-600 mt-2 ml-8">With any meal purchase • 178 redeemed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerDashboard;