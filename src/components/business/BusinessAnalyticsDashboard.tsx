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
import type { BusinessAnalytics, ProgramPerformance, CustomerSegment } from '../../types/analytics';
import { CurrencySelector } from '../CurrencySelector';
import type { CurrencyCode } from '../../types/currency';
import { Users, TrendingUp, DollarSign, ArrowLeft, ArrowRight, ChevronUp, ChevronDown, Repeat, Calendar } from 'lucide-react';

interface BusinessAnalyticsDashboardProps {
  businessId: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const BusinessAnalyticsDashboard: React.FC<BusinessAnalyticsDashboardProps> = ({
  businessId
}) => {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<BusinessAnalytics | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [businessId, currency, period]);

  const loadAnalytics = async () => {
    const data = await AnalyticsService.getBusinessAnalytics(businessId, currency, period);
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
        <h2 className="text-2xl font-semibold text-gray-800">{t('Business Analytics')}</h2>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('Active Customers')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.retention.activeCustomers.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className={`flex items-center text-sm ${getPercentChangeColor(-1 * analytics.retention.churnRate)}`}>
              {getPercentChangeIcon(-1 * analytics.retention.churnRate)}
              {formatPercent(analytics.retention.churnRate)}
            </span>
            <span className="text-xs text-gray-500 ml-2">{t('churn rate')}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('Repeat Visits')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatPercent(analytics.retention.repeatVisitRate)}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-full">
              <Repeat className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className="text-sm text-gray-600">
              {t('Avg')}: {analytics.retention.averageVisitFrequency.toFixed(1)} {t('visits')}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('Customer Value')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(analytics.retention.customerLifetimeValue)}
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-full">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className={`flex items-center text-sm ${getPercentChangeColor(0.08)}`}>
              <ChevronUp className="w-4 h-4" />
              8.0%
            </span>
            <span className="text-xs text-gray-500 ml-2">{t('vs last period')}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('Revenue')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(analytics.revenue.totalRevenue)}
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="flex items-center mt-4">
            <span className={`flex items-center text-sm ${getPercentChangeColor(analytics.revenue.revenueGrowth)}`}>
              {getPercentChangeIcon(analytics.revenue.revenueGrowth)}
              {formatPercent(Math.abs(analytics.revenue.revenueGrowth))}
            </span>
            <span className="text-xs text-gray-500 ml-2">{t('vs last period')}</span>
          </div>
        </div>
      </div>

      {/* Program Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">{t('Program Performance')}</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.programPerformance} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="programName" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: number, name: string) => {
                  if (name === 'redemptionRate') return [formatPercent(value), t('Redemption Rate')];
                  if (name === 'activeCustomers') return [value.toLocaleString(), t('Active Customers')];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="activeCustomers"
                name={t('Active Customers')}
                fill={COLORS[0]}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="redemptionRate"
                name={t('Redemption Rate')}
                fill={COLORS[1]}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer Segments & Revenue Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">{t('Customer Segments')}</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={analytics.customerSegments}
                  dataKey="size"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.name}: ${entry.size}`}
                >
                  {analytics.customerSegments.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number, name: string, entry: any) => {
                    const payload = entry.payload as CustomerSegment;
                    if (payload) {
                      return [
                        `${value.toLocaleString()} customers\nAvg Spend: ${formatCurrency(
                          payload.averageSpend
                        )}\nLoyalty Score: ${payload.loyaltyScore.toFixed(1)}`,
                        payload.name
                      ];
                    }
                    return [value.toString(), name];
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">{t('Revenue Analysis')}</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={analytics.revenue.topProducts} 
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'revenue') return [formatCurrency(value), t('Revenue')];
                    if (name === 'quantity') return [value.toLocaleString(), t('Quantity')];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="revenue" 
                  name={t('Revenue')} 
                  fill={COLORS[2]} 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="quantity" 
                  name={t('Quantity')} 
                  fill={COLORS[3]} 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Period Comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">{t('Period Comparison')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-500">{t('Customers')}</h4>
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.periodComparison.customers.toLocaleString()}</p>
            <div className="flex items-center mt-2">
              <span className={`flex items-center text-xs ${getPercentChangeColor(0.12)}`}>
                <ChevronUp className="w-3 h-3" />
                12.0%
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-500">{t('Revenue')}</h4>
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.periodComparison.revenue)}</p>
            <div className="flex items-center mt-2">
              <span className={`flex items-center text-xs ${getPercentChangeColor(0.18)}`}>
                <ChevronUp className="w-3 h-3" />
                18.0%
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-500">{t('Transactions')}</h4>
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.periodComparison.transactions.toLocaleString()}</p>
            <div className="flex items-center mt-2">
              <span className={`flex items-center text-xs ${getPercentChangeColor(0.15)}`}>
                <ChevronUp className="w-3 h-3" />
                15.0%
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-500">{t('Redemptions')}</h4>
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.periodComparison.redemptions.toLocaleString()}</p>
            <div className="flex items-center mt-2">
              <span className={`flex items-center text-xs ${getPercentChangeColor(0.07)}`}>
                <ChevronUp className="w-3 h-3" />
                7.0%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 