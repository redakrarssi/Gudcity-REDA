import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { AnalyticsService } from '../../services/analyticsService';
import type { AdminAnalytics, RegionalPerformance } from '../../types/analytics';
import { CurrencySelector } from '../CurrencySelector';
import type { CurrencyCode } from '../../types/currency';
import { Users, TrendingUp, DollarSign, Globe, ChevronUp, ChevronDown } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const AdminAnalyticsDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [currency, period]);

  const loadAnalytics = async () => {
    const data = await AnalyticsService.getAdminAnalytics(currency, period);
    setAnalytics(data);
  };

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-sm">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">{t('Loading analytics data...')}</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getPercentChangeColor = (value: number) => {
    return value >= 0 ? 'text-green-500' : 'text-red-500';
  };

  const getPercentChangeIcon = (value: number) => {
    return value >= 0 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">{t('Platform Analytics')}</h2>
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">{t('Last 24 Hours')}</option>
            <option value="week">{t('Last Week')}</option>
            <option value="month">{t('Last Month')}</option>
            <option value="year">{t('Last Year')}</option>
          </select>
          <CurrencySelector
            selectedCurrency={currency}
            onCurrencyChange={setCurrency}
          />
        </div>
      </div>

      {/* Platform Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('Total Users')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.platform.totalUsers.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className={`flex items-center text-sm ${getPercentChangeColor(analytics.platform.userGrowth)}`}>
              {getPercentChangeIcon(analytics.platform.userGrowth)}
              {formatPercent(Math.abs(analytics.platform.userGrowth))}
            </span>
            <span className="text-xs text-gray-500 ml-2">{t('vs last period')}</span>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            {t('Active')}: {analytics.platform.activeUsers.toLocaleString()} ({formatPercent(analytics.platform.activeUsers / analytics.platform.totalUsers)})
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('Growth Rate')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatPercent(analytics.platform.businessGrowth)}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className={`flex items-center text-sm ${getPercentChangeColor(analytics.platform.businessGrowth - 0.05)}`}>
              {getPercentChangeIcon(analytics.platform.businessGrowth - 0.05)}
              {formatPercent(Math.abs(analytics.platform.businessGrowth - 0.05))}
            </span>
            <span className="text-xs text-gray-500 ml-2">{t('vs last period')}</span>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            {t('Users')}: {formatPercent(analytics.platform.userGrowth)}
            {t('Business')}: {formatPercent(analytics.platform.businessGrowth)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('Total Revenue')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(analytics.platform.totalRevenue)}</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className={`flex items-center text-sm ${getPercentChangeColor(analytics.platform.revenueGrowth)}`}>
              {getPercentChangeIcon(analytics.platform.revenueGrowth)}
              {formatPercent(Math.abs(analytics.platform.revenueGrowth))}
            </span>
            <span className="text-xs text-gray-500 ml-2">{t('vs last period')}</span>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            {t('Avg User Value')}: {formatCurrency(analytics.platform.averageUserValue)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('Transactions')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.platform.transactionVolume.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-full">
              <Globe className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className={`flex items-center text-sm text-green-500`}>
              <ChevronUp className="w-4 h-4" />
              7.3%
            </span>
            <span className="text-xs text-gray-500 ml-2">{t('vs last period')}</span>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            {t('Avg Transaction')}: {formatCurrency(analytics.platform.totalRevenue / analytics.platform.transactionVolume)}
          </div>
        </div>
      </div>

      {/* Regional Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">{t('Regional Performance')}</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.regional} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="region" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: number, name: string) => {
                  if (name === 'revenue') return [formatCurrency(value), t('Revenue')];
                  if (name === 'businesses') return [value.toLocaleString(), t('Businesses')];
                  if (name === 'customers') return [value.toLocaleString(), t('Customers')];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="businesses"
                name={t('Businesses')}
                fill={COLORS[0]}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="customers"
                name={t('Customers')}
                fill={COLORS[1]}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="revenue"
                name={t('Revenue')}
                fill={COLORS[2]}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">{t('User Engagement')}</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={analytics.engagement.retentionByDay.map((value, index) => ({
                  day: index + 1,
                  retention: value
                }))}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [`${value}%`, t('Retention')]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="retention"
                  name={t('Retention')}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorRetention)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">{t('Period Comparison')}</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500">{t('Users')}</h4>
              <p className="text-2xl font-bold text-gray-900">{analytics.periodComparison.users.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <span className={`flex items-center text-xs ${getPercentChangeColor(0.15)}`}>
                  <ChevronUp className="w-3 h-3" />
                  15.0%
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500">{t('Businesses')}</h4>
              <p className="text-2xl font-bold text-gray-900">{analytics.periodComparison.businesses.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <span className={`flex items-center text-xs ${getPercentChangeColor(0.08)}`}>
                  <ChevronUp className="w-3 h-3" />
                  8.0%
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500">{t('Revenue')}</h4>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.periodComparison.revenue)}</p>
              <div className="flex items-center mt-2">
                <span className={`flex items-center text-xs ${getPercentChangeColor(0.22)}`}>
                  <ChevronUp className="w-3 h-3" />
                  22.0%
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500">{t('Programs')}</h4>
              <p className="text-2xl font-bold text-gray-900">{analytics.periodComparison.programsCreated.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <span className={`flex items-center text-xs ${getPercentChangeColor(0.05)}`}>
                  <ChevronUp className="w-3 h-3" />
                  5.0%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 