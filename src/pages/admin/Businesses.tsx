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
  Building,
  Database,
  Wifi,
  WifiOff,
  Search,
  Filter,
  RefreshCw,
  Star,
  Calendar,
  TrendingUp,
  Info
} from 'lucide-react';
import api from '../../api/api';
import { formatDate, formatDateTime, formatRegistrationDuration } from '../../utils/dateUtils';
import BusinessHeader from '../../components/admin/BusinessHeader';
import BusinessDetails from '../../components/admin/BusinessDetails';
import { BusinessTables } from '../../components/admin/BusinessTables';

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

interface BusinessAnalytics {
  totalBusinesses: number;
  activeBusinesses: number;
  totalPrograms: number;
  newThisMonth: number;
}

const AdminBusinesses = () => {
  const { t } = useTranslation();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [analytics, setAnalytics] = useState<BusinessAnalytics | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | null>(null);

  const handleBusinessAdded = () => {
    // Increment to trigger refresh in BusinessTables
    setRefreshTrigger(prev => prev + 1);
    setShowBusinessForm(false);
  };

  const handleAnalyticsUpdate = (newAnalytics: BusinessAnalytics) => {
    setAnalytics(newAnalytics);
    setConnectionStatus('connected');
  };

  const handleConnectionError = () => {
    setConnectionStatus('error');
  };


  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
              <Building className="w-6 h-6 mr-2 text-blue-600" />
              Business Management
            </h1>
            <p className="text-gray-500 mt-1">Manage registered businesses, view their programs, and track registration analytics</p>
          </div>
          <button 
            onClick={() => setShowBusinessForm(!showBusinessForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Building className="w-5 h-5 mr-1" />
            {showBusinessForm ? 'Hide Form' : 'Add Business'}
          </button>
        </div>

        {showBusinessForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-blue-600" />
              Add New Business
            </h2>
            {/* Business form would go here - similar to UserForm */}
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-gray-600">Business registration form will be implemented here</p>
            </div>
          </div>
        )}
        
        {/* Info card explaining business analytics */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Business Management Features:</span>
                <br />
                <strong>Overview:</strong> View all registered businesses with their programs and customer counts
                <br />
                <strong>Programs:</strong> See loyalty programs created by each business with status and creation dates
                <br />
                <strong>Analytics:</strong> Track registration duration, customer enrollment, and business activity
                <br />
                <strong>Management:</strong> Filter by business type, status, and search by name or email
              </p>
            </div>
          </div>
        </div>

        {/* Business Analytics Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Businesses</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics ? analytics.totalBusinesses.toLocaleString() : (
                    <span className="animate-pulse">Loading...</span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Businesses</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics ? analytics.activeBusinesses.toLocaleString() : (
                    <span className="animate-pulse">Loading...</span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Programs</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics ? analytics.totalPrograms.toLocaleString() : (
                    <span className="animate-pulse">Loading...</span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">New This Month</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics ? `+${analytics.newThisMonth}` : (
                    <span className="animate-pulse">Loading...</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Business Tables - similar to UserTables but for businesses */}
        {/* Connection Status Banner */}
        {connectionStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-md">
            <div className="flex items-center">
              <WifiOff className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <p className="text-sm text-red-700 font-medium">API Connection Issue</p>
                <p className="text-xs text-red-600 mt-1">
                  Unable to connect to business data API. Check debug panel below for details.
                </p>
              </div>
            </div>
          </div>
        )}

        <BusinessTables 
          key={refreshTrigger} 
          onRefresh={() => setRefreshTrigger(prev => prev + 1)} 
          onAnalyticsUpdate={handleAnalyticsUpdate}
          onConnectionError={handleConnectionError}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminBusinesses;
