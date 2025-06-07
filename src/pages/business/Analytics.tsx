import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { BusinessAnalyticsDashboard } from '../../components/business/BusinessAnalyticsDashboard';
import { Calendar, Clock, Filter, ArrowUpDown, TrendingUp, Users, Award, Gift, PieChart, BarChart2 } from 'lucide-react';
import { TransactionService } from '../../services/transactionService';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';

const AnalyticsPage = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalRedemptions: 0,
    activeCustomers: 0,
    retentionRate: 0,
    redemptionRate: 0,
    popularRewards: [] as {reward: string, count: number}[],
    customerEngagement: [] as {date: string, value: number}[],
    pointsDistribution: [] as {category: string, value: number}[],
  });
  
  // In a real application, this would come from your auth context
  const mockBusinessId = '123';

  useEffect(() => {
    // Fetch analytics data
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // These would be actual API calls in a real implementation
        // For now we're using mock data
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data based on date range
        let multiplier = 1;
        switch(dateRange) {
          case 'day': multiplier = 1; break;
          case 'week': multiplier = 7; break;
          case 'month': multiplier = 30; break;
          case 'year': multiplier = 365; break;
        }
        
        setStats({
          totalPoints: 1250 * multiplier,
          totalRedemptions: 45 * (multiplier / 30),
          activeCustomers: 120 * (multiplier / 30),
          retentionRate: 78,
          redemptionRate: 32,
          popularRewards: [
            { reward: 'Free Coffee', count: 28 * (multiplier / 30) },
            { reward: '10% Discount', count: 15 * (multiplier / 30) },
            { reward: 'Free Dessert', count: 12 * (multiplier / 30) },
            { reward: 'Buy One Get One', count: 8 * (multiplier / 30) },
          ],
          customerEngagement: Array.from({ length: Math.min(12, multiplier) }, (_, i) => ({
            date: new Date(Date.now() - (i * 86400000)).toISOString().split('T')[0],
            value: Math.floor(Math.random() * 50) + 50
          })).reverse(),
          pointsDistribution: [
            { category: 'Earned', value: 75 },
            { category: 'Redeemed', value: 25 },
          ]
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [dateRange]);

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            {t('Business Analytics')}
          </h1>
          
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-lg shadow-sm p-1 flex">
              <button
                onClick={() => setDateRange('day')}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm ${
                  dateRange === 'day' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Clock className="w-4 h-4 mr-1" />
                {t('Day')}
              </button>
              <button
                onClick={() => setDateRange('week')}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm ${
                  dateRange === 'week' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-4 h-4 mr-1" />
                {t('Week')}
              </button>
              <button
                onClick={() => setDateRange('month')}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm ${
                  dateRange === 'month' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-4 h-4 mr-1" />
                {t('Month')}
              </button>
              <button
                onClick={() => setDateRange('year')}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm ${
                  dateRange === 'year' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-4 h-4 mr-1" />
                {t('Year')}
              </button>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-500">{t('Total Points')}</h3>
                  <span className="p-2 bg-blue-50 rounded-full">
                    <Award className="h-5 w-5 text-blue-500" />
                  </span>
                </div>
                <p className="text-3xl font-bold mt-4 mb-1">{stats.totalPoints.toLocaleString()}</p>
                <div className="flex items-center text-green-600 text-sm font-medium">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>+14% from previous {dateRange}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-500">{t('Redemptions')}</h3>
                  <span className="p-2 bg-purple-50 rounded-full">
                    <Gift className="h-5 w-5 text-purple-500" />
                  </span>
                </div>
                <p className="text-3xl font-bold mt-4 mb-1">{stats.totalRedemptions.toLocaleString()}</p>
                <div className="flex items-center text-green-600 text-sm font-medium">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>+5% from previous {dateRange}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-500">{t('Active Customers')}</h3>
                  <span className="p-2 bg-green-50 rounded-full">
                    <Users className="h-5 w-5 text-green-500" />
                  </span>
                </div>
                <p className="text-3xl font-bold mt-4 mb-1">{stats.activeCustomers.toLocaleString()}</p>
                <div className="flex items-center text-green-600 text-sm font-medium">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>+7% from previous {dateRange}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-500">{t('Redemption Rate')}</h3>
                  <span className="p-2 bg-amber-50 rounded-full">
                    <PieChart className="h-5 w-5 text-amber-500" />
                  </span>
                </div>
                <p className="text-3xl font-bold mt-4 mb-1">{stats.redemptionRate}%</p>
                <div className="flex items-center text-amber-600 text-sm font-medium">
                  <span>Industry avg: 25%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">{t('Customer Engagement')}</h2>
                  <div className="flex items-center text-sm text-gray-500">
                    <BarChart2 className="h-4 w-4 mr-1" />
                    <span>Last {stats.customerEngagement.length} days</span>
                  </div>
                </div>
                <div className="h-60">
                  {/* In a real implementation, you would use a chart library like recharts or chart.js */}
                  <div className="flex h-48 items-end space-x-2">
                    {stats.customerEngagement.map((item, i) => (
                      <div key={i} className="flex flex-col items-center flex-1">
                        <div 
                          className="w-full bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-all cursor-pointer"
                          style={{ height: `${item.value}%` }}
                          title={`${item.value}% engagement on ${item.date}`}
                        ></div>
                        <span className="text-xs text-gray-500 mt-1 rotate-45 origin-left">{item.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">{t('Popular Rewards')}</h2>
                  <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                    <ArrowUpDown className="h-4 w-4 mr-1" />
                    {t('Sort')}
                  </button>
                </div>
                <div className="divide-y">
                  {stats.popularRewards.map((item, i) => (
                    <div key={i} className="py-3 flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                          {i + 1}
                        </div>
                        <span>{item.reward}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-900 font-medium">{item.count} redeemed</div>
                        <div className="text-sm text-gray-500">{Math.round(item.count / stats.totalRedemptions * 100)}% of total</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('Customer Retention Insights')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-green-700">{t('Retention Rate')}</h3>
                    <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">{stats.retentionRate}%</span>
                  </div>
                  <p className="text-sm text-green-600">
                    {t('Percentage of customers who return within 30 days of their first visit.')}
                  </p>
                  <div className="mt-3 bg-white/80 rounded-full h-2.5 shadow-inner overflow-hidden">
                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${stats.retentionRate}%` }}></div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-blue-700">{t('Engagement Score')}</h3>
                    <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">8.3/10</span>
                  </div>
                  <p className="text-sm text-blue-600">
                    {t('Based on visit frequency, points earned, and redemption activity.')}
                  </p>
                  <div className="mt-3 bg-white/80 rounded-full h-2.5 shadow-inner overflow-hidden">
                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '83%' }}></div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-purple-700">{t('Points Balance')}</h3>
                    <span className="bg-purple-100 text-purple-800 text-sm px-2 py-1 rounded-full">Distribution</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {stats.pointsDistribution.map((item, i) => (
                      <div key={i} className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-1 ${i === 0 ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                        <span className="text-xs text-gray-600">{item.category}: {item.value}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-12 rounded-lg overflow-hidden bg-gray-100 flex">
                    <div className="h-full bg-blue-500" style={{ width: `${stats.pointsDistribution[0].value}%` }}></div>
                    <div className="h-full bg-purple-500" style={{ width: `${stats.pointsDistribution[1].value}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('Tips to Grow Your Business')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-medium text-blue-700 mb-2">{t('Increase Customer Retention')}</h3>
                  <p className="text-sm text-blue-600">
                    {t('Consider adding a tier to your loyalty program that rewards frequent visitors. Offer exclusive benefits for customers who visit more than 5 times per month.')}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <h3 className="font-medium text-green-700 mb-2">{t('Optimize Reward Structure')}</h3>
                  <p className="text-sm text-green-600">
                    {t('Your "Free Coffee" reward is the most popular. Consider creating additional variations or tiers of this reward to increase engagement.')}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <h3 className="font-medium text-purple-700 mb-2">{t('Reclaim Lost Customers')}</h3>
                  <p className="text-sm text-purple-600">
                    {t('You have 48 customers who haven\'t visited in 30+ days. Consider sending a limited-time bonus offer to bring them back.')}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </BusinessLayout>
  );
};

export default AnalyticsPage; 