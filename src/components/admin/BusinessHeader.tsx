import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

interface BusinessHeaderProps {
  businessCount: number;
  activeCount: number;
  inactiveCount: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: 'all' | 'active' | 'inactive' | 'suspended';
  onStatusFilterChange: (status: 'all' | 'active' | 'inactive' | 'suspended') => void;
  onRefresh: () => void;
}

const BusinessHeader: React.FC<BusinessHeaderProps> = ({
  businessCount,
  activeCount,
  inactiveCount,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh
}) => {
  const { t } = useTranslation();
  
  return (
    <>
      {/* Page title */}
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            {t('Business Management')}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {t('Comprehensive view of all registered businesses, programs, and customer data')}
          </p>
        </div>
        
        {/* Action buttons */}
        <div className="grid grid-flow-col sm:auto-cols-max sm:justify-end gap-2">
          <button
            className="btn bg-blue-500 hover:bg-blue-600 text-white"
            onClick={onRefresh}
          >
            <RefreshData />
            {t('Refresh Data')}
          </button>
        </div>
      </div>
      
      {/* Filters section */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('Search')}
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="form-input block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder={t('Search businesses...')}
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            </div>
            
            {/* Status filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('Status')}
              </label>
              <select
                className="form-select block w-full sm:text-sm border-gray-300 rounded-md"
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value as any)}
              >
                <option value="all">{t('All Statuses')}</option>
                <option value="active">{t('Active')}</option>
                <option value="inactive">{t('Inactive')}</option>
                <option value="suspended">{t('Suspended')}</option>
              </select>
            </div>
            
            {/* Summary statistics */}
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-xs text-gray-500 font-medium">{t('Summary')}</p>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <div>
                  <p className="text-xs text-gray-500">{t('Total')}</p>
                  <p className="text-lg font-medium text-gray-900">{businessCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('Active')}</p>
                  <p className="text-lg font-medium text-green-600">{activeCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('Inactive/Suspended')}</p>
                  <p className="text-lg font-medium text-red-600">{inactiveCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Refresh Data Button component
const RefreshData = () => (
  <svg className="w-4 h-4 fill-current opacity-50 shrink-0 mr-2" viewBox="0 0 16 16">
    <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5z" />
    <path d="M15.707 14.293L13.314 11.9a8.019 8.019 0 01-1.414 1.414l2.393 2.393a.997.997 0 001.414 0 .999.999 0 000-1.414z" />
  </svg>
);

export default BusinessHeader;
