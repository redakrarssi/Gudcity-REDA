import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart as BarChartIcon, 
  TrendingUp, 
  Users, 
  Building,
  CreditCard,
  Award
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CurrencyService } from '../../services/currencyService';
import type { CurrencyCode } from '../../types/currency';

interface AnalyticsData {
  totalUsers: number;
  totalBusinesses: number;
  totalPrograms: number;
  totalTransactions: number;
  revenue: number;
  activePrograms: number;
  popularBusinesses: Array<{
    name: string;
    customers: number;
    transactions: number;
  }>;
  recentTransactions: Array<{
    id: string;
    businessName: string;
    type: 'EARN' | 'REDEEM';
    points: number;
    amount?: number;
    createdAt: string;
  }>;
  growthMetrics: {
    userGrowth: number;
    revenueGrowth: number;
    programGrowth: number;
  };
}

export const Analytics = () => {
  const { t } = useTranslation();
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [data, setData] = useState<AnalyticsData>({
    totalUsers: 0,
    totalBusinesses: 0,
    totalPrograms: 0,
    totalTransactions: 0,
    revenue: 0,
    activePrograms: 0,
    popularBusinesses: [],
    recentTransactions: [],
    growthMetrics: {
      userGrowth: 0,
      revenueGrowth: 0,
      programGrowth: 0
    }
  });

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  const loadAnalytics = async () => {
    try {
      // Load total users
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact' });

      // Load total businesses
      const { count: businessCount } = await supabase
        .from('business_profiles')
        .select('*', { count: 'exact' });

      // Load total programs
      const { count: programCount } = await supabase
        .from('loyalty_programs')
        .select('*', { count: 'exact' });

      // Load transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          businesses (name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Calculate revenue and format transactions
      const revenue = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
      const recentTransactions = transactions?.map(tx => ({
        id: tx.id,
        businessName: tx.businesses.name,
        type: tx.type,
        points: tx.points,
        amount: tx.amount,
        createdAt: tx.created_at
      })) || [];

      // Load popular businesses
      const { data: popularBusinesses } = await supabase
        .from('business_profiles')
        .select(`
          name,
          customer_count:customer_programs(count),
          transaction_count:transactions(count)
        `)
        .order('customer_count', { ascending: false })
        .limit(5);

      setData({
        totalUsers: userCount || 0,
        totalBusinesses: businessCount || 0,
        totalPrograms: programCount || 0,
        totalTransactions: transactions?.length || 0,
        revenue,
        activePrograms: programCount || 0,
        popularBusinesses: popularBusinesses?.map(b => ({
          name: b.name,
          customers: b.customer_count,
          transactions: b.transaction_count
        })) || [],
        recentTransactions,
        growthMetrics: {
          userGrowth: 15, // Mock data - implement actual calculation
          revenueGrowth: 23,
          programGrowth: 8
        }
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('platformAnalytics')}
        </h2>
        <div className="flex items-center space-x-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as typeof timeframe)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="day">{t('last24Hours')}</option>
            <option value="week">{t('lastWeek')}</option>
            <option value="month">{t('lastMonth')}</option>
            <option value="year">{t('lastYear')}</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('totalUsers')}</p>
              <p className="text-2xl font-semibold text-gray-900">{data.totalUsers}</p>
              <p className="text-sm text-green-600">+{data.growthMetrics.userGrowth}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('activeBusinesses')}</p>
              <p className="text-2xl font-semibold text-gray-900">{data.totalBusinesses}</p>
              <p className="text-sm text-green-600">+{data.growthMetrics.programGrowth}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Award className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('activePrograms')}</p>
              <p className="text-2xl font-semibold text-gray-900">{data.activePrograms}</p>
              <p className="text-sm text-green-600">+{data.growthMetrics.programGrowth}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CreditCard className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('revenue')}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {CurrencyService.formatAmount(data.revenue, currency)}
              </p>
              <p className="text-sm text-green-600">+{data.growthMetrics.revenueGrowth}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Businesses */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {t('popularBusinesses')}
          </h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            {data.popularBusinesses.map((business, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{business.name}</p>
                  <p className="text-sm text-gray-500">
                    {t('customers')}: {business.customers} | {t('transactions')}: {business.transactions}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  #{index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {t('recentTransactions')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('business')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('points')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('amount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('date')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.recentTransactions.map(transaction => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.businessName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.type === 'EARN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.points}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.amount ? CurrencyService.formatAmount(transaction.amount, currency) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}; 