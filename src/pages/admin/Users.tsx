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

<<<<<<< Current (Your changes)
        {/* User Tables with tabs */}
        <UserTables key={refreshTrigger} mode="customersOnly" onRefresh={() => setRefreshTrigger(prev => prev + 1)} />
=======
        {/* Segmented User Tables with tabs: Customers, Businesses, Staff */}
        <UserTables key={refreshTrigger} onRefresh={() => setRefreshTrigger(prev => prev + 1)} />
>>>>>>> Incoming (Background Agent changes)
      </div>
    </AdminLayout>
  );
};

export default UsersPage; 