import React, { useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { UserForm } from '../../components/UserForm';
import { UserList } from '../../components/UserList';

const UsersPage: React.FC = () => {
  const [refreshList, setRefreshList] = useState(0);

  const handleUserAdded = () => {
    // Increment to trigger useEffect in UserList
    setRefreshList(prev => prev + 1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">User Management</h1>
          <p className="text-gray-500 mt-1">Add and manage users in the system</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <UserForm onUserAdded={handleUserAdded} />
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Users</h2>
              <UserList key={refreshList} />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UsersPage; 