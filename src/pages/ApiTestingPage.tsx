import React, { useState, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';

interface TestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  message: string;
  directDbConnection: boolean;
  responseTime?: number;
  error?: string;
}

interface ApiFunction {
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  directDbConnection: boolean;
  testData?: any;
  requiresAuth: boolean;
}

const API_FUNCTIONS: ApiFunction[] = [
  // Authentication Functions (Server-side DB connection via serverless API)
  {
    name: 'User Login',
    description: 'Authenticate user with email and password',
    endpoint: '/auth/login',
    method: 'POST',
    directDbConnection: false,
    requiresAuth: false,
    testData: { email: 'test@example.com', password: 'testpassword123' }
  },
  {
    name: 'User Registration',
    description: 'Register new user account',
    endpoint: '/auth/register',
    method: 'POST',
    directDbConnection: false,
    requiresAuth: false,
    testData: { email: 'newuser@example.com', password: 'securepass123', name: 'Test User' }
  },
  {
    name: 'Token Refresh',
    description: 'Refresh authentication token',
    endpoint: '/auth/refresh',
    method: 'POST',
    directDbConnection: false,
    requiresAuth: false,
    testData: { refreshToken: 'sample-refresh-token' }
  },
  {
    name: 'Get Current User',
    description: 'Get authenticated user profile',
    endpoint: '/auth/me',
    method: 'GET',
    directDbConnection: false,
    requiresAuth: true
  },

  // Business Management Functions (Server-side DB connection via serverless API)
  {
    name: 'List Businesses',
    description: 'Get all businesses with pagination',
    endpoint: '/businesses',
    method: 'GET',
    directDbConnection: false,
    requiresAuth: true
  },
  {
    name: 'Create Business',
    description: 'Create new business profile',
    endpoint: '/businesses',
    method: 'POST',
    directDbConnection: false,
    requiresAuth: true,
    testData: { name: 'Test Business', category: 'retail', description: 'Test business for API' }
  },
  {
    name: 'Get Business Details',
    description: 'Get specific business information',
    endpoint: '/businesses/1',
    method: 'GET',
    directDbConnection: false,
    requiresAuth: true
  },
  {
    name: 'Update Business',
    description: 'Update business profile',
    endpoint: '/businesses/1',
    method: 'PUT',
    directDbConnection: false,
    requiresAuth: true,
    testData: { name: 'Updated Business Name' }
  },

  // Customer Management Functions (Server-side DB connection via serverless API)
  {
    name: 'List Customers',
    description: 'Get all customers with filtering',
    endpoint: '/customers',
    method: 'GET',
    directDbConnection: false,
    requiresAuth: true
  },
  {
    name: 'Create Customer',
    description: 'Create new customer profile',
    endpoint: '/customers',
    method: 'POST',
    directDbConnection: false,
    requiresAuth: true,
    testData: { name: 'Test Customer', email: 'customer@example.com' }
  },
  {
    name: 'Get Customer Details',
    description: 'Get specific customer information',
    endpoint: '/customers/1',
    method: 'GET',
    directDbConnection: false,
    requiresAuth: true
  },
  {
    name: 'Get Customer Programs',
    description: 'Get customer enrolled programs',
    endpoint: '/customers/1/programs',
    method: 'GET',
    directDbConnection: false,
    requiresAuth: true
  },

  // Points & Transactions Functions (Server-side DB connection via serverless API)
  {
    name: 'Award Points',
    description: 'Award points to customer',
    endpoint: '/points/award',
    method: 'POST',
    directDbConnection: false,
    requiresAuth: true,
    testData: { customerId: 1, programId: 1, points: 10, description: 'Test points award' }
  },
  {
    name: 'Redeem Points',
    description: 'Redeem customer points',
    endpoint: '/points/redeem',
    method: 'POST',
    directDbConnection: false,
    requiresAuth: true,
    testData: { customerId: 1, programId: 1, points: 5, rewardDescription: 'Test reward' }
  },
  {
    name: 'Get Points Balance',
    description: 'Get customer points balance',
    endpoint: '/points/balance?customerId=1',
    method: 'GET',
    directDbConnection: false,
    requiresAuth: true
  },
  {
    name: 'Calculate Points',
    description: 'Calculate points for purchase',
    endpoint: '/points/calculate',
    method: 'POST',
    directDbConnection: false,
    requiresAuth: true,
    testData: { programId: 1, purchaseAmount: 50.00, isFirstPurchase: false }
  },

  // QR Operations Functions (Server-side DB connection via serverless API)
  {
    name: 'Generate QR Code',
    description: 'Generate QR code for customer',
    endpoint: '/qr/generate',
    method: 'POST',
    directDbConnection: false,
    requiresAuth: true,
    testData: { customerId: 1, businessId: 1, programId: 1 }
  },
  {
    name: 'Validate QR Code',
    description: 'Validate QR code data',
    endpoint: '/qr/validate',
    method: 'POST',
    directDbConnection: false,
    requiresAuth: true,
    testData: { qrData: '{"id":"test","customerId":1}' }
  },
  {
    name: 'Scan QR Code',
    description: 'Process QR code scan',
    endpoint: '/qr/scan',
    method: 'POST',
    directDbConnection: false,
    requiresAuth: true,
    testData: { qrUniqueId: 'test-qr-id' }
  },

  // Notifications Functions (Server-side DB connection via serverless API)
  {
    name: 'Get Notifications',
    description: 'Get user notifications',
    endpoint: '/notifications',
    method: 'GET',
    directDbConnection: false,
    requiresAuth: true
  },
  {
    name: 'Create Notification',
    description: 'Create new notification',
    endpoint: '/notifications',
    method: 'POST',
    directDbConnection: false,
    requiresAuth: true,
    testData: { customerId: 1, businessId: 1, type: 'INFO', title: 'Test', message: 'Test notification' }
  },
  {
    name: 'Mark as Read',
    description: 'Mark notification as read',
    endpoint: '/notifications/test-id/read',
    method: 'PUT',
    directDbConnection: false,
    requiresAuth: true
  },
  {
    name: 'Get Notification Stats',
    description: 'Get notification statistics',
    endpoint: '/notifications/stats',
    method: 'GET',
    directDbConnection: false,
    requiresAuth: true
  },

  // Health & Monitoring (Server-side DB connection via serverless API)
  {
    name: 'Health Check',
    description: 'Check API and database health',
    endpoint: '/health',
    method: 'GET',
    directDbConnection: false,
    requiresAuth: false
  },

  // Legacy Functions (DEPRECATED - Direct DB connections)
  {
    name: 'Legacy SQL Query',
    description: 'DEPRECATED: Direct database query (should not be used)',
    endpoint: 'N/A - Legacy Function',
    method: 'GET',
    directDbConnection: true,
    requiresAuth: false
  }
];

export default function ApiTestingPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);

  const updateResult = useCallback((functionName: string, result: Partial<TestResult>) => {
    setResults(prev => ({
      ...prev,
      [functionName]: { ...prev[functionName], ...result } as TestResult
    }));
  }, []);

  const testFunction = async (apiFunction: ApiFunction) => {
    const { name, endpoint, method, testData, requiresAuth } = apiFunction;
    
    updateResult(name, { status: 'testing', message: 'Testing...', directDbConnection: apiFunction.directDbConnection });

    // Skip legacy functions
    if (endpoint === 'N/A - Legacy Function') {
      updateResult(name, {
        status: 'error',
        message: 'DEPRECATED: Legacy function with direct DB access should not be used',
        error: 'This function has been deprecated in favor of serverless API',
        directDbConnection: true
      });
      return;
    }

    const startTime = Date.now();

    try {
      let response;
      const config = requiresAuth ? {} : {}; // Auth handled by apiClient automatically

      switch (method) {
        case 'GET':
          response = await apiClient.get(endpoint);
          break;
        case 'POST':
          response = await apiClient.post(endpoint, testData);
          break;
        case 'PUT':
          response = await apiClient.put(endpoint, testData);
          break;
        case 'DELETE':
          response = await apiClient.delete(endpoint);
          break;
        default:
          throw new Error('Unsupported HTTP method');
      }

      const responseTime = Date.now() - startTime;

      if (response.success) {
        updateResult(name, {
          status: 'success',
          message: 'API connection successful',
          responseTime,
          directDbConnection: apiFunction.directDbConnection
        });
      } else {
        updateResult(name, {
          status: 'error',
          message: 'API connection failed',
          error: response.error || 'Unknown error',
          responseTime,
          directDbConnection: apiFunction.directDbConnection
        });
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      updateResult(name, {
        status: 'error',
        message: 'API connection failed',
        error: error.message || 'Network error',
        responseTime,
        directDbConnection: apiFunction.directDbConnection
      });
    }
  };

  const testAllFunctions = async () => {
    setIsTestingAll(true);
    
    // Reset all results
    const initialResults: Record<string, TestResult> = {};
    API_FUNCTIONS.forEach(func => {
      initialResults[func.name] = {
        status: 'idle',
        message: 'Waiting...',
        directDbConnection: func.directDbConnection
      };
    });
    setResults(initialResults);

    // Test functions sequentially to avoid overwhelming the API
    for (const apiFunction of API_FUNCTIONS) {
      await testFunction(apiFunction);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsTestingAll(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'testing':
        return '🔄';
      default:
        return '⚪';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'testing':
        return 'text-blue-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">API Testing Dashboard</h1>
          <p className="mt-2 text-lg text-gray-600">
            Test all serverless API functions and monitor database connections
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Migration Status:</strong> All functions now use serverless API architecture. 
              Direct DB connections have been replaced with secure API calls.
            </p>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Test Controls</h2>
              <p className="text-sm text-gray-600">Test individual functions or run all tests</p>
            </div>
            <button
              onClick={testAllFunctions}
              disabled={isTestingAll}
              className={`px-6 py-3 rounded-lg font-medium ${
                isTestingAll
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white transition-colors`}
            >
              {isTestingAll ? 'Testing All Functions...' : 'Test All Functions'}
            </button>
          </div>
        </div>

        {/* Functions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {API_FUNCTIONS.map((apiFunction, index) => {
            const result = results[apiFunction.name];
            const isLegacy = apiFunction.directDbConnection;
            
            return (
              <div
                key={index}
                className={`bg-white rounded-lg shadow-sm border-l-4 ${
                  isLegacy ? 'border-red-400' : 'border-green-400'
                } p-6`}
              >
                {/* Function Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {apiFunction.name}
                    {isLegacy && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">LEGACY</span>}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{apiFunction.description}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    <span className="bg-gray-100 px-2 py-1 rounded mr-2">{apiFunction.method}</span>
                    <span>{apiFunction.endpoint}</span>
                  </div>
                </div>

                {/* Test Button */}
                <button
                  onClick={() => testFunction(apiFunction)}
                  disabled={result?.status === 'testing' || isTestingAll}
                  className={`w-full py-2 px-4 rounded-md font-medium mb-4 ${
                    result?.status === 'testing' || isTestingAll
                      ? 'bg-gray-400 cursor-not-allowed'
                      : isLegacy
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white transition-colors`}
                >
                  {result?.status === 'testing' ? 'Testing...' : 'Test Function'}
                </button>

                {/* Results */}
                {result && (
                  <div className="space-y-3">
                    {/* API Connection Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">API Status:</span>
                      <div className={`flex items-center gap-2 ${getStatusColor(result.status)}`}>
                        <span>{getStatusIcon(result.status)}</span>
                        <span className="text-sm">{result.message}</span>
                      </div>
                    </div>

                    {/* Response Time */}
                    {result.responseTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Response Time:</span>
                        <span className="text-sm text-gray-600">{result.responseTime}ms</span>
                      </div>
                    )}

                    {/* Direct DB Connection Info */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Direct DB Connection:</span>
                      <div className="flex items-center gap-2">
                        <span>{result.directDbConnection ? '❌' : '✅'}</span>
                        <span className={`text-sm ${result.directDbConnection ? 'text-red-600' : 'text-green-600'}`}>
                          {result.directDbConnection ? 'Yes (Legacy)' : 'No (Serverless API)'}
                        </span>
                      </div>
                    </div>

                    {/* Error Details */}
                    {result.error && (
                      <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                        <p className="text-xs text-red-700">
                          <strong>Error:</strong> {result.error}
                        </p>
                      </div>
                    )}

                    {/* Auth Requirement */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Requires Auth:</span>
                      <span className={`text-sm ${apiFunction.requiresAuth ? 'text-orange-600' : 'text-gray-600'}`}>
                        {apiFunction.requiresAuth ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Default state when no result */}
                {!result && (
                  <div className="space-y-3 text-sm text-gray-500">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Status:</span>
                      <span>Not tested</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Direct DB Connection:</span>
                      <div className="flex items-center gap-2">
                        <span>{apiFunction.directDbConnection ? '❌' : '✅'}</span>
                        <span className={apiFunction.directDbConnection ? 'text-red-600' : 'text-green-600'}>
                          {apiFunction.directDbConnection ? 'Yes (Legacy)' : 'No (Serverless API)'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Migration Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {API_FUNCTIONS.filter(f => !f.directDbConnection).length}
              </div>
              <div className="text-sm text-gray-600">Serverless API Functions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {API_FUNCTIONS.filter(f => f.directDbConnection).length}
              </div>
              <div className="text-sm text-gray-600">Legacy Direct DB Functions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.values(results).filter(r => r?.status === 'success').length}
              </div>
              <div className="text-sm text-gray-600">Successful Tests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Object.values(results).filter(r => r?.status === 'error').length}
              </div>
              <div className="text-sm text-gray-600">Failed Tests</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
