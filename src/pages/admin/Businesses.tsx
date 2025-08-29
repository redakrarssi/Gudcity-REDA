import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { BusinessAnalytics } from '../../components/admin/BusinessAnalytics';
import {
  Building,
  Search,
  Filter,
  Plus,
  Check,
  X,
  Eye,
  Edit,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  BarChart2,
  Download,
  ExternalLink,
  User,
  Briefcase,
  CreditCard,
  Calendar,
  FileText,
  MapPin,
  Mail,
  Phone
} from 'lucide-react';
import { 
  Business as DbBusiness, 
  BusinessApplication as DbBusinessApplication, 
  getAllBusinesses, 
  getBusinessById,
  createBusiness,
  updateBusiness,
  ensureBusinessTablesExist,
  getAllBusinessApplications,
  updateBusinessApplicationStatus
} from '../../services/businessService';
import { logSystemActivity } from '../../services/dashboardService';
import api from '../../api/api';

const AdminBusinesses = () => {
  const { t } = useTranslation();
  
  // State variables for business management
  const [applications, setApplications] = useState<DbBusinessApplication[]>([]);
  const [businesses, setBusinesses] = useState<DbBusiness[]>([]);
  // Removed tab system - now shows comprehensive business view only
  const [selectedApplication, setSelectedApplication] = useState<DbBusinessApplication | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<DbBusiness | null>(null);
  const [isBusinessDetailModalOpen, setIsBusinessDetailModalOpen] = useState(false);
  const [isBusinessAnalyticsModalOpen, setIsBusinessAnalyticsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredBusinesses, setFilteredBusinesses] = useState<DbBusiness[]>([]);
  const exportBusinessesCsv = () => {
    try {
      const rows = filteredBusinesses;
      const headers = ['ID','Name','Email','Type','Status','Customers','Revenue','Last Activity'];
      const csvLines = [headers.join(',')];
      rows.forEach((b: any) => {
        const values = [
          b.id ?? '',
          (b.name ?? '').toString().replace(/"/g,'""'),
          (b.email ?? '').toString().replace(/"/g,'""'),
          (b.type ?? '').toString().replace(/"/g,'""'),
          (b.status ?? '').toString().replace(/"/g,'""'),
          b.customerCount ?? 0,
          b.revenue ?? 0,
          b.lastActivity ? new Date(b.lastActivity).toISOString() : ''
        ].map(v => typeof v === 'string' ? `"${v}"` : v);
        csvLines.push(values.join(','));
      });
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `businesses-${new Date().toISOString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export failed', e);
    }
  };
  
  // Load businesses from database (fallback to service), but prefer admin overview API for richer data
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Ensure required tables exist
        await ensureBusinessTablesExist();
        
        // Prefer backend admin overview for consistent aggregation & RBAC
        const resp = await api.get('/api/businesses/admin/overview');
        if (resp.status === 200 && resp.data?.businesses) {
          setBusinesses(resp.data.businesses as unknown as DbBusiness[]);
        } else {
          // Fallback to local service if API not available
          const fetchedBusinesses = await getAllBusinesses();
          setBusinesses(fetchedBusinesses);
        }
        
        // Fetch applications
        const fetchedApplications = await getAllBusinessApplications();
        setApplications(fetchedApplications);
      } catch (err) {
        console.error('Error fetching businesses:', err);
        setError('Failed to load business data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBusinesses();
  }, []);
  
  // Update when filter or search changes
  useEffect(() => {
    let filtered = businesses;
    
    // Filter by status if necessary
    if (statusFilter !== 'all') {
      filtered = filtered.filter(business => business.status === statusFilter);
    }
    
    // Filter by search term if necessary
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(business => 
        (business.name || '').toLowerCase().includes(term) || 
        ((business as any).owner ? (business as any).owner.toLowerCase().includes(term) : false) ||
        (business.email || '').toLowerCase().includes(term) ||
        (business.type && business.type.toLowerCase().includes(term))
      );
    }
    
    setFilteredBusinesses(filtered);
  }, [businesses, statusFilter, searchTerm]);
  
  // Filter applications by search term
  const filteredApplications = applications.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Get unique business types for filter
  const businessTypes = ['all', ...new Set(businesses
    .map(b => b.type)
    .filter(Boolean) as string[]
  )];
  
  // Function to handle business approval
  const handleApproveApplication = async (id: number, notes?: string) => {
    try {
      setLoading(true);
      
      // Update application status in the database
      await updateBusinessApplicationStatus(id, 'approved', notes);
      
      // Log the activity
      await logSystemActivity(
        'business_approval',
        `Business application ${id} was approved`,
        1, // Assuming admin ID is 1
        'admin'
      );
      
      // Refetch data
      await fetchBusinesses();
      
      // Reset selected application
      setSelectedApplication(null);
      
      // Close modal
      setIsApplicationModalOpen(false);
    } catch (err) {
      console.error('Error approving business application:', err);
      setError('Failed to approve business application');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle business rejection  
  const handleRejectApplication = async (id: number, reason: string) => {
    try {
      setLoading(true);
      
      // Update application status in the database
      await updateBusinessApplicationStatus(id, 'rejected', reason);
      
      // Log the activity
      await logSystemActivity(
        'business_rejection',
        `Business application ${id} was rejected`,
        1, // Assuming admin ID is 1
        'admin'
      );
      
      // Refetch data
      await fetchBusinesses();
      
      // Reset selected application
      setSelectedApplication(null);
      
      // Close modal
      setIsApplicationModalOpen(false);
    } catch (err) {
      console.error('Error rejecting business application:', err);
      setError('Failed to reject business application');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle business status change
  const handleBusinessStatusChange = async (id: number, newStatus: DbBusiness['status']) => {
    try {
      setLoading(true);
      
      // Prefer admin API for RBAC-compliant status updates
      const resp = await api.put(`/api/businesses/admin/${id}/status`, { status: newStatus });
      if (resp.status !== 200) {
        // Fallback if admin endpoint unavailable
        await updateBusiness(id, { status: newStatus });
      }
      
      // Log the activity
      await logSystemActivity(
        'business_status_change',
        `Business ${id} status changed to ${newStatus}`,
        1, // Assuming admin ID is 1
        'admin'
      );
      
      // Refetch data
      await fetchBusinesses();
      
      // Show success message
      setError(null);
    } catch (err) {
      console.error('Error changing business status:', err);
      setError('Failed to update business status');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to safely format dates to prevent undefined errors
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };
  
  // Handle viewing business details
  const handleViewBusinessDetails = (business: DbBusiness) => {
    setSelectedBusiness(business);
    setIsBusinessDetailModalOpen(true);
    // Optionally, load additional details from admin endpoint in the background
    (async () => {
      try {
        const resp = await api.get(`/api/businesses/admin/${business.id}/details`);
        if (resp.status === 200 && resp.data?.profile) {
          setSelectedBusiness({
            ...(business as any),
            ...resp.data.profile,
          } as unknown as DbBusiness);
        }
      } catch (e) {
        console.warn('Failed to fetch business details from admin endpoint', e);
      }
    })();
  };
  
  // Handle viewing business analytics
  const handleViewBusinessAnalytics = (business: DbBusiness) => {
    setSelectedBusiness(business);
    setIsBusinessAnalyticsModalOpen(true);
  };
  
  // Function to calculate time registered
  const calculateTimeRegistered = (registeredAt: string): string => {
    const registrationDate = new Date(registeredAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - registrationDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} registered`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;
      if (remainingDays === 0) {
        return `${months} ${months === 1 ? 'month' : 'months'} registered`;
      }
      return `${months} ${months === 1 ? 'month' : 'months'} ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} registered`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingDays = diffDays % 365;
      const months = Math.floor(remainingDays / 30);
      
      if (months === 0) {
        return `${years} ${years === 1 ? 'year' : 'years'} registered`;
      }
      return `${years} ${years === 1 ? 'year' : 'years'} ${months} ${months === 1 ? 'month' : 'months'} registered`;
    }
  };

  // Comprehensive Business Table component with all requested data
  const ComprehensiveBusinessTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading businesses...</p>
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-50 p-4 rounded-lg text-red-800">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
          <button 
            className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      );
    }
    
    if (filteredBusinesses.length === 0) {
      return (
        <div className="bg-white p-8 rounded-lg text-center">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No businesses found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
              ? 'Try adjusting your filters' 
              : 'No businesses have been registered yet'}
          </p>
          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear filters
            </button>
          )}
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder={t('Search businesses')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'suspended')}
            >
              <option value="all">{t('All Status')}</option>
              <option value="active">{t('Active')}</option>
              <option value="inactive">{t('Inactive')}</option>
              <option value="suspended">{t('Suspended')}</option>
            </select>
            
            <select
              className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {businessTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'all' ? t('All Types') : type}
                </option>
              ))}
            </select>
            
            <button className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50">
              <Filter className="w-5 h-5" />
            </button>
            
            <button className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50">
              <Download className="w-5 h-5" onClick={exportBusinessesCsv} />
            </button>
          </div>
        </div>
        
        {/* Businesses Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Business Information')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Registration & Status')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Programs & Customers')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Business Metrics')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Last Activity')}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBusinesses.map((business) => (
                <tr 
                  key={business.id} 
                  className={`
                    ${business.status === 'suspended' ? 'bg-red-50' : ''}
                    ${business.status === 'inactive' ? 'bg-gray-50' : ''}
                    hover:bg-gray-50
                  `}
                >
                  {/* Business Information Column */}
                  <td className="px-6 py-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                        {business.logo ? (
                          <img 
                            src={business.logo} 
                            alt={business.name} 
                            className="h-12 w-12 rounded-full object-cover" 
                          />
                        ) : (
                          <Building className="h-6 w-6 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {business.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {business.email}
                          </div>
                        </div>
                        {business.phone && (
                          <div className="text-xs text-gray-500 mt-1">
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {business.phone}
                            </div>
                          </div>
                        )}
                        {business.address && (
                          <div className="text-xs text-gray-500 mt-1">
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span className="truncate max-w-32">{business.address}</span>
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-blue-600 mt-1 font-medium">
                          {business.type || 'General Business'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Registration & Status Column */}
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div>
                        <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full 
                          ${business.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                          ${business.status === 'inactive' ? 'bg-gray-100 text-gray-800' : ''}
                          ${business.status === 'suspended' ? 'bg-red-100 text-red-800' : ''}
                        `}>
                          {business.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {business.registeredAt ? formatDate(business.registeredAt) : 'N/A'}
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 font-medium">
                        <Clock className="h-3 w-3 mr-1 inline" />
                        {business.registeredAt ? calculateTimeRegistered(business.registeredAt) : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        <CreditCard className="h-3 w-3 mr-1 inline" />
                        Currency: USD {/* Default for now, should come from business profile */}
                      </div>
                    </div>
                  </td>

                  {/* Programs & Customers Column */}
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="text-sm">
                        <div className="flex items-center text-gray-900">
                          <User className="h-4 w-4 mr-1" />
                          <span className="font-medium">{business.customerCount || 0}</span>
                          <span className="text-gray-500 ml-1">customers</span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="flex items-center text-gray-900">
                          <Briefcase className="h-4 w-4 mr-1" />
                          <span className="font-medium">{business.programCount || 0}</span>
                          <span className="text-gray-500 ml-1">programs</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        <span>Promotions: 0</span> {/* This would need to be added to business data */}
                      </div>
                      <div className="text-xs text-gray-500">
                        <span>Active Cards: {business.customerCount || 0}</span>
                      </div>
                    </div>
                  </td>

                  {/* Business Metrics Column */}
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="text-sm">
                        <div className="flex items-center text-gray-900">
                          <span className="font-medium">${(business.revenue || 0).toLocaleString()}</span>
                          <span className="text-gray-500 ml-1">revenue</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        <div>Total Points Awarded: N/A</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        <div>Redemptions: N/A</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        <div>Avg. Customer Value: ${business.customerCount > 0 ? ((business.revenue || 0) / business.customerCount).toFixed(2) : '0'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Last Activity Column */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {formatDate(business.lastActivity)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Last login
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleViewBusinessDetails(business)}
                        className="text-gray-400 hover:text-gray-500"
                        title={t('View Full Details')}
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleViewBusinessAnalytics(business)}
                        className="text-blue-400 hover:text-blue-500"
                        title={t('View Analytics')}
                      >
                        <BarChart2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          const newStatus = business.status === 'active' ? 'inactive' : 'active';
                          handleBusinessStatusChange(business.id as number, newStatus);
                        }}
                        className={`
                          ${business.status === 'active' ? 'text-yellow-400 hover:text-yellow-500' : 'text-green-400 hover:text-green-500'}
                        `}
                        title={business.status === 'active' ? t('Deactivate') : t('Activate')}
                      >
                        {business.status === 'active' ? (
                          <XCircle className="h-5 w-5" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                      </button>
                      {business.status !== 'suspended' && (
                        <button
                          onClick={() => handleBusinessStatusChange(business.id as number, 'suspended')}
                          className="text-red-400 hover:text-red-500"
                          title={t('Suspend')}
                        >
                          <AlertTriangle className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Business Analytics Modal
  const BusinessAnalyticsModal = () => {
    if (!selectedBusiness) return null;
    
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${isBusinessAnalyticsModalOpen ? 'block' : 'hidden'}`}>
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>
          
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
            <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedBusiness.name} - Analytics
              </h3>
              <button
                onClick={() => setIsBusinessAnalyticsModalOpen(false)}
                className="bg-white rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="bg-white p-6 max-h-[80vh] overflow-y-auto">
              <BusinessAnalytics business={selectedBusiness} />
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 border border-transparent rounded-md font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                onClick={() => setIsBusinessAnalyticsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Define the ApplicationsTable component
  const ApplicationsTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading applications...</p>
          </div>
        </div>
      );
    }
    
    if (filteredApplications.length === 0) {
      return (
        <div className="bg-white p-8 rounded-lg text-center">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No applications found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? 'Try adjusting your search term' 
              : 'No businesses have applied recently'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear search
            </button>
          )}
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder={t('Search applications')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Applications Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Business')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Type')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Status')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Submitted')}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredApplications.map((application) => (
                <tr 
                  key={application.id} 
                  className={`
                    ${application.status === 'rejected' ? 'bg-red-50' : ''}
                    ${application.status === 'approved' ? 'bg-green-50' : ''}
                    hover:bg-gray-50
                  `}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Building className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {application.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {application.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{application.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${application.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                      ${application.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {application.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(application.submittedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedApplication(application);
                          setIsApplicationModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title={t('View Details')}
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      {application.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveApplication(application.id as number)}
                            className="text-green-600 hover:text-green-900"
                            title={t('Approve')}
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedApplication(application);
                              setIsApplicationModalOpen(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title={t('Reject')}
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Define the ApplicationDetailModal component
  const ApplicationDetailModal = () => {
    if (!selectedApplication) return null;
    
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${isApplicationModalOpen ? 'block' : 'hidden'}`}>
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>
          
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedApplication.name} - {t('Application')}
              </h3>
              <button
                onClick={() => setIsApplicationModalOpen(false)}
                className="bg-white rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="bg-white p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t('Business Information')}</h4>
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Name')}:</span> {selectedApplication.name}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Type')}:</span> {selectedApplication.type}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Address')}:</span> {selectedApplication.address}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Description')}:</span> {selectedApplication.description}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t('Contact Information')}</h4>
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Owner')}:</span> {selectedApplication.owner}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Email')}:</span> {selectedApplication.email}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Phone')}:</span> {selectedApplication.phone}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-500">{t('Documents')}</h4>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`p-3 border rounded ${selectedApplication.documents.businessLicense ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className={`h-5 w-5 ${selectedApplication.documents.businessLicense ? 'text-green-500' : 'text-red-500'}`} />
                        <span className="ml-2 text-sm font-medium text-gray-700">{t('Business License')}</span>
                      </div>
                      {selectedApplication.documents.businessLicense ? (
                        <ExternalLink className="h-4 w-4 text-blue-500 cursor-pointer" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className={`p-3 border rounded ${selectedApplication.documents.identityProof ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <User className={`h-5 w-5 ${selectedApplication.documents.identityProof ? 'text-green-500' : 'text-red-500'}`} />
                        <span className="ml-2 text-sm font-medium text-gray-700">{t('Identity Proof')}</span>
                      </div>
                      {selectedApplication.documents.identityProof ? (
                        <ExternalLink className="h-4 w-4 text-blue-500 cursor-pointer" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className={`p-3 border rounded ${selectedApplication.documents.addressProof ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MapPin className={`h-5 w-5 ${selectedApplication.documents.addressProof ? 'text-green-500' : 'text-red-500'}`} />
                        <span className="ml-2 text-sm font-medium text-gray-700">{t('Address Proof')}</span>
                      </div>
                      {selectedApplication.documents.addressProof ? (
                        <ExternalLink className="h-4 w-4 text-blue-500 cursor-pointer" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className={`p-3 border rounded ${selectedApplication.documents.taxDocument ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className={`h-5 w-5 ${selectedApplication.documents.taxDocument ? 'text-green-500' : 'text-red-500'}`} />
                        <span className="ml-2 text-sm font-medium text-gray-700">{t('Tax Document')}</span>
                      </div>
                      {selectedApplication.documents.taxDocument ? (
                        <ExternalLink className="h-4 w-4 text-blue-500 cursor-pointer" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedApplication.notes && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-500">{t('Notes')}</h4>
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                    <p className="text-sm text-gray-800">{selectedApplication.notes}</p>
                  </div>
                </div>
              )}
              
              {selectedApplication.status === 'pending' && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-500">{t('Decision')}</h4>
                  <div className="mt-2 flex flex-col space-y-3">
                    <textarea 
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      placeholder={t('Add notes for your decision (optional)')}
                      rows={3}
                    />
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => handleRejectApplication(selectedApplication.id as number, 'Rejected due to incomplete or invalid documentation.')}
                        className="px-4 py-2 border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 rounded-md text-sm font-medium"
                      >
                        {t('Reject')}
                      </button>
                      <button
                        onClick={() => handleApproveApplication(selectedApplication.id as number)}
                        className="px-4 py-2 border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 rounded-md text-sm font-medium"
                      >
                        {t('Approve')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Define the BusinessDetailModal component
  const BusinessDetailModal = () => {
    if (!selectedBusiness) return null;
    const [activity, setActivity] = useState<Array<{ id: number; user_id: number; login_time: string; ip_address?: string; device?: string }>>([]);
    const [activityLoading, setActivityLoading] = useState(false);

    useEffect(() => {
      let ignore = false;
      const loadActivity = async () => {
        try {
          setActivityLoading(true);
          const resp = await api.get(`/api/businesses/admin/${selectedBusiness.id}/activity?limit=5`);
          if (!ignore && resp.status === 200 && resp.data?.activity) {
            setActivity(resp.data.activity);
          }
        } catch (e) {
          console.warn('Failed to load business activity', e);
        } finally {
          if (!ignore) setActivityLoading(false);
        }
      };
      loadActivity();
      return () => {
        ignore = true;
      };
    }, [selectedBusiness?.id]);
    
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${isBusinessDetailModalOpen ? 'block' : 'hidden'}`}>
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>
          
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedBusiness.name} - {t('Business Details')}
              </h3>
              <button
                onClick={() => setIsBusinessDetailModalOpen(false)}
                className="bg-white rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="bg-white p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t('Business Information')}</h4>
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Name')}:</span> {selectedBusiness.name}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Type')}:</span> {selectedBusiness.type}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Status')}:</span> {selectedBusiness.status}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Address')}:</span> {selectedBusiness.address}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Registered')}:</span> {new Date(selectedBusiness.registeredAt).toLocaleDateString()}
                    </p>
                    {selectedBusiness.description && (
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">{t('Description')}:</span> {selectedBusiness.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t('Contact Information')}</h4>
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Owner')}:</span> {selectedBusiness.owner}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Email')}:</span> {selectedBusiness.email}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Phone')}:</span> {selectedBusiness.phone}
                    </p>
                  </div>
                  
                  <h4 className="text-sm font-medium text-gray-500 mt-6">{t('Stats')}</h4>
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Customers')}:</span> {selectedBusiness.customerCount || 0}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Revenue')}:</span> ${(selectedBusiness.revenue || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Last Activity')}:</span> {formatDate(selectedBusiness.lastActivity)}
                    </p>
                    {/* Optional: Points and redemptions if loaded from admin/details */}
                    {Boolean((selectedBusiness as any)?.stats?.totalPoints) && (
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">{t('Total Points Issued')}:</span> {(selectedBusiness as any).stats.totalPoints}
                      </p>
                    )}
                    {Boolean((selectedBusiness as any)?.stats?.totalRedemptions) && (
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">{t('Total Redemptions')}:</span> {(selectedBusiness as any).stats.totalRedemptions}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Programs list */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-500">{t('Programs & Historical Data')}</h4>
                <div className="mt-2 border rounded-md divide-y">
                  {Array.isArray((selectedBusiness as any)?.programs) && (selectedBusiness as any).programs.length > 0 ? (
                    ((selectedBusiness as any).programs as any[]).map((p) => (
                      <div key={p.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.description}</p>
                          <p className="text-xs text-blue-600 mt-1">Created: {formatDate(p.created_at)}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full border bg-gray-50 text-gray-700">{p.status}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-gray-500">{t('No programs found')}</div>
                  )}
                </div>
              </div>

              {/* Historical Timeline */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-500">{t('Business Timeline & Historical Tracking')}</h4>
                <div className="mt-2 border rounded-md">
                  <div className="p-4 space-y-4">
                    {/* Registration Event */}
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Business Registration</div>
                        <div className="text-xs text-gray-500">
                          {formatDate(selectedBusiness.registeredAt)} • {calculateTimeRegistered(selectedBusiness.registeredAt || '')}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Account opened and began operations</div>
                      </div>
                    </div>

                    {/* Customer Acquisition */}
                    {selectedBusiness.customerCount && selectedBusiness.customerCount > 0 && (
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">Customer Acquisition</div>
                          <div className="text-xs text-gray-500">Ongoing</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {selectedBusiness.customerCount} customers acquired
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Program Creation */}
                    {Array.isArray((selectedBusiness as any)?.programs) && (selectedBusiness as any).programs.length > 0 && (
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">Loyalty Programs Created</div>
                          <div className="text-xs text-gray-500">Multiple dates</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {(selectedBusiness as any).programs.length} loyalty programs launched
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Revenue Generation */}
                    {selectedBusiness.revenue && selectedBusiness.revenue > 0 && (
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">Revenue Generation</div>
                          <div className="text-xs text-gray-500">Ongoing</div>
                          <div className="text-xs text-gray-600 mt-1">
                            ${selectedBusiness.revenue.toLocaleString()} total revenue generated
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Last Activity */}
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Last Activity</div>
                        <div className="text-xs text-gray-500">{formatDate(selectedBusiness.lastActivity)}</div>
                        <div className="text-xs text-gray-600 mt-1">Most recent business login/activity</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Structured Business Lifecycle Summary */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-500">{t('Business Lifecycle Summary')}</h4>
                <div className="mt-2 bg-gray-50 rounded-md p-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="font-medium text-gray-700">Registration Period</div>
                      <div className="text-gray-600">{calculateTimeRegistered(selectedBusiness.registeredAt || '')}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Business Stage</div>
                      <div className="text-gray-600">
                        {selectedBusiness.customerCount > 100 ? 'Established' :
                         selectedBusiness.customerCount > 20 ? 'Growing' :
                         selectedBusiness.customerCount > 0 ? 'Developing' : 'New'}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Customer Base</div>
                      <div className="text-gray-600">{selectedBusiness.customerCount || 0} active customers</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Revenue Performance</div>
                      <div className="text-gray-600">
                        {selectedBusiness.revenue > 10000 ? 'High' :
                         selectedBusiness.revenue > 1000 ? 'Medium' : 'Low'} volume
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity log (last 5) */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-500">{t('Recent Activity')}</h4>
                <div className="mt-2 border rounded-md">
                  {activityLoading ? (
                    <div className="p-3 text-sm text-gray-500">{t('Loading...')}</div>
                  ) : activity.length > 0 ? (
                    <ul className="divide-y">
                      {activity.map(a => (
                        <li key={a.id} className="p-3 text-sm text-gray-800 flex items-center justify-between">
                          <span>{new Date(a.login_time).toLocaleString()}</span>
                          <span className="text-xs text-gray-500">{a.device || a.ip_address || 'session'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 text-sm text-gray-500">{t('No recent activity')}</div>
                  )}
                </div>
              </div>
              
              {selectedBusiness.notes && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-500">{t('Notes')}</h4>
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                    <p className="text-sm text-gray-800">{selectedBusiness.notes}</p>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsBusinessDetailModalOpen(false);
                    handleViewBusinessAnalytics(selectedBusiness);
                  }}
                  className="px-4 py-2 border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md text-sm font-medium"
                >
                  {t('View Analytics')}
                </button>
                {selectedBusiness.status !== 'suspended' ? (
                  <button
                    onClick={() => {
                      handleBusinessStatusChange(selectedBusiness.id as number, 'suspended');
                      setIsBusinessDetailModalOpen(false);
                    }}
                    className="px-4 py-2 border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 rounded-md text-sm font-medium"
                  >
                    {t('Suspend')}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleBusinessStatusChange(selectedBusiness.id as number, 'active');
                      setIsBusinessDetailModalOpen(false);
                    }}
                    className="px-4 py-2 border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 rounded-md text-sm font-medium"
                  >
                    {t('Reactivate')}
                  </button>
                )}
                {/* Optional admin actions: restrict and delete */}
                <button
                  onClick={async () => {
                    await handleBusinessStatusChange(selectedBusiness.id as number, 'inactive');
                    setIsBusinessDetailModalOpen(false);
                  }}
                  className="px-4 py-2 border border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-md text-sm font-medium"
                >
                  {t('Restrict')}
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this business? This action cannot be undone.')) {
                      try {
                        const resp = await api.delete(`/api/businesses/admin/${selectedBusiness.id}`);
                        if (resp.status === 200) {
                          await fetchBusinesses();
                        }
                      } catch (e) {
                        console.error('Delete business failed', e);
                      }
                      setIsBusinessDetailModalOpen(false);
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md text-sm font-medium"
                >
                  {t('Delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        <div className="sm:flex sm:justify-between sm:items-center mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              {t('Business Management')}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {t('Manage and monitor all business accounts')}
            </p>
          </div>
          
          <button
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            {t('Add Business')}
          </button>
        </div>
        
        {/* Business header section */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('Businesses')}
            </h2>
            <p className="text-gray-600">
              {t('Comprehensive business data including registration timeline, programs, customers, promotions, and historical tracking.')}
            </p>
          </div>
        </div>
        
        {/* Comprehensive Business Table */}
        <ComprehensiveBusinessTable />
        
        {/* Application Detail Modal */}
        {selectedApplication && (
          <ApplicationDetailModal />
        )}
        
        {/* Business Detail Modal */}
        {selectedBusiness && (
          <BusinessDetailModal />
        )}
        
        {/* Business Analytics Modal */}
        <BusinessAnalyticsModal />
      </div>
    </AdminLayout>
  );
};

export default AdminBusinesses; 