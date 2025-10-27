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
        {/* ⚠️ DIAGNOSIS SECTION - Data Connectivity Issues */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 p-6 rounded-lg shadow-md">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-amber-600 mt-1 mr-4 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-800 mb-3">
                🟡 DIAGNOSIS: Admin Businesses Page Data Issues
              </h3>
              <div className="space-y-3 text-sm">
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-red-700 mb-2">❌ Problem #1: Delegated Data Fetching Without Clarity</h4>
                  <p className="text-red-900 mb-2"><strong>Current State:</strong> This page delegates all data fetching to the <code className="bg-red-100 px-1 rounded">BusinessTables</code> component (line 238), making it impossible to diagnose connectivity from here.</p>
                  <p className="text-red-900 mb-2"><strong>Why It's Broken:</strong> Parent component has no visibility into how child fetches data - could be direct DB, could be API, could be mixed.</p>
                  <p className="text-red-900"><strong>Impact:</strong> Analytics cards (lines 165-217) show "Loading..." indefinitely until BusinessTables updates them via callback.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-orange-700 mb-2">⚠️ Problem #2: Missing API Endpoint</h4>
                  <p className="text-orange-900 mb-2"><strong>Current State:</strong> No <code className="bg-orange-100 px-1 rounded">api/admin/businesses.ts</code> or catch-all route exists for business management operations.</p>
                  <p className="text-orange-900 mb-2"><strong>Why It's Broken:</strong> BusinessTables likely calls business service directly, which in turn calls database directly from browser.</p>
                  <p className="text-orange-900"><strong>Impact:</strong> Business data fetching bypasses authentication/authorization layers, potential security risk.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-yellow-700 mb-2">⚠️ Problem #3: Callback-Based State Management</h4>
                  <p className="text-yellow-900 mb-2"><strong>Current State:</strong> Uses callbacks <code className="bg-yellow-100 px-1 rounded">onAnalyticsUpdate</code> (line 98) and <code className="bg-yellow-100 px-1 rounded">onConnectionError</code> (line 103) for state lifting.</p>
                  <p className="text-yellow-900 mb-2"><strong>Why It's Broken:</strong> Creates tight coupling between parent and child, makes data flow unpredictable, hard to debug timing issues.</p>
                  <p className="text-yellow-900"><strong>Impact:</strong> Analytics might update before, during, or after BusinessTables loads, causing UI flicker.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-blue-700 mb-2">✅ Solution: Centralize Data Fetching</h4>
                  <ul className="list-disc list-inside text-blue-900 space-y-1">
                    <li>Create <code className="bg-blue-100 px-1 rounded">GET /api/admin/businesses</code> endpoint for listing businesses</li>
                    <li>Create <code className="bg-blue-100 px-1 rounded">GET /api/admin/businesses/analytics</code> for summary stats</li>
                    <li>Use React Query in parent component, pass data down as props to BusinessTables</li>
                    <li>Eliminate callback props, use shared query cache instead</li>
                    <li>Follow fun.md: Consolidate under <code className="bg-blue-100 px-1 rounded">api/admin/[[...path]].ts</code></li>
                  </ul>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md border-2 border-indigo-300">
                  <h4 className="font-semibold text-indigo-700 mb-2">🔍 Investigation Needed</h4>
                  <p className="text-indigo-900 mb-2"><strong>Check BusinessTables Component:</strong> Located at <code className="bg-indigo-100 px-1 rounded">src/components/admin/BusinessTables.tsx</code></p>
                  <p className="text-indigo-900 mb-2"><strong>Likely Issues:</strong> Directly imports businessService, calls <code className="bg-indigo-100 px-1 rounded">sql</code> from db.ts, no API layer.</p>
                  <p className="text-indigo-900"><strong>Quick Test:</strong> Open browser dev tools Network tab - if you don't see API calls to <code className="bg-indigo-100 px-1 rounded">/api/admin/*</code>, it's hitting DB directly.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

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
