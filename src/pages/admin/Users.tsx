import React, { useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { UserForm } from '../../components/UserForm';
import { UserTables } from '../../components/admin/UserTables';
import { PlusCircle, Users, Info } from 'lucide-react';

const UsersPage: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const handleUserAdded = () => {
    // Increment to trigger refresh in UserTables
    setRefreshTrigger(prev => prev + 1);
    setShowForm(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ⚠️ DIAGNOSIS SECTION - Data Connectivity Issues */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500 p-6 rounded-lg shadow-md">
          <div className="flex items-start">
            <XCircle className="w-6 h-6 text-purple-600 mt-1 mr-4 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-purple-800 mb-3">
                🟣 DIAGNOSIS: Admin Users Page Data Issues
              </h3>
              <div className="space-y-3 text-sm">
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-red-700 mb-2">❌ Problem #1: Component Responsibility Confusion</h4>
                  <p className="text-red-900 mb-2"><strong>Current State:</strong> Page is a thin wrapper around <code className="bg-red-100 px-1 rounded">UserTables</code> (line 65) and <code className="bg-red-100 px-1 rounded">UserForm</code> (line 40) components that handle all data operations.</p>
                  <p className="text-red-900 mb-2"><strong>Why It's Broken:</strong> Business logic scattered across multiple components, no single source of truth for user data.</p>
                  <p className="text-red-900"><strong>Impact:</strong> When UserForm creates a user, it manually triggers refresh (line 13) in UserTables, creating race conditions.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-orange-700 mb-2">⚠️ Problem #2: No User Management API Endpoint</h4>
                  <p className="text-orange-900 mb-2"><strong>Current State:</strong> No dedicated <code className="bg-orange-100 px-1 rounded">api/users</code> or <code className="bg-orange-100 px-1 rounded">api/admin/users</code> endpoint exists (check vercel.json in fun.md - only shows 11 functions).</p>
                  <p className="text-orange-900 mb-2"><strong>Why It's Broken:</strong> UserService likely accesses database directly via <code className="bg-orange-100 px-1 rounded">sql</code> tagged template from client-side code.</p>
                  <p className="text-orange-900"><strong>Impact:</strong> User list may fail to load, create/update/delete operations expose database structure to frontend.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-yellow-700 mb-2">⚠️ Problem #3: Manual Refresh Mechanism</h4>
                  <p className="text-yellow-900 mb-2"><strong>Current State:</strong> Uses <code className="bg-yellow-100 px-1 rounded">refreshTrigger</code> state (line 8) incremented on user changes to force re-render of UserTables.</p>
                  <p className="text-yellow-900 mb-2"><strong>Why It's Broken:</strong> Primitive refresh pattern instead of reactive data synchronization. Other components won't know users changed.</p>
                  <p className="text-yellow-900"><strong>Impact:</strong> User count in Admin Dashboard stays stale even after creating users here.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-blue-700 mb-2">✅ Solution: Implement User Management API</h4>
                  <ul className="list-disc list-inside text-blue-900 space-y-1">
                    <li>Create <code className="bg-blue-100 px-1 rounded">GET/POST/PUT/DELETE /api/admin/users</code> with admin auth</li>
                    <li>Add <code className="bg-blue-100 px-1 rounded">GET /api/admin/users/[id]</code> for individual user details</li>
                    <li>Use React Query mutations with cache invalidation</li>
                    <li>Replace <code className="bg-blue-100 px-1 rounded">refreshTrigger</code> with <code className="bg-blue-100 px-1 rounded">queryClient.invalidateQueries(['users'])</code></li>
                    <li>Follow fun.md: Merge into <code className="bg-blue-100 px-1 rounded">api/admin/[[...path]].ts</code> catch-all</li>
                  </ul>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md border-2 border-red-300">
                  <h4 className="font-semibold text-red-700 mb-2">🚨 Security Risk</h4>
                  <p className="text-red-900 mb-2"><strong>Critical Issue:</strong> If UserForm and UserTables directly query database, malicious users can inspect network traffic or source code to find database schema.</p>
                  <p className="text-red-900"><strong>Attack Vector:</strong> Could craft SQL injection payloads or bypass role checks by modifying requests.</p>
                  <p className="text-red-900"><strong>Urgent Fix:</strong> All user operations MUST go through authenticated API endpoints with server-side validation.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">User Management</h1>
            <p className="text-gray-500 mt-1">Manage, restrict, or ban users in the system</p>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="w-5 h-5 mr-1" />
            {showForm ? 'Hide Form' : 'Add User'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              Add New User
            </h2>
            <UserForm onUserAdded={handleUserAdded} />
          </div>
        )}
        
        {/* Info card */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <span className="font-medium">User statuses explained:</span>
                <br />
                <strong>Active:</strong> Full access to platform features
                <br />
                <strong>Restricted:</strong> Limited access (can login but certain features are disabled)
                <br />
                <strong>Banned:</strong> No access (cannot login to the platform)
              </p>
            </div>
          </div>
        </div>

        {/* Segmented User Tables with tabs: Customers, Businesses, Staff */}
        <UserTables key={refreshTrigger} onRefresh={() => setRefreshTrigger(prev => prev + 1)} />
      </div>
    </AdminLayout>
  );
};

export default UsersPage; 