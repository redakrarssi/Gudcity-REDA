import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Building,
  Search,
  Filter,
  Eye,
  Edit,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  BarChart2,
  Download,
  User,
  Briefcase,
  CreditCard,
  Calendar,
  FileText,
  MapPin,
  Mail,
  Phone,
  Globe,
  Settings,
  TrendingUp,
  Users,
  Gift,
  Activity,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Filter as FilterIcon
} from 'lucide-react';

// Types for the new admin businesses endpoint
interface BusinessGeneralInfo {
  id: number;
  name: string;
  email: string;
  status: string;
  address?: string;
  phone?: string;
  currency: string;
  country?: string;
  timezone: string;
  language: string;
  taxId?: string;
  businessHours: any;
  paymentSettings: any;
  notificationSettings: any;
  integrations: any;
  profileUpdatedAt?: string;
  source: string;
}

interface RegistrationDuration {
  registrationDate: string;
  duration: string;
  daysRegistered: number;
}

interface Program {
  id: number;
  name: string;
  description?: string;
  type: string;
  category: string;
  point_value: number;
  expiration_days?: number;
  status: string;
  is_active: boolean;
  created_at: string;
}

interface Customer {
  id: number;
  name: string;
  email: string;
  tier: string;
  loyalty_points: number;
  total_spent: number;
  visits: number;
  joined_at: string;
  last_visit?: string;
  phone?: string;
  address?: string;
}

interface Promotion {
  id: number;
  code: string;
  type: string;
  value: number;
  currency: string;
  max_uses?: number;
  used_count: number;
  expires_at?: string;
  status: string;
  name: string;
  description?: string;
  created_at: string;
}

interface LastLogin {
  time: string;
  ipAddress: string;
  device: string;
}

interface TimelineEvent {
  type: string;
  title: string;
  description: string;
  date: string;
  category: string;
}

interface Business {
  generalInfo: BusinessGeneralInfo;
  registrationDuration: RegistrationDuration;
  programs: {
    count: number;
    items: Program[];
  };
  customers: {
    count: number;
    items: Customer[];
  };
  promotions: {
    count: number;
    items: Promotion[];
  };
  lastLogin?: LastLogin;
  timeline: TimelineEvent[];
}

interface AdminBusinessesResponse {
  success: boolean;
  totalBusinesses: number;
  businesses: Business[];
}

const AdminBusinesses = () => {
  const { t } = useTranslation();
  
  // State variables
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'registration' | 'customers' | 'programs'>('registration');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // UI states
  const [expandedBusinesses, setExpandedBusinesses] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Fetch businesses from the new admin endpoint
  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if token exists
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      console.log('🔍 Attempting to fetch businesses from /api/admin/businesses');
      
      const response = await fetch('/api/admin/businesses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 Response status:', response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        } else if (response.status === 404) {
          throw new Error('Admin businesses endpoint not found. Please check server configuration.');
        } else {
          throw new Error(`Failed to fetch businesses: ${response.statusText}`);
        }
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response received:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response. Please check server logs.');
      }

      const data: AdminBusinessesResponse = await response.json();
      console.log('🔍 Response data:', data);
      
      if (data.success) {
        setBusinesses(data.businesses);
        setFilteredBusinesses(data.businesses);
      } else {
        throw new Error('Failed to load businesses data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('❌ Error fetching businesses:', err);
      
      // Try fallback endpoint if main endpoint fails
      if (errorMessage.includes('not found') || errorMessage.includes('non-JSON')) {
        console.log('🔄 Trying fallback endpoint...');
        await tryFallbackEndpoints();
      }
    } finally {
      setLoading(false);
    }
  };

  // Try fallback endpoints if main endpoint fails
  const tryFallbackEndpoints = async () => {
    const fallbackEndpoints = [
      '/api/admin/basic-businesses',
      '/api/admin/simple-businesses',
      '/api/admin/public-test'
    ];
    
    for (const endpoint of fallbackEndpoints) {
      try {
        console.log(`🔄 Trying fallback endpoint: ${endpoint}`);
        const token = localStorage.getItem('token');
        const headers: any = { 'Content-Type': 'application/json' };
        
        if (endpoint !== '/api/admin/public-test') {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(endpoint, { headers });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Fallback endpoint ${endpoint} worked:`, data);
          
          if (data.businesses) {
            setBusinesses(data.businesses);
            setFilteredBusinesses(data.businesses);
            setError(null);
            return;
          }
        }
      } catch (fallbackError) {
        console.warn(`⚠️ Fallback endpoint ${endpoint} failed:`, fallbackError);
      }
    }
    
    // If all fallbacks fail, show helpful error
    setError('All business endpoints are unavailable. Please check server status and try again later.');
  };

  // Load businesses on component mount
  useEffect(() => {
    fetchBusinesses();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let filtered = businesses;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(business =>
        business.generalInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.generalInfo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.generalInfo.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(business => business.generalInfo.status === statusFilter);
    }

    // Apply currency filter
    if (currencyFilter !== 'all') {
      filtered = filtered.filter(business => business.generalInfo.currency === currencyFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.generalInfo.name.toLowerCase();
          bValue = b.generalInfo.name.toLowerCase();
          break;
        case 'registration':
          aValue = new Date(a.registrationDuration.registrationDate);
          bValue = new Date(b.registrationDuration.registrationDate);
          break;
        case 'customers':
          aValue = a.customers.count;
          bValue = b.customers.count;
          break;
        case 'programs':
          aValue = a.programs.count;
          bValue = b.programs.count;
          break;
        default:
          aValue = a.generalInfo.name.toLowerCase();
          bValue = b.generalInfo.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredBusinesses(filtered);
  }, [businesses, searchTerm, statusFilter, currencyFilter, sortBy, sortOrder]);

  // Toggle business expansion
  const toggleBusinessExpansion = (businessId: number) => {
    const newExpanded = new Set(expandedBusinesses);
    if (newExpanded.has(businessId)) {
      newExpanded.delete(businessId);
    } else {
      newExpanded.add(businessId);
    }
    setExpandedBusinesses(newExpanded);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'ID', 'Name', 'Email', 'Status', 'Address', 'Phone', 'Currency', 'Country',
      'Registration Date', 'Duration', 'Programs', 'Customers', 'Promotions', 'Last Login'
    ];
    
    const csvData = filteredBusinesses.map(business => [
      business.generalInfo.id,
      business.generalInfo.name,
      business.generalInfo.email,
      business.generalInfo.status,
      business.generalInfo.address || '',
      business.generalInfo.phone || '',
      business.generalInfo.currency,
      business.generalInfo.country || '',
      business.registrationDuration.registrationDate,
      business.registrationDuration.duration,
      business.programs.count,
      business.customers.count,
      business.promotions.count,
      business.lastLogin?.time || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `businesses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'suspended':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Get currency symbol
  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$'
    };
    return symbols[currency] || currency;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
            <p className="text-lg text-gray-600">Loading businesses...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Businesses</h2>
            <p className="text-red-600 mb-4">{error}</p>
            
            <div className="space-y-3">
              <button
                onClick={fetchBusinesses}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors mr-3"
              >
                Try Again
              </button>
              
              <button
                onClick={tryFallbackEndpoints}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Fallback Endpoints
              </button>
            </div>
            
            <div className="mt-6 text-left bg-white p-4 rounded-lg border">
              <h3 className="font-semibold text-gray-800 mb-2">Troubleshooting Steps:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Check if you're logged in as an admin user</li>
                <li>• Verify the server is running and accessible</li>
                <li>• Check server console for error messages</li>
                <li>• Try refreshing the page and logging in again</li>
                <li>• Contact system administrator if issues persist</li>
              </ul>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Building className="h-8 w-8 text-blue-600 mr-3" />
                Business Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage and monitor all registered businesses on the platform
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportToCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <FilterIcon className="h-4 w-4 mr-2" />
                Filters
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Businesses</p>
                  <p className="text-2xl font-bold text-gray-900">{businesses.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {businesses.filter(b => b.generalInfo.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {businesses.reduce((sum, b) => sum + b.customers.count, 0)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Gift className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Promotions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {businesses.reduce((sum, b) => sum + b.promotions.count, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg border p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search businesses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Currencies</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="registration">Registration Date</option>
                  <option value="name">Business Name</option>
                  <option value="customers">Customer Count</option>
                  <option value="programs">Program Count</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex items-center space-x-4">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </button>
              
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCurrencyFilter('all');
                  setSortBy('registration');
                  setSortOrder('desc');
                }}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Businesses List */}
        <div className="space-y-4">
          {filteredBusinesses.length === 0 ? (
            <div className="text-center py-12">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600">No businesses found</p>
              <p className="text-gray-500">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            filteredBusinesses.map((business) => (
              <div key={business.generalInfo.id} className="bg-white rounded-lg border shadow-sm">
                {/* Business Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Building className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {business.generalInfo.name}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {business.generalInfo.email}
                          </span>
                          {business.generalInfo.phone && (
                            <span className="flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              {business.generalInfo.phone}
                            </span>
                          )}
                          {business.generalInfo.address && (
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {business.generalInfo.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(business.generalInfo.status)}`}>
                        {business.generalInfo.status}
                      </span>
                      <button
                        onClick={() => toggleBusinessExpansion(business.generalInfo.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {expandedBusinesses.has(business.generalInfo.id) ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{business.programs.count}</p>
                      <p className="text-sm text-gray-600">Programs</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{business.customers.count}</p>
                      <p className="text-sm text-gray-600">Customers</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{business.promotions.count}</p>
                      <p className="text-sm text-gray-600">Promotions</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">
                        {business.registrationDuration.duration}
                      </p>
                      <p className="text-sm text-gray-600">Registered</p>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedBusinesses.has(business.generalInfo.id) && (
                  <div className="border-t bg-gray-50 p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-6">
                        {/* General Information */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                            <Settings className="h-5 w-5 mr-2 text-gray-600" />
                            General Information
                          </h4>
                          <div className="bg-white rounded-lg p-4 space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Currency:</span>
                              <span className="font-medium">{business.generalInfo.currency} {getCurrencySymbol(business.generalInfo.currency)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Country:</span>
                              <span className="font-medium">{business.generalInfo.country || 'Not specified'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Timezone:</span>
                              <span className="font-medium">{business.generalInfo.timezone}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Language:</span>
                              <span className="font-medium">{business.generalInfo.language.toUpperCase()}</span>
                            </div>
                            {business.generalInfo.taxId && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Tax ID:</span>
                                <span className="font-medium">{business.generalInfo.taxId}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Last Login */}
                        {business.lastLogin && (
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                              <Activity className="h-5 w-5 mr-2 text-gray-600" />
                              Last Login
                            </h4>
                            <div className="bg-white rounded-lg p-4 space-y-3">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Time:</span>
                                <span className="font-medium">
                                  {new Date(business.lastLogin.time).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">IP Address:</span>
                                <span className="font-medium font-mono">{business.lastLogin.ipAddress}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Device:</span>
                                <span className="font-medium">{business.lastLogin.device}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div className="space-y-6">
                        {/* Programs */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                            <Briefcase className="h-5 w-5 mr-2 text-gray-600" />
                            Programs ({business.programs.count})
                          </h4>
                          <div className="bg-white rounded-lg p-4 space-y-3 max-h-48 overflow-y-auto">
                            {business.programs.items.length > 0 ? (
                              business.programs.items.map((program) => (
                                <div key={program.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="font-medium text-gray-900">{program.name}</p>
                                    <p className="text-sm text-gray-600">{program.type} • {program.category}</p>
                                  </div>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    program.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {program.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-500 text-center py-4">No programs created yet</p>
                            )}
                          </div>
                        </div>

                        {/* Recent Customers */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                            <Users className="h-5 w-5 mr-2 text-gray-600" />
                            Recent Customers ({business.customers.count})
                          </h4>
                          <div className="bg-white rounded-lg p-4 space-y-3 max-h-48 overflow-y-auto">
                            {business.customers.items.slice(0, 5).map((customer) => (
                              <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="font-medium text-gray-900">{customer.name}</p>
                                  <p className="text-sm text-gray-600">{customer.tier} • {customer.loyalty_points} points</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">
                                    {getCurrencySymbol(business.generalInfo.currency)}{customer.total_spent}
                                  </p>
                                  <p className="text-xs text-gray-600">{customer.visits} visits</p>
                                </div>
                              </div>
                            ))}
                            {business.customers.items.length === 0 && (
                              <p className="text-gray-500 text-center py-4">No customers enrolled yet</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="mt-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-gray-600" />
                        Activity Timeline
                      </h4>
                      <div className="bg-white rounded-lg p-4">
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {business.timeline.length > 0 ? (
                            business.timeline.map((event, index) => (
                              <div key={index} className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">{event.title}</p>
                                  <p className="text-sm text-gray-600">{event.description}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(event.date).toLocaleString()}
                                  </p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  event.category === 'account' ? 'bg-blue-100 text-blue-800' :
                                  event.category === 'programs' ? 'bg-green-100 text-green-800' :
                                  event.category === 'customers' ? 'bg-purple-100 text-purple-800' :
                                  event.category === 'promotions' ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {event.category}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-center py-4">No activity recorded yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Results Summary */}
        {filteredBusinesses.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            Showing {filteredBusinesses.length} of {businesses.length} businesses
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBusinesses; 