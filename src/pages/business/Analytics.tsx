import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { BusinessAnalyticsDashboard } from '../../components/business/BusinessAnalyticsDashboard';
import { Calendar, Clock, Filter, ArrowUpDown } from 'lucide-react';

const AnalyticsPage = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'year'>('month');
  
  // In a real application, this would come from your auth context
  const mockBusinessId = '123';

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
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <BusinessAnalyticsDashboard businessId={mockBusinessId} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">{t('Popular Products')}</h2>
              <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <ArrowUpDown className="h-4 w-4 mr-1" />
                {t('Sort')}
              </button>
            </div>
            <div className="divide-y">
              {['Espresso Coffee', 'Croissant', 'Blueberry Muffin', 'Latte', 'Avocado Toast'].map((item, i) => (
                <div key={i} className="py-3 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                      {i + 1}
                    </div>
                    <span>{item}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-900 font-medium">${(Math.random() * 200 + 50).toFixed(2)}</div>
                    <div className="text-sm text-gray-500">{Math.floor(Math.random() * 30 + 10)} orders</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">{t('Most Loyal Customers')}</h2>
              <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <Filter className="h-4 w-4 mr-1" />
                {t('Filter')}
              </button>
            </div>
            <div className="divide-y">
              {['John Doe', 'Jane Smith', 'Robert Brown', 'Emma Wilson', 'Michael Scott'].map((name, i) => (
                <div key={i} className="py-3 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                      {name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-medium">{name}</div>
                      <div className="text-sm text-gray-500">{Math.floor(Math.random() * 20 + 5)} visits</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-900 font-medium">${(Math.random() * 500 + 100).toFixed(2)}</div>
                    <div className="text-sm text-gray-500">{t('total spent')}</div>
                  </div>
                </div>
              ))}
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
              <h3 className="font-medium text-green-700 mb-2">{t('Optimize Pricing')}</h3>
              <p className="text-sm text-green-600">
                {t('Your bestselling products have a 15% higher margin than average. Consider bundling these with lower performing items to increase overall sales.')}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <h3 className="font-medium text-purple-700 mb-2">{t('Reclaim Lost Customers')}</h3>
              <p className="text-sm text-purple-600">
                {t('You have 48 customers who haven\'t visited in 30+ days. Consider sending a limited-time offer to bring them back.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default AnalyticsPage; 