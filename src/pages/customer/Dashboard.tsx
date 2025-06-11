import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCard } from '../../components/QRCard';
import { ProgramBrowser } from '../../components/customer/ProgramBrowser';
import { EnrolledPrograms } from '../../components/customer/EnrolledPrograms';
import { TransactionHistory } from '../../components/customer/TransactionHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { BadgeCheck, Search, TrendingUp, Sparkles, Star, Gift, Activity, Coffee, Receipt, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { TransactionService } from '../../services/transactionService';
import sql from '../../utils/db';
import type { Transaction } from '../../types/loyalty';

// Define upcomingReward type
interface UpcomingReward {
  programId: number;
  programName: string;
  businessName: string;
  currentPoints: number;
  rewardId: number;
  pointsRequired: number;
  reward: string;
  pointsNeeded: number;
  progress: number;
}

const CustomerDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('enrolled');
  const [animateIn, setAnimateIn] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Transaction[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [upcomingRewards, setUpcomingRewards] = useState<UpcomingReward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  
  // Use authenticated user data - ensure we're using the full name from the database
  const userData = {
    id: user?.id?.toString() || '',
    name: user?.name || t('customerDashboard.defaultName', 'Customer')
  };

  // Debug user data
  console.log('User data from auth context:', user);
  console.log('Using name for display:', userData.name);

  useEffect(() => {
    // Trigger animation after a short delay
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // Fetch total points from all programs
  useEffect(() => {
    const fetchTotalPoints = async () => {
      if (!user?.id) return;
      
      setPointsLoading(true);
      try {
        const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
        const result = await sql`
          SELECT SUM(current_points) as total_points
          FROM customer_programs
          WHERE customer_id = ${userId}
        `;
        
        // Safely handle potential null/undefined result or non-numeric value
        const points = result[0]?.total_points;
        setTotalPoints(points ? Number(points) : 0);
      } catch (error) {
        console.error('Error fetching total points:', error);
      } finally {
        setPointsLoading(false);
      }
    };
    
    fetchTotalPoints();
  }, [user?.id]);

  // Fetch recent activities
  useEffect(() => {
    const fetchRecentActivities = async () => {
      if (!user?.id) return;
      
      setActivitiesLoading(true);
      try {
        const result = await TransactionService.getTransactionHistory(
          user.id.toString(),
          undefined // No specific program
        );
        
        if (result.transactions) {
          // Limit to the 3 most recent transactions
          setRecentActivity(result.transactions.slice(0, 3));
        }
      } catch (error) {
        console.error('Error fetching recent activities:', error);
      } finally {
        setActivitiesLoading(false);
      }
    };
    
    fetchRecentActivities();
  }, [user?.id]);

  // Fetch upcoming rewards
  useEffect(() => {
    const fetchUpcomingRewards = async () => {
      if (!user?.id) return;
      
      setRewardsLoading(true);
      try {
        const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
        
        // Get all enrolled programs with their current points
        const enrolledPrograms = await sql`
          SELECT 
            cp.program_id, 
            cp.current_points,
            lp.name AS program_name,
            b.name AS business_name
          FROM customer_programs cp
          JOIN loyalty_programs lp ON cp.program_id = lp.id
          JOIN businesses b ON lp.business_id = b.id
          WHERE cp.customer_id = ${userId}
        `;
        
        // For each program, find the next reward tier
        const nextRewards: UpcomingReward[] = [];
        for (const program of enrolledPrograms) {
          // Ensure we have valid values
          const programId = program.program_id;
          const currentPoints = Number(program.current_points || 0);
          
          if (!programId) continue;
          
          const rewardTiers = await sql`
            SELECT 
              id, 
              points_required,
              reward
            FROM loyalty_program_rewards
            WHERE program_id = ${programId}
            AND points_required > ${currentPoints}
            ORDER BY points_required ASC
            LIMIT 1
          `;
          
          if (rewardTiers.length > 0) {
            const tier = rewardTiers[0];
            const pointsRequired = Number(tier.points_required || 0);
            
            if (pointsRequired > 0) {
              nextRewards.push({
                programId,
                programName: program.program_name || '',
                businessName: program.business_name || '',
                currentPoints,
                rewardId: tier.id,
                pointsRequired,
                reward: tier.reward || '',
                pointsNeeded: Math.max(0, pointsRequired - currentPoints),
                progress: Math.round((currentPoints / pointsRequired) * 100)
              });
            }
          }
        }
        
        // Sort by progress (highest first)
        nextRewards.sort((a, b) => b.progress - a.progress);
        setUpcomingRewards(nextRewards.slice(0, 3)); // Take top 3
        
      } catch (error) {
        console.error('Error fetching upcoming rewards:', error);
      } finally {
        setRewardsLoading(false);
      }
    };
    
    fetchUpcomingRewards();
  }, [user?.id]);

  const handleEnroll = async (programId: string) => {
    // TODO: Implement enrollment API call
    console.log('Enrolling in program:', programId);
  };

  const handleRedeem = async (programId: string, rewardId: string) => {
    // TODO: Implement redemption API call
    console.log('Redeeming reward:', rewardId, 'from program:', programId);
  };

  // Format date for activity display
  const formatActivityDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return t('today');
    } else if (diffDays === 1) {
      return t('yesterday');
    } else if (diffDays < 7) {
      return t('daysAgo', { days: diffDays });
    } else {
      return date.toLocaleDateString();
    }
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
              {pointsLoading ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4 mr-1.5" />
              )}
              {pointsLoading ? t('loading') : `${totalPoints} ${t('points')}`}
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-2xl shadow-xl p-8 mb-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 backdrop-blur-sm opacity-30"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative flex flex-col md:flex-row justify-between items-center">
              <div className="text-white mb-6 md:mb-0">
                <h2 className="text-2xl font-bold">Welcome back, {userData.name}!</h2>
                <p className="opacity-80 mt-2 text-blue-100">Scan your QR code to earn rewards</p>
                
                <div className="flex items-center mt-4 text-sm space-x-4">
                  {!pointsLoading && (
                    <>
                      <div className="flex items-center bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                        <BadgeCheck className="w-4 h-4 text-blue-200 mr-1.5" />
                        <span className="text-blue-100">{upcomingRewards.length} Programs</span>
                      </div>
                      <div className="flex items-center bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                        <Gift className="w-4 h-4 text-blue-200 mr-1.5" />
                        <span className="text-blue-100">
                          {upcomingRewards.filter(r => r.progress >= 90).length} Rewards Ready
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-2xl transform transition-transform group-hover:scale-105 group-hover:-rotate-1 border border-white/20">
                <QRCard userId={userData.id} userName={userData.name} />
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
                  <TabsTrigger 
                    value="transactions"
                    className="flex items-center justify-center py-2.5 px-5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md rounded-md transition-all"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    {t('transactions')}
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

              <TabsContent value="transactions">
                <TransactionHistory customerId={userData.id} />
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
            
            {activitiesLoading ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No recent activity found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-center p-3 rounded-lg bg-gradient-to-r hover:from-blue-50 hover:to-blue-50 transition-colors border border-transparent hover:border-blue-100">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 shadow-md group-hover:scale-105 transition-transform ${
                      activity.type === 'EARN' ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-blue-400 to-indigo-600'
                    }`}>
                      {activity.type === 'EARN' ? (
                        <Star className="w-5 h-5 text-white" />
                      ) : (
                        <Gift className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">
                        {activity.type === 'EARN' ? (
                          `Earned ${activity.points} points`
                        ) : (
                          `Redeemed ${activity.points} points`
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.businessName || 'Business'} • {formatActivityDate(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-blue-100 p-6 hover:shadow-xl transition-all hover:-translate-y-1 group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-800 flex items-center">
                <Gift className="w-4 h-4 text-blue-500 mr-1.5" />
                Next Rewards
              </h3>
              <span className="text-xs text-blue-600 cursor-pointer hover:underline">View all</span>
            </div>
            
            {rewardsLoading ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : upcomingRewards.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No upcoming rewards found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingRewards.map((reward, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm group-hover:shadow transition-shadow">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-2 shadow-sm">
                          <Coffee className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-sm font-medium text-gray-800">{reward.reward}</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                        {reward.pointsNeeded} points more
                      </span>
                    </div>
                    <div className="w-full bg-white/80 rounded-full h-2.5 shadow-inner overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full" 
                        style={{ width: `${reward.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {reward.currentPoints}/{reward.pointsRequired} points
                      </span>
                      <span className="text-xs text-blue-700 font-medium">
                        {reward.progress}% complete
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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