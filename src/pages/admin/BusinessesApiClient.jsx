import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import axios from 'axios';

// Simple API client for testing connection to our fixed API server
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Temporary token generation for testing (in production, this would come from authentication flow)
function getTestToken() {
  // This is just for testing purposes, would normally come from login flow
  return localStorage.getItem('auth_token') || 'dummy_token_for_testing';
}

const BusinessesApiClient = () => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('Checking API connection...');

  // Test API health
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const response = await axios.get(`${API_URL}/health`);
        if (response.data && response.data.status === 'ok') {
          setApiStatus(`API Connected: ${API_URL}`);
        } else {
          setApiStatus('API responded but status is not ok');
        }
      } catch (error) {
        setApiStatus(`API Connection Error: ${error.message}`);
        setError(`API Connection Error: ${error.message}`);
      }
    };

    checkApiHealth();
  }, []);

  // Load businesses from API
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setLoading(true);
        const token = getTestToken();
        
        const response = await axios.get(`${API_URL}/admin/businesses`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data && response.data.businesses) {
          setBusinesses(response.data.businesses);
        } else {
          setError('API returned unexpected response format');
        }
      } catch (error) {
        console.error('Error fetching businesses:', error);
        setError(`Error fetching businesses: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (apiStatus.includes('Connected')) {
      fetchBusinesses();
    }
  }, [apiStatus]);

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="sm:flex sm:justify-between sm:items-center mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Business Management</h1>
            <p className="text-sm text-gray-600 mt-1">{apiStatus}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-bold">API Error</p>
            <p>{error}</p>
            <div className="mt-2">
              <p className="font-bold">Troubleshooting:</p>
              <ol className="list-decimal list-inside ml-4">
                <li>Ensure API server is running on port 3000</li>
                <li>Check your .env file has VITE_JWT_SECRET set</li>
                <li>Run the server-fix.js script to set up environment</li>
                <li>Restart the API server with: node start-api-server.js</li>
                <li>Check the API server console for any errors</li>
              </ol>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading businesses...</p>
          </div>
        ) : (
          <>
            {businesses.length === 0 ? (
              <div className="bg-white shadow overflow-hidden rounded-lg p-6 text-center">
                <p className="text-gray-600">No businesses found</p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Programs</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {businesses.map((business) => (
                      <tr key={business.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full"></div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{business.name}</div>
                              <div className="text-sm text-gray-500">{business.owner}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{business.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            business.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {business.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{business.programCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default BusinessesApiClient;
