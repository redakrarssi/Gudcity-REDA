import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
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

// Mock data interfaces
interface BusinessApplication {
  id: number;
  name: string;
  owner: string;
  email: string;
  phone: string;
  type: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  documentsVerified: boolean;
  documents: {
    businessLicense: string;
    identityProof: string;
    addressProof: string;
    taxDocument: string;
  };
  description: string;
  address: string;
  notes?: string;
}

interface Business {
  id: number;
  name: string;
  owner: string;
  email: string;
  phone: string;
  type: string;
  status: 'active' | 'inactive' | 'suspended';
  registeredAt: string;
  address: string;
  logo?: string;
  programCount: number;
  customerCount: number;
  revenue: number;
  rating: number;
  complianceStatus: 'compliant' | 'warning' | 'violation';
  lastActivity: string;
  description: string;
  programs?: Array<{
    id: number;
    name: string;
    type: string;
    enrollmentCount: number;
    redemptionRate: number;
    status: string;
  }>;
  analytics?: {
    customerRetention: number;
    averageSpend: number;
    growthRate: number;
    activeUsers: number;
  };
  transactions?: Array<{
    id: number;
    date: string;
    amount: number;
    type: string;
    customer: string;
  }>;
  notes?: string;
}

// Mock data
const MOCK_APPLICATIONS: BusinessApplication[] = [
  {
    id: 1,
    name: 'Coffee Haven',
    owner: 'Michael Brown',
    email: 'michael@coffeehaven.com',
    phone: '+1 555-345-6789',
    type: 'Food & Beverage',
    submittedAt: '2023-09-15T08:30:00Z',
    status: 'pending',
    documentsVerified: true,
    documents: {
      businessLicense: 'license_coffeehaven.pdf',
      identityProof: 'id_michael_brown.pdf',
      addressProof: 'address_coffeehaven.pdf',
      taxDocument: 'tax_coffeehaven.pdf'
    },
    description: 'Specialty coffee shop with multiple locations offering loyalty programs for regular customers.',
    address: '123 Brew Street, Seattle, WA 98101'
  },
  {
    id: 2,
    name: 'Fitness Zone',
    owner: 'Sarah Johnson',
    email: 'sarah@fitnesszone.com',
    phone: '+1 555-987-6543',
    type: 'Health & Fitness',
    submittedAt: '2023-09-14T14:45:00Z',
    status: 'pending',
    documentsVerified: false,
    documents: {
      businessLicense: 'license_fitnesszone.pdf',
      identityProof: 'id_sarah_johnson.pdf',
      addressProof: 'address_fitnesszone.pdf',
      taxDocument: 'tax_fitnesszone.pdf'
    },
    description: 'Modern fitness center offering personalized training programs and membership rewards.',
    address: '456 Health Avenue, Portland, OR 97201',
    notes: 'Missing proper tax documentation. Follow up required.'
  },
  {
    id: 3,
    name: 'Tech Gadgets',
    owner: 'David Wilson',
    email: 'david@techgadgets.com',
    phone: '+1 555-123-4567',
    type: 'Electronics',
    submittedAt: '2023-09-12T10:15:00Z',
    status: 'rejected',
    documentsVerified: false,
    documents: {
      businessLicense: 'license_techgadgets.pdf',
      identityProof: 'id_david_wilson.pdf',
      addressProof: '',
      taxDocument: 'tax_techgadgets.pdf'
    },
    description: 'Electronics store specializing in the latest technology products and accessories.',
    address: '789 Tech Boulevard, San Francisco, CA 94105',
    notes: 'Rejected due to incomplete documentation and address verification issues.'
  },
  {
    id: 4,
    name: 'Green Grocers',
    owner: 'Emily Davis',
    email: 'emily@greengrocers.com',
    phone: '+1 555-789-0123',
    type: 'Grocery',
    submittedAt: '2023-09-16T09:20:00Z',
    status: 'pending',
    documentsVerified: true,
    documents: {
      businessLicense: 'license_greengrocers.pdf',
      identityProof: 'id_emily_davis.pdf',
      addressProof: 'address_greengrocers.pdf',
      taxDocument: 'tax_greengrocers.pdf'
    },
    description: 'Organic grocery store focusing on locally-sourced produce and sustainable products.',
    address: '321 Organic Lane, Austin, TX 78701'
  }
];

const MOCK_BUSINESSES: Business[] = [
  {
    id: 101,
    name: 'BookWorld',
    owner: 'Robert Martinez',
    email: 'robert@bookworld.com',
    phone: '+1 555-234-5678',
    type: 'Retail',
    status: 'active',
    registeredAt: '2023-01-10T12:40:00Z',
    address: '456 Reader Road, Boston, MA 02108',
    programCount: 3,
    customerCount: 1240,
    revenue: 83500,
    rating: 4.7,
    complianceStatus: 'compliant',
    lastActivity: '2023-09-14T10:05:00Z',
    description: 'Chain of bookstores offering reading rewards programs and literary events.'
  },
  {
    id: 102,
    name: 'Tech Store',
    owner: 'Alex Wong',
    email: 'alex@techstore.com',
    phone: '+1 555-876-5432',
    type: 'Electronics',
    status: 'active',
    registeredAt: '2022-12-08T10:20:00Z',
    address: '123 Tech Lane, San Francisco, CA 94107',
    programCount: 2,
    customerCount: 3680,
    revenue: 425000,
    rating: 4.5,
    complianceStatus: 'compliant',
    lastActivity: '2023-09-16T11:30:00Z',
    description: 'High-end technology retailer with strong customer loyalty and tech support programs.'
  },
  {
    id: 103,
    name: 'Fitness First',
    owner: 'Jessica Miller',
    email: 'jessica@fitnessfirst.com',
    phone: '+1 555-345-6789',
    type: 'Health & Fitness',
    status: 'inactive',
    registeredAt: '2023-04-02T13:10:00Z',
    address: '789 Fitness Ave, Chicago, IL 60601',
    programCount: 1,
    customerCount: 450,
    revenue: 28000,
    rating: 3.8,
    complianceStatus: 'warning',
    lastActivity: '2023-08-05T14:25:00Z',
    description: 'Fitness center with membership rewards and health tracking programs.',
    notes: 'Temporarily inactive due to facility renovations. Expected to resume in October 2023.'
  },
  {
    id: 104,
    name: 'Urban Eats',
    owner: 'Carlos Rodriguez',
    email: 'carlos@urbaneats.com',
    phone: '+1 555-987-6543',
    type: 'Food & Beverage',
    status: 'suspended',
    registeredAt: '2023-02-15T09:30:00Z',
    address: '321 Food Court, New York, NY 10001',
    programCount: 2,
    customerCount: 1850,
    revenue: 156000,
    rating: 4.2,
    complianceStatus: 'violation',
    lastActivity: '2023-07-20T11:45:00Z',
    description: 'Urban restaurant chain with digital loyalty programs and online ordering rewards.',
    notes: 'Suspended due to multiple customer complaints and policy violations. Under review until 2023-10-15.'
  },
  {
    id: 105,
    name: 'Wellness Spa',
    owner: 'Amanda Lee',
    email: 'amanda@wellnessspa.com',
    phone: '+1 555-123-4567',
    type: 'Health & Beauty',
    status: 'active',
    registeredAt: '2023-03-15T09:25:00Z',
    address: '567 Relaxation Blvd, Miami, FL 33101',
    programCount: 3,
    customerCount: 920,
    revenue: 210000,
    rating: 4.9,
    complianceStatus: 'compliant',
    lastActivity: '2023-09-15T08:50:00Z',
    description: 'Luxury spa offering membership benefits and treatment package rewards.'
  }
];

const AdminBusinesses = () => {
  const { t } = useTranslation();
  
  // State variables for business management
  const [applications, setApplications] = useState<BusinessApplication[]>(MOCK_APPLICATIONS);
  const [businesses, setBusinesses] = useState<Business[]>(MOCK_BUSINESSES);
  const [activeTab, setActiveTab] = useState<'applications' | 'businesses' | 'analytics'>('applications');
  const [selectedApplication, setSelectedApplication] = useState<BusinessApplication | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isBusinessDetailModalOpen, setIsBusinessDetailModalOpen] = useState(false);
  const [isBusinessAnalyticsModalOpen, setIsBusinessAnalyticsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Filter applications by search term
  const filteredApplications = applications.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Filter businesses by search term and status
  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch = 
      business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || business.status === statusFilter;
    const matchesType = typeFilter === 'all' || business.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });
  
  // Get unique business types for filter
  const businessTypes = ['all', ...new Set(businesses.map(b => b.type))];
  
  // Handle application approval
  const handleApproveApplication = (id: number, notes?: string) => {
    // In a real app, this would make an API call
    console.log(`Approving application ${id}${notes ? ` with notes: ${notes}` : ''}`);
    
    // Update the application status
    setApplications(apps => 
      apps.map(app => 
        app.id === id ? { ...app, status: 'approved' } : app
      )
    );
    
    // Find the approved application
    const approvedApp = applications.find(app => app.id === id);
    
    // Add the approved business to the businesses list
    if (approvedApp) {
      const newBusiness: Business = {
        id: Math.max(...businesses.map(b => b.id)) + 1,
        name: approvedApp.name,
        owner: approvedApp.owner,
        email: approvedApp.email,
        phone: approvedApp.phone,
        type: approvedApp.type,
        status: 'active',
        registeredAt: new Date().toISOString(),
        address: approvedApp.address,
        programCount: 0,
        customerCount: 0,
        revenue: 0,
        rating: 0,
        complianceStatus: 'compliant',
        lastActivity: new Date().toISOString(),
        description: approvedApp.description,
        notes: notes
      };
      
      setBusinesses([...businesses, newBusiness]);
    }
    
    setIsApplicationModalOpen(false);
  };
  
  // Handle application rejection
  const handleRejectApplication = (id: number, reason: string) => {
    // In a real app, this would make an API call
    console.log(`Rejecting application ${id} with reason: ${reason}`);
    
    // Update the application status
    setApplications(apps => 
      apps.map(app => 
        app.id === id ? { ...app, status: 'rejected', notes: reason } : app
      )
    );
    
    setIsApplicationModalOpen(false);
  };
  
  // Handle business status change
  const handleBusinessStatusChange = (id: number, newStatus: Business['status']) => {
    // In a real app, this would make an API call
    console.log(`Changing business ${id} status to ${newStatus}`);
    
    // Update the business status
    setBusinesses(prevBusinesses => 
      prevBusinesses.map(business => 
        business.id === id ? { ...business, status: newStatus } : business
      )
    );
  };
  
  // Handle viewing business details
  const handleViewBusinessDetails = (business: Business) => {
    setSelectedBusiness(business);
    setIsBusinessDetailModalOpen(true);
  };
  
  // Handle viewing business analytics
  const handleViewBusinessAnalytics = (business: Business) => {
    setSelectedBusiness(business);
    setIsBusinessAnalyticsModalOpen(true);
  };
  
  // Active Businesses Table component
  const ActiveBusinessesTable = () => {
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
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Businesses Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Business')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Owner')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Status')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Programs')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Customers')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Revenue')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Compliance')}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    {t('No businesses found')}
                  </td>
                </tr>
              ) : (
                filteredBusinesses.map((business) => (
                  <tr key={business.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                          {business.logo ? (
                            <img src={business.logo} alt={business.name} className="h-10 w-10 rounded-full" />
                          ) : (
                            business.name.charAt(0)
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{business.name}</div>
                          <div className="text-xs text-gray-500">{business.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {business.owner}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {business.status === 'active' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t('Active')}
                        </span>
                      )}
                      {business.status === 'inactive' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          {t('Inactive')}
                        </span>
                      )}
                      {business.status === 'suspended' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {t('Suspended')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{business.programCount}</div>
                      {business.programCount > 0 && (
                        <div className="text-xs text-gray-500">
                          {t('View Programs')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{business.customerCount.toLocaleString()}</div>
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(business.customerCount / 50, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${business.revenue.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        {business.revenue > 50000 ? t('High Value') : t('Growing')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {business.complianceStatus === 'compliant' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t('Compliant')}
                        </span>
                      )}
                      {business.complianceStatus === 'warning' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {t('Warning')}
                        </span>
                      )}
                      {business.complianceStatus === 'violation' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {t('Violation')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-2">
                        <button
                          onClick={() => handleViewBusinessDetails(business)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('View Details')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewBusinessAnalytics(business)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('View Analytics')}
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewBusinessDetails(business)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('Edit Business')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        {business.status === 'active' && (
                          <button
                            onClick={() => handleBusinessStatusChange(business.id, 'suspended')}
                            className="text-red-600 hover:text-red-900"
                            title={t('Suspend Business')}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        {(business.status === 'inactive' || business.status === 'suspended') && (
                          <button
                            onClick={() => handleBusinessStatusChange(business.id, 'active')}
                            className="text-green-600 hover:text-green-900"
                            title={t('Activate Business')}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
              <Building className="w-6 h-6 text-blue-500 mr-2" />
              {t('Business Management')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('Manage businesses and review applications')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              onClick={() => setIsBusinessAnalyticsModalOpen(true)}
            >
              <BarChart2 className="w-4 h-4 mr-2" />
              {t('Business Analytics')}
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
              <Download className="w-4 h-4 mr-2" />
              {t('Export Data')}
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('applications')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'applications'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                {t('Applications')}
                {applications.filter(a => a.status === 'pending').length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {applications.filter(a => a.status === 'pending').length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('businesses')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'businesses'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                {t('Businesses')}
                <span className="ml-2 bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {businesses.length}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'analytics'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                {t('Analytics')}
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {activeTab === 'applications' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">{t('Business Applications')}</h2>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
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
                    <button className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50">
                      <Filter className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Business')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Owner')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Type')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Submitted')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Status')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredApplications.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                            {t('No applications found')}
                          </td>
                        </tr>
                      ) : (
                        filteredApplications.map((application) => (
                          <tr key={application.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                  {application.name.charAt(0)}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{application.name}</div>
                                  <div className="text-xs text-gray-500">{application.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {application.owner}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-gray-100 text-gray-800">
                                {application.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(application.submittedAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {application.status === 'pending' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {t('Pending')}
                                </span>
                              )}
                              {application.status === 'approved' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {t('Approved')}
                                </span>
                              )}
                              {application.status === 'rejected' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  {t('Rejected')}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end items-center space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedApplication(application);
                                    setIsApplicationModalOpen(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {activeTab === 'businesses' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
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
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Business')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Owner')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Status')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Programs')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Customers')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Revenue')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBusinesses.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                            {t('No businesses found')}
                          </td>
                        </tr>
                      ) : (
                        filteredBusinesses.map((business) => (
                          <tr key={business.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                  {business.logo ? (
                                    <img src={business.logo} alt={business.name} className="h-10 w-10 rounded-full" />
                                  ) : (
                                    business.name.charAt(0)
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{business.name}</div>
                                  <div className="text-xs text-gray-500">{business.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {business.owner}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {business.status === 'active' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {t('Active')}
                                </span>
                              )}
                              {business.status === 'inactive' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  {t('Inactive')}
                                </span>
                              )}
                              {business.status === 'suspended' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {t('Suspended')}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {business.programCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {business.customerCount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${business.revenue.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end items-center space-x-2">
                                <button
                                  onClick={() => handleViewBusinessDetails(business)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title={t('View Details')}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleViewBusinessAnalytics(business)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title={t('View Analytics')}
                                >
                                  <BarChart2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">{t('Business Analytics')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-base font-medium text-gray-900 mb-4">{t('Business Distribution')}</h3>
                    <div className="flex flex-col gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">{t('Food & Beverage')}</span>
                          <span className="text-sm font-medium text-gray-900">32%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '32%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">{t('Retail')}</span>
                          <span className="text-sm font-medium text-gray-900">28%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '28%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">{t('Health & Beauty')}</span>
                          <span className="text-sm font-medium text-gray-900">18%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '18%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">{t('Electronics')}</span>
                          <span className="text-sm font-medium text-gray-900">12%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '12%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">{t('Other')}</span>
                          <span className="text-sm font-medium text-gray-900">10%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '10%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-base font-medium text-gray-900 mb-4">{t('Top Performing Businesses')}</h3>
                    <div className="space-y-4">
                      {businesses
                        .sort((a, b) => b.revenue - a.revenue)
                        .slice(0, 4)
                        .map((business, index) => (
                          <div key={business.id} className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                              {index + 1}
                            </div>
                            <div className="ml-3 flex-1">
                              <div className="flex justify-between items-center">
                                <div className="text-sm font-medium text-gray-900">{business.name}</div>
                                <div className="text-sm font-medium text-gray-900">${business.revenue.toLocaleString()}</div>
                              </div>
                              <div className="flex justify-between items-center text-xs text-gray-500">
                                <div>{business.type}</div>
                                <div>{business.customerCount.toLocaleString()} {t('customers')}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-base font-medium text-gray-900 mb-4">{t('Business Status Overview')}</h3>
                    <div className="space-y-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-4">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">{t('Active Businesses')}</div>
                          <div className="text-xl font-semibold text-gray-900">
                            {businesses.filter(b => b.status === 'active').length}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mr-4">
                          <XCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">{t('Inactive Businesses')}</div>
                          <div className="text-xl font-semibold text-gray-900">
                            {businesses.filter(b => b.status === 'inactive').length}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-4">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">{t('Suspended Businesses')}</div>
                          <div className="text-xl font-semibold text-gray-900">
                            {businesses.filter(b => b.status === 'suspended').length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Here we would include modals for application review, business details, etc. */}
    </AdminLayout>
  );
};

export default AdminBusinesses; 