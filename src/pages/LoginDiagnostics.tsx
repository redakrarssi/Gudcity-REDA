import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Database, Key, User, Settings, Clock } from 'lucide-react';

interface DiagnosisData {
  timestamp: string;
  userId: string;
  token: string;
  environment: any;
  database: any;
  auth: any;
  user: any;
  session: any;
}

interface DiagnosisResponse {
  success: boolean;
  diagnosis: DiagnosisData;
  summary: {
    overall: 'healthy' | 'issues_found';
    mainIssues: string[];
  };
}

const LoginDiagnostics: React.FC = () => {
  const [diagnosis, setDiagnosis] = useState<DiagnosisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [token, setToken] = useState<string>('');

  // Auto-load stored values
  useEffect(() => {
    const storedUserId = localStorage.getItem('authUserId') || sessionStorage.getItem('userId');
    const storedToken = localStorage.getItem('authToken') || sessionStorage.getItem('token');
    
    if (storedUserId) setUserId(storedUserId);
    if (storedToken) setToken(storedToken);
  }, []);

  const runDiagnosis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/debug/auth-diagnosis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId || undefined,
          token: token || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDiagnosis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run diagnosis');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: boolean | string | undefined) => {
    if (status === true || status === 'valid' || status === 'connected' || status === 'healthy') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (status === false || status === 'invalid' || status === 'failed' || status === 'issues_found') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Authentication Diagnostics</h1>
          <p className="text-gray-600 mb-6">
            Comprehensive diagnosis tool to identify authentication issues
          </p>
          <Link 
            to="/login" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Login
          </Link>
        </div>

        {/* Input Form */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Diagnosis Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID (optional)
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID to check"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auth Token (optional)
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter JWT token to validate"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={runDiagnosis}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running Diagnosis...
              </>
            ) : (
              'Run Full Diagnosis'
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 mr-2" />
              <strong>Diagnosis Failed:</strong> {error}
            </div>
          </div>
        )}

        {/* Results */}
        {diagnosis && (
          <div className="space-y-6">
            {/* Summary */}
            <div className={`p-6 rounded-lg ${
              diagnosis.summary.overall === 'healthy' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center mb-3">
                {getStatusIcon(diagnosis.summary.overall)}
                <h2 className="text-xl font-semibold ml-2">
                  Overall Status: {diagnosis.summary.overall === 'healthy' ? 'Healthy' : 'Issues Found'}
                </h2>
              </div>
              {diagnosis.summary.mainIssues.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Main Issues:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {diagnosis.summary.mainIssues.map((issue, index) => (
                      <li key={index} className="text-red-700">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Environment Check */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Settings className="w-6 h-6 text-blue-500 mr-2" />
                <h3 className="text-lg font-semibold">Environment Configuration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(diagnosis.diagnosis.environment).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium">{key}:</span>
                    <div className="flex items-center">
                      {getStatusIcon(value)}
                      <span className="ml-2">{formatValue(value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Database Check */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Database className="w-6 h-6 text-green-500 mr-2" />
                <h3 className="text-lg font-semibold">Database Connection</h3>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Connection Status:</span>
                    <div className="flex items-center">
                      {getStatusIcon(diagnosis.diagnosis.database.connection?.status === 'connected')}
                      <span className="ml-2">{diagnosis.diagnosis.database.connection?.status || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
                {diagnosis.diagnosis.database.tables && (
                  <div>
                    <h4 className="font-medium mb-2">Database Tables:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(diagnosis.diagnosis.database.tables).map(([table, info]: [string, any]) => (
                        <div key={table} className="p-2 bg-gray-50 rounded text-sm">
                          <div className="flex items-center justify-between">
                            <span>{table}:</span>
                            {getStatusIcon(info.exists)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Authentication Check */}
            {diagnosis.diagnosis.auth && Object.keys(diagnosis.diagnosis.auth).length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Key className="w-6 h-6 text-yellow-500 mr-2" />
                  <h3 className="text-lg font-semibold">Token Authentication</h3>
                </div>
                <div className="space-y-4">
                  {diagnosis.diagnosis.auth.verification && (
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Token Status:</span>
                        <div className="flex items-center">
                          {getStatusIcon(diagnosis.diagnosis.auth.verification.status === 'valid')}
                          <span className="ml-2">{diagnosis.diagnosis.auth.verification.status}</span>
                        </div>
                      </div>
                      {diagnosis.diagnosis.auth.verification.error && (
                        <p className="text-red-600 text-sm">{diagnosis.diagnosis.auth.verification.error}</p>
                      )}
                    </div>
                  )}
                  {diagnosis.diagnosis.auth.tokenStructure && (
                    <div className="p-3 bg-gray-50 rounded">
                      <h4 className="font-medium mb-2">Token Structure:</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(diagnosis.diagnosis.auth.tokenStructure, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* User Check */}
            {diagnosis.diagnosis.user && Object.keys(diagnosis.diagnosis.user).length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <User className="w-6 h-6 text-purple-500 mr-2" />
                  <h3 className="text-lg font-semibold">User Account Status</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">User Exists:</span>
                      <div className="flex items-center">
                        {getStatusIcon(diagnosis.diagnosis.user.exists)}
                        <span className="ml-2">{diagnosis.diagnosis.user.exists ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                  {diagnosis.diagnosis.user.exists && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(diagnosis.diagnosis.user)
                        .filter(([key]) => key !== 'exists')
                        .map(([key, value]) => (
                        <div key={key} className="p-2 bg-gray-50 rounded text-sm">
                          <span className="font-medium">{key}:</span>
                          <span className="ml-2">{formatValue(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Session Check */}
            {diagnosis.diagnosis.session && Object.keys(diagnosis.diagnosis.session).length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Clock className="w-6 h-6 text-indigo-500 mr-2" />
                  <h3 className="text-lg font-semibold">Session Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(diagnosis.diagnosis.session).map(([key, value]) => (
                    <div key={key} className="p-3 bg-gray-50 rounded">
                      <span className="font-medium">{key}:</span>
                      <span className="ml-2">{formatValue(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Data */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Raw Diagnosis Data</h3>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-x-auto">
                {JSON.stringify(diagnosis.diagnosis, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginDiagnostics;
