import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  ChevronDown,
  ChevronUp,
  Loader,
  XCircle,
  CheckCircle,
  AlertCircle,
  Clock,
  Briefcase,
  Users,
  DollarSign,
  Building
} from 'lucide-react';
import api from '../../api/api';
import { formatDate, formatDateTime, formatRegistrationDuration } from '../../utils/dateUtils';
import BusinessHeader from '../../components/admin/BusinessHeader';
import BusinessDetails from '../../components/admin/BusinessDetails';

// Business type definitions
interface Business {
  id: number | string;
  userId: number | string;
  name: string;
  owner: string;
  email: string;
  type: string;
  status: 'active' | 'inactive' | 'suspended';
  address: string;
  phone: string;
  logo?: string;
  currency: string;
  registeredAt: string;
  lastLogin?: string;
  programCount: number;
  customerCount: number;
  promotionCount: number;
  transactionCount: number;
  revenue: number;
  programs: any[];
  promotions: any[];
  recentLogins: any[];
  registrationDuration: {
    timestamp: string;
  };
}

interface BusinessTimelineEvent {
  id: string | number;
  eventType: string;
  title: string;
  description: string;
  eventDate: string;
  transactionCount?: number;
  dailyRevenue?: number;
}

interface BusinessTimeline {
  businessId: string | number;
  businessName: string;
  registeredAt: string;
  events: BusinessTimelineEvent[];
}

const AdminBusinesses = () => {
  const { t } = useTranslation();
  
  // State variables
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessTimeline, setBusinessTimeline] = useState<BusinessTimeline | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [expandedBusinessIds, setExpandedBusinessIds] = useState<Set<string | number>>(new Set());
  const [sortField, setSortField] = useState<keyof Business>('registeredAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Load businesses on component mount
  useEffect(() => {
    fetchBusinesses();
  }, []);
  
  // Function to fetch businesses from API
  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/admin/businesses');
      if (response.status === 200 && response.data?.businesses) {
        setBusinesses(response.data.businesses);
      } else {
        setError('Failed to load businesses. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching businesses:', err);
      setError('An error occurred while fetching businesses.');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to fetch business timeline
  const fetchBusinessTimeline = async (businessId: string | number) => {
    try {
      setTimelineLoading(true);
      
      const response = await api.get(`/api/admin/businesses/${businessId}/timeline`);
      if (response.status === 200) {
        setBusinessTimeline(response.data);
      } else {
        console.error('Failed to load business timeline');
      }
    } catch (err) {
      console.error('Error fetching business timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  };
  
  // Function to toggle expanded state of a business
  const toggleExpanded = (businessId: string | number) => {
    setExpandedBusinessIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(businessId)) {
        newSet.delete(businessId);
      } else {
        newSet.add(businessId);
        // Load timeline data when expanding
        fetchBusinessTimeline(businessId);
      }
      return newSet;
    });
  };
  
  // Function to handle sorting
  const handleSort = (field: keyof Business) => {
    if (sortField === field) {
      // Toggle direction if clicking on the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Function to get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };
  
  // Function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'suspended':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };
  
  // Apply filters and sorting to businesses
  const filteredBusinesses = businesses
    .filter(business => {
      // Apply status filter
      if (statusFilter !== 'all' && business.status !== statusFilter) {
        return false;
      }
      
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          business.name.toLowerCase().includes(searchLower) ||
          business.owner.toLowerCase().includes(searchLower) ||
          business.email.toLowerCase().includes(searchLower) ||
          (business.address && business.address.toLowerCase().includes(searchLower)) ||
          (business.phone && business.phone.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      // Perform sorting based on selected field and direction
      const fieldA = a[sortField];
      const fieldB = b[sortField];
      
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        return sortDirection === 'asc'
          ? fieldA.localeCompare(fieldB)
          : fieldB.localeCompare(fieldA);
      }
      
      if (typeof fieldA === 'number' && typeof fieldB === 'number') {
        return sortDirection === 'asc' ? fieldA - fieldB : fieldB - fieldA;
      }
      
      // Handle date strings
      if (fieldA && fieldB && (sortField === 'registeredAt' || sortField === 'lastLogin')) {
        const dateA = new Date(fieldA as string).getTime();
        const dateB = new Date(fieldB as string).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      return 0;
    });
  
  // Table header with sorting functionality
  const renderSortableHeader = (field: keyof Business, label: string) => (
    <th 
      className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        <span>{t(label)}</span>
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="ml-1 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-1 h-4 w-4" />
          )
        ) : (
          <ChevronDown className="ml-1 h-4 w-4 opacity-30" />
        )}
      </div>
    </th>
  );
  
  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        <BusinessHeader 
          businessCount={businesses.length}
          activeCount={businesses.filter(b => b.status === 'active').length}
          inactiveCount={businesses.filter(b => b.status !== 'active').length}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onRefresh={fetchBusinesses}
        />
        
        {/* Error message */}
        {error && (
          <div className="mb-6">
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          /* Businesses table */
          <div className="bg-white shadow overflow-hidden rounded-lg">
            {filteredBusinesses.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {searchTerm || statusFilter !== 'all'
                  ? t('No businesses match your filters')
                  : t('No businesses found')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                      {renderSortableHeader('name', 'Business')}
                      {renderSortableHeader('registeredAt', 'Registration')}
                      {renderSortableHeader('status', 'Status')}
                      {renderSortableHeader('programCount', 'Programs')}
                      {renderSortableHeader('customerCount', 'Customers')}
                      {renderSortableHeader('revenue', 'Revenue')}
                      {renderSortableHeader('lastLogin', 'Last Activity')}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBusinesses.map((business) => (
                      <React.Fragment key={business.id}>
                        {/* Business row */}
                        <tr 
                          className={`hover:bg-gray-50 ${expandedBusinessIds.has(business.id) ? 'bg-blue-50' : ''}`}
                          onClick={() => toggleExpanded(business.id)}
                        >
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {expandedBusinessIds.has(business.id) ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {business.logo ? (
                                  <img 
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={business.logo}
                                    alt={business.name}
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Building className="h-5 w-5 text-blue-500" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {business.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {business.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(business.registeredAt)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatRegistrationDuration(business.registeredAt)}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(business.status)}`}>
                              <span className="flex items-center">
                                {getStatusIcon(business.status)}
                                <span className="ml-1">{t(business.status.charAt(0).toUpperCase() + business.status.slice(1))}</span>
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <Briefcase className="h-4 w-4 text-blue-500 mr-1" />
                              <span>{business.programCount}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 text-green-500 mr-1" />
                              <span>{business.customerCount}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                              <span>{business.currency} {business.revenue.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {business.lastLogin ? (
                              <div>
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 text-blue-500 mr-1" />
                                  <span>{formatDate(business.lastLogin)}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">{t('Never')}</span>
                            )}
                          </td>
                        </tr>
                        
                        {/* Expanded business details */}
                        {expandedBusinessIds.has(business.id) && (
                          <tr>
                            <td colSpan={8} className="p-0">
                              <BusinessDetails 
                                business={business}
                                timeline={businessTimeline}
                                timelineLoading={timelineLoading}
                                businessId={business.id}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBusinesses;
