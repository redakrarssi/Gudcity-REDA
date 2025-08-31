import React, { useEffect, useState } from 'react';
import { Tab } from '@headlessui/react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  Users, 
  Briefcase, 
  Trash2, 
  AlertOctagon, 
  RefreshCw,
  Building,
  Star,
  Calendar,
  TrendingUp,
  MapPin,
  Phone,
  Globe,
  DollarSign,
  CreditCard,
  Clock
} from 'lucide-react';
import api from '../../api/api';
import { formatDate, formatRegistrationDuration } from '../../utils/dateUtils';

// Business interface following reda.md rules
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
  programs: Program[];
  promotions: any[];
  recentLogins: any[];
  registrationDuration: {
    timestamp: string;
    days: number;
    months: number;
  };
}

interface Program {
  id: number | string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  created_at: string;
  description?: string;
  category?: string;
  customerCount?: number;
}

interface BusinessTableProps {
  onRefresh: () => void;
  onAnalyticsUpdate?: (analytics: BusinessAnalytics) => void;
}

interface BusinessAnalytics {
  totalBusinesses: number;
  activeBusinesses: number;
  totalPrograms: number;
  newThisMonth: number;
}

export const BusinessTables: React.FC<BusinessTableProps> = ({ onRefresh, onAnalyticsUpdate }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'inactive'|'suspended'>('all');
  const [typeFilter, setTypeFilter] = useState<'all'|'retail'|'restaurant'|'service'|'other'>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedBusinessIds, setExpandedBusinessIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    console.log('Loading businesses...');
    loadBusinesses();
  }, [onRefresh, activeTab]);

  const loadBusinesses = async () => {
    setLoading(true);
    setError(null);
    console.log('Fetching businesses from database...');
    try {
      const response = await api.get('/api/admin/businesses');
      if (response.data?.businesses) {
        const businessData = response.data.businesses;
        setBusinesses(businessData);
        console.log('✅ Loaded', businessData.length, 'businesses with programs');
        
        // Calculate and send analytics to parent component
        if (onAnalyticsUpdate) {
          const totalPrograms = businessData.reduce((sum: number, business: Business) => sum + (business.programCount || 0), 0);
          const activeBusinesses = businessData.filter((b: Business) => b.status === 'active').length;
          
          // Calculate new businesses this month
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          const newThisMonth = businessData.filter((b: Business) => {
            const registrationDate = new Date(b.registeredAt);
            return registrationDate.getMonth() === currentMonth && registrationDate.getFullYear() === currentYear;
          }).length;
          
          onAnalyticsUpdate({
            totalBusinesses: businessData.length,
            activeBusinesses,
            totalPrograms,
            newThisMonth
          });
        }
      } else {
        setError('No business data received from API');
      }
    } catch (err) {
      console.error('Error loading businesses:', err);
      setError('Failed to load businesses. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds(prev => checked ? Array.from(new Set([...prev, id])) : prev.filter(x=>x!==id));
  };

  const clearSelection = () => setSelectedIds([]);

  const toggleExpanded = (businessId: string | number) => {
    setExpandedBusinessIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(businessId)) {
        newSet.delete(businessId);
      } else {
        newSet.add(businessId);
      }
      return newSet;
    });
  };

  const applyFilter = (list: Business[]) => {
    return list.filter(business => {
      const matchesSearch = !search || (
        business.name?.toLowerCase().includes(search.toLowerCase()) ||
        business.owner?.toLowerCase().includes(search.toLowerCase()) ||
        business.email?.toLowerCase().includes(search.toLowerCase()) ||
        business.address?.toLowerCase().includes(search.toLowerCase())
      );
      const matchesStatus = statusFilter === 'all' || business.status === statusFilter;
      const matchesType = typeFilter === 'all' || business.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  };

  const filteredBusinesses = applyFilter(businesses);

  const batchAction = async (action: 'suspend'|'activate'|'delete') => {
    const ids = selectedIds;
    if (ids.length === 0) return;
    
    if (action === 'delete' && !window.confirm(`Are you sure you want to delete ${ids.length} businesses? This action cannot be undone.`)) {
      return;
    }

    for (const id of ids) {
      await handleStatusChange(id, action);
    }
    clearSelection();
  };

  const handleStatusChange = async (
    id: number | string, 
    action: 'suspend' | 'activate' | 'delete'
  ) => {
    setActionLoading(Number(id));
    try {
      // This would call your business management API
      console.log(`${action} business ${id}`);
      
      // Update the business status in state (mock implementation)
      if (action === 'delete') {
        setBusinesses(businesses.filter(business => business.id !== id));
      } else {
        const newStatus = action === 'activate' ? 'active' : 'suspended';
        setBusinesses(businesses.map(business => 
          business.id === id ? { ...business, status: newStatus as any } : business
        ));
      }
      
      onRefresh();
    } catch (err) {
      setError(`An error occurred while updating business status`);
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Helper to get status badge
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'suspended':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            <XCircle className="w-4 h-4 mr-1" /> Suspended
          </span>
        );
      case 'inactive':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-4 h-4 mr-1" /> Inactive
          </span>
        );
      default:
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" /> Active
          </span>
        );
    }
  };

  // Business details component for expanded view
  const BusinessDetails: React.FC<{ business: Business }> = ({ business }) => (
    <div className="bg-gray-50 px-6 py-4 border-t">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Information */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 flex items-center">
            <Building className="h-5 w-5 mr-2 text-blue-500" />
            Business Details
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              <span>{business.address || 'No address provided'}</span>
            </div>
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2 text-gray-400" />
              <span>{business.phone || 'No phone provided'}</span>
            </div>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
              <span>Revenue: {business.currency} {business.revenue?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              <span>Registered: {formatRegistrationDuration(business.registeredAt)}</span>
            </div>
            {business.lastLogin && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                <span>Last login: {formatDate(business.lastLogin)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Loyalty Programs */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 flex items-center">
            <Star className="h-5 w-5 mr-2 text-yellow-500" />
            Loyalty Programs ({business.programCount})
          </h4>
          {business.programs && business.programs.length > 0 ? (
            <div className="space-y-3">
              {business.programs.map((program) => (
                <div 
                  key={program.id} 
                  className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-900">{program.name}</h5>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      program.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : program.status === 'INACTIVE'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {program.status}
                    </span>
                  </div>
                  {program.description && (
                    <p className="text-sm text-gray-600 mt-1">{program.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>Created: {formatDate(program.created_at)}</span>
                    {program.customerCount && (
                      <span>{program.customerCount} customers enrolled</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Star className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No loyalty programs found</p>
            </div>
          )}
        </div>

        {/* Business Metrics */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
            Business Metrics
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Customers</p>
                  <p className="text-lg font-semibold text-gray-900">{business.customerCount || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <CreditCard className="h-6 w-6 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Transactions</p>
                  <p className="text-lg font-semibold text-gray-900">{business.transactionCount || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <Star className="h-6 w-6 text-yellow-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Programs</p>
                  <p className="text-lg font-semibold text-gray-900">{business.programCount || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <DollarSign className="h-6 w-6 text-purple-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Revenue</p>
                  <p className="text-lg font-semibold text-gray-900">{business.currency} {business.revenue?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Main table render function
  const renderBusinessTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
          <span>Loading businesses...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          <div className="flex items-center">
            <AlertOctagon className="w-5 h-5 mr-2" />
            {error}
          </div>
          <button 
            onClick={loadBusinesses}
            className="mt-2 text-blue-600 underline flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Try Again
          </button>
        </div>
      );
    }

    if (filteredBusinesses.length === 0) {
      return (
        <div className="text-center p-8 text-gray-500">
          No businesses found
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <div className="p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              className="px-3 py-2 border rounded text-sm"
              placeholder="Search businesses..."
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
            />
            <select className="px-3 py-2 border rounded text-sm" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as any)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            <select className="px-3 py-2 border rounded text-sm" value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value as any)}>
              <option value="all">All Types</option>
              <option value="retail">Retail</option>
              <option value="restaurant">Restaurant</option>
              <option value="service">Service</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>batchAction('activate')} disabled={selectedIds.length===0} className="px-3 py-1 rounded border text-sm text-green-700 border-green-300 disabled:opacity-50">Activate Selected</button>
            <button onClick={()=>batchAction('suspend')} disabled={selectedIds.length===0} className="px-3 py-1 rounded border text-sm text-yellow-700 border-yellow-300 disabled:opacity-50">Suspend Selected</button>
            <button onClick={()=>batchAction('delete')} disabled={selectedIds.length===0} className="px-3 py-1 rounded border text-sm text-red-700 border-red-300 disabled:opacity-50">Delete Selected</button>
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3">
                <input type="checkbox" onChange={(e)=>{
                  const checked = e.target.checked;
                  if (checked) {
                    const ids = filteredBusinesses.map(b=>Number(b.id)).filter(Boolean);
                    setSelectedIds(Array.from(new Set([...selectedIds, ...ids])));
                  } else {
                    clearSelection();
                  }
                }} />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Business
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner & Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Programs & Customers
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registration
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBusinesses.map((business) => (
              <React.Fragment key={business.id}>
                <tr className={`hover:bg-gray-50 ${business.status === 'suspended' ? 'bg-red-50' : (business.status === 'inactive' ? 'bg-yellow-50' : '')}`}>
                  <td className="px-3 py-4">
                    <input type="checkbox" checked={selectedIds.includes(Number(business.id))} onChange={(e)=>toggleSelected(Number(business.id), e.target.checked)} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        {business.logo ? (
                          <img className="h-12 w-12 rounded-lg object-cover" src={business.logo} alt="" />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                            <Building className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{business.name}</div>
                        <div className="text-sm text-gray-500">{business.type || 'General Business'}</div>
                        <button
                          onClick={() => toggleExpanded(business.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                        >
                          {expandedBusinessIds.has(business.id) ? 'Hide Details' : 'View Details'}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{business.owner}</div>
                    <div className="text-sm text-gray-500">{business.email}</div>
                    {business.phone && (
                      <div className="text-xs text-gray-400">{business.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="text-sm text-gray-900">{business.programCount || 0}</span>
                        <span className="text-xs text-gray-500 ml-1">programs</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-blue-500 mr-1" />
                        <span className="text-sm text-gray-900">{business.customerCount || 0}</span>
                        <span className="text-xs text-gray-500 ml-1">customers</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(business.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{formatDate(business.registeredAt)}</div>
                    <div className="text-xs text-gray-400">{formatRegistrationDuration(business.registeredAt)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {business.status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(business.id, 'suspend')}
                          disabled={actionLoading === Number(business.id)}
                          className="text-yellow-600 hover:text-yellow-900 p-1 rounded"
                          title="Suspend Business"
                        >
                          <AlertTriangle className="w-5 h-5" />
                        </button>
                      )}
                      {(business.status === 'suspended' || business.status === 'inactive') && (
                        <button
                          onClick={() => handleStatusChange(business.id, 'activate')}
                          disabled={actionLoading === Number(business.id)}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title="Activate Business"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleStatusChange(business.id, 'delete')}
                        disabled={actionLoading === Number(business.id)}
                        className="text-gray-600 hover:text-gray-900 p-1 rounded"
                        title="Delete Business"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      {actionLoading === Number(business.id) && (
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                      )}
                    </div>
                  </td>
                </tr>
                {/* Expanded business details */}
                {expandedBusinessIds.has(business.id) && (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <BusinessDetails business={business} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <Tab.List className="flex bg-gray-100 border-b border-gray-200">
          <Tab 
            className={({ selected }: { selected: boolean }) => 
              `py-3 px-6 text-sm font-medium flex items-center focus:outline-none ${
                selected
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <Building className="w-5 h-5 mr-2" />
            All Businesses ({businesses.length})
          </Tab>
          <Tab 
            className={({ selected }: { selected: boolean }) => 
              `py-3 px-6 text-sm font-medium flex items-center focus:outline-none ${
                selected
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Active ({businesses.filter(b => b.status === 'active').length})
          </Tab>
          <Tab 
            className={({ selected }: { selected: boolean }) => 
              `py-3 px-6 text-sm font-medium flex items-center focus:outline-none ${
                selected
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <Star className="w-5 h-5 mr-2" />
            By Programs ({businesses.filter(b => (b.programCount || 0) > 0).length})
          </Tab>
        </Tab.List>
        <Tab.Panels>
          <Tab.Panel>{renderBusinessTable()}</Tab.Panel>
          <Tab.Panel>{renderBusinessTable()}</Tab.Panel>
          <Tab.Panel>{renderBusinessTable()}</Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};
