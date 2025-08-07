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
  Phone,
  Ban,
  Unlock,
  Lock,
  Trash2,
  AlertOctagon,
  AlertCircle,
  Info,
  Activity,
  Settings,
  Shield
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
  updateBusinessApplicationStatus,
  suspendBusiness,
  deactivateBusiness,
  activateBusiness,
  deleteBusinessPermanently,
  getBusinessWithDetails,
  getBusinessActivityLog,
  updateBusinessComplianceStatus,
  restrictBusinessFeatures
} from '../../services/businessService';
import { logSystemActivity } from '../../services/dashboardService';

const AdminBusinesses = () => {
  const { t } = useTranslation();
  
  // State variables for business management
  const [applications, setApplications] = useState<DbBusinessApplication[]>([]);
  const [businesses, setBusinesses] = useState<DbBusiness[]>([]);
  const [activeTab, setActiveTab] = useState<'applications' | 'businesses' | 'analytics'>('businesses');
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
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ show: boolean; business: DbBusiness | null }>({ show: false, business: null });
  const [showStatusModal, setShowStatusModal] = useState<{ show: boolean; business: DbBusiness | null; action: string }>({ show: false, business: null, action: '' });
  const [selectedBusinessDetails, setSelectedBusinessDetails] = useState<{ business: DbBusiness; activityLog: any[] } | null>(null);

  // Load businesses from database
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Ensure required tables exist
        await ensureBusinessTablesExist();
        
        // Fetch businesses
        const fetchedBusinesses = await getAllBusinesses();
        setBusinesses(fetchedBusinesses);
        
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
        business.name.toLowerCase().includes(term) ||
        business.owner.toLowerCase().includes(term) ||
        business.email.toLowerCase().includes(term) ||
        business.type?.toLowerCase().includes(term)
      );
    }
    
    // Filter by type if necessary
    if (typeFilter !== 'all') {
      filtered = filtered.filter(business => business.type === typeFilter);
    }
    
    setFilteredBusinesses(filtered);
  }, [businesses, searchTerm, statusFilter, typeFilter]);

  const handleDelete = async (business: DbBusiness) => {
    setShowDeleteModal({ show: true, business });
  };

  const confirmDelete = async () => {
    if (!showDeleteModal.business) return;
    
    setActionLoading(showDeleteModal.business.id!);
    try {
      const success = await deleteBusinessPermanently(showDeleteModal.business.id!);
      if (success) {
        setBusinesses(businesses.filter(b => b.id !== showDeleteModal.business!.id));
        setFilteredBusinesses(filteredBusinesses.filter(b => b.id !== showDeleteModal.business!.id));
        // onRefresh(); // Assuming onRefresh is defined elsewhere or will be added
        setShowDeleteModal({ show: false, business: null });
      } else {
        setError('Failed to delete business');
      }
    } catch (err) {
      setError('An error occurred while deleting the business');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (business: DbBusiness, action: 'suspend' | 'deactivate' | 'activate') => {
    setShowStatusModal({ show: true, business, action });
  };

  const confirmStatusChange = async () => {
    if (!showStatusModal.business) return;
    
    setActionLoading(showStatusModal.business.id!);
    try {
      let success = false;
      
      switch (showStatusModal.action) {
        case 'suspend':
          success = await suspendBusiness(showStatusModal.business.id!);
          break;
        case 'deactivate':
          success = await deactivateBusiness(showStatusModal.business.id!);
          break;
        case 'activate':
          success = await activateBusiness(showStatusModal.business.id!);
          break;
      }
      
      if (success) {
        // Update business status in state
        const newStatus = showStatusModal.action === 'activate' ? 'active' : 
                         showStatusModal.action === 'suspend' ? 'suspended' : 'inactive';
        
        setBusinesses(businesses.map(b => 
          b.id === showStatusModal.business!.id ? { ...b, status: newStatus } : b
        ));
        
        setFilteredBusinesses(filteredBusinesses.map(b => 
          b.id === showStatusModal.business!.id ? { ...b, status: newStatus } : b
        ));
        
        // onRefresh(); // Assuming onRefresh is defined elsewhere or will be added
        setShowStatusModal({ show: false, business: null, action: '' });
      } else {
        setError(`Failed to ${showStatusModal.action} business`);
      }
    } catch (err) {
      setError(`An error occurred while ${showStatusModal.action}ing the business`);
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetails = async (business: DbBusiness) => {
    try {
      const businessDetails = await getBusinessWithDetails(business.id!);
      const activityLog = await getBusinessActivityLog(business.id!);
      
      if (businessDetails) {
        setSelectedBusinessDetails({
          business: businessDetails,
          activityLog
        });
      }
    } catch (err) {
      console.error('Error fetching business details:', err);
      setError('Failed to load business details');
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            Inactive
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Info className="w-3 h-3 mr-1" />
            Unknown
          </span>
        );
    }
  };

  const getActionButtons = (business: DbBusiness) => {
    const isActionLoading = actionLoading === business.id;
    
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleViewDetails(business)}
          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
        
        {business.status === 'active' ? (
          <>
            <button
              onClick={() => handleStatusChange(business, 'deactivate')}
              disabled={isActionLoading}
              className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors disabled:opacity-50"
              title="Deactivate Business"
            >
              <Lock className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleStatusChange(business, 'suspend')}
              disabled={isActionLoading}
              className="p-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
              title="Suspend Business"
            >
              <Ban className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => handleStatusChange(business, 'activate')}
            disabled={isActionLoading}
            className="p-1 text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
            title="Activate Business"
          >
            <Unlock className="w-4 h-4" />
          </button>
        )}
        
        <button
          onClick={() => handleDelete(business)}
          disabled={isActionLoading}
          className="p-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
          title="Delete Business"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
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
  };
  
  // Handle viewing business analytics
  const handleViewBusinessAnalytics = (business: DbBusiness) => {
    setSelectedBusiness(business);
    setIsBusinessAnalyticsModalOpen(true);
  };
  
  // Active Businesses Table component
  const ActiveBusinessesTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading businesses...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading businesses</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Active Businesses ({filteredBusinesses.length})
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Manage business accounts and their status
              </p>
            </div>
            <div className="flex space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search businesses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>
        
        {filteredBusinesses.length === 0 ? (
          <div className="text-center py-8">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No businesses found</h3>
            <p className="text-gray-500">No businesses match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Programs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBusinesses.map((business) => (
                  <tr key={business.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Building className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{business.name}</div>
                          <div className="text-sm text-gray-500">{business.owner}</div>
                          <div className="text-sm text-gray-500">{business.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{business.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(business.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {business.programCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {business.customerCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {business.registeredAt ? new Date(business.registeredAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {getActionButtons(business)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                  </div>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Confirmation Modals */}
        {showDeleteModal.show && showDeleteModal.business && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <AlertOctagon className="mx-auto flex items-center justify-center h-12 w-12 text-red-600" />
                <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Business</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to permanently delete <strong>{showDeleteModal.business.name}</strong>? 
                    This action cannot be undone and will remove all associated data including programs and customer records.
                  </p>
                </div>
                <div className="items-center px-4 py-3">
                  <button
                    onClick={confirmDelete}
                    disabled={actionLoading === showDeleteModal.business.id}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading === showDeleteModal.business.id ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteModal({ show: false, business: null })}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-24 hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showStatusModal.show && showStatusModal.business && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <AlertTriangle className="mx-auto flex items-center justify-center h-12 w-12 text-yellow-600" />
                <h3 className="text-lg font-medium text-gray-900 mt-4">
                  {showStatusModal.action === 'suspend' ? 'Suspend Business' : 
                   showStatusModal.action === 'deactivate' ? 'Deactivate Business' : 'Activate Business'}
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to {showStatusModal.action} <strong>{showStatusModal.business.name}</strong>?
                    {showStatusModal.action === 'suspend' && ' This will prevent all activity and disable their programs.'}
                    {showStatusModal.action === 'deactivate' && ' This will limit their access to certain features.'}
                    {showStatusModal.action === 'activate' && ' This will restore their full access.'}
                  </p>
                </div>
                <div className="items-center px-4 py-3">
                  <button
                    onClick={confirmStatusChange}
                    disabled={actionLoading === showStatusModal.business.id}
                    className={`px-4 py-2 text-white text-base font-medium rounded-md w-24 mr-2 disabled:opacity-50 ${
                      showStatusModal.action === 'suspend' ? 'bg-red-600 hover:bg-red-700' :
                      showStatusModal.action === 'deactivate' ? 'bg-yellow-600 hover:bg-yellow-700' :
                      'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {actionLoading === showStatusModal.business.id ? 'Updating...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setShowStatusModal({ show: false, business: null, action: '' })}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-24 hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Business Details Modal */}
        {selectedBusinessDetails && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-3/4 shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Business Details</h3>
                <button
                  onClick={() => setSelectedBusinessDetails(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Business Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedBusinessDetails.business.name}</p>
                    <p><strong>Owner:</strong> {selectedBusinessDetails.business.owner}</p>
                    <p><strong>Email:</strong> {selectedBusinessDetails.business.email}</p>
                    <p><strong>Phone:</strong> {selectedBusinessDetails.business.phone || 'N/A'}</p>
                    <p><strong>Type:</strong> {selectedBusinessDetails.business.type}</p>
                    <p><strong>Status:</strong> {getStatusBadge(selectedBusinessDetails.business.status)}</p>
                    <p><strong>Registered:</strong> {selectedBusinessDetails.business.registeredAt ? new Date(selectedBusinessDetails.business.registeredAt).toLocaleString() : 'N/A'}</p>
                    <p><strong>Address:</strong> {selectedBusinessDetails.business.address || 'N/A'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Statistics</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Programs:</strong> {selectedBusinessDetails.business.programCount || 0}</p>
                    <p><strong>Customers:</strong> {selectedBusinessDetails.business.customerCount || 0}</p>
                    <p><strong>Total Revenue:</strong> ${selectedBusinessDetails.business.revenue || 0}</p>
                    <p><strong>Analytics Records:</strong> {selectedBusinessDetails.business.analyticsCount || 0}</p>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 mb-2 mt-4">Activity Log (Last 30 Days)</h4>
                  <div className="max-h-48 overflow-y-auto">
                    {selectedBusinessDetails.activityLog.length > 0 ? (
                      <div className="space-y-2">
                        {selectedBusinessDetails.activityLog.slice(0, 10).map((log, index) => (
                          <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                            <p><strong>{log.action}</strong></p>
                            <p className="text-gray-600">{log.details}</p>
                            <p className="text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No recent activity</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Business Management</h1>
                <p className="text-gray-500 mt-1">Manage business accounts, applications, and analytics</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('businesses')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'businesses'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Building className="w-4 h-4 mr-2" />
                    Businesses ({businesses.length})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('applications')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'applications'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Applications ({applications.length})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'analytics'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <BarChart2 className="w-4 h-4 mr-2" />
                    Analytics
                  </div>
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === 'businesses' && <ActiveBusinessesTable />}
              {activeTab === 'applications' && <ApplicationsTable />}
              {activeTab === 'analytics' && <BusinessAnalyticsModal />}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBusinesses; 