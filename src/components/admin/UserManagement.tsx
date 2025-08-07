import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, UserX, UserCheck, Building, Search,
  AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';

interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  role?: string;
  user_type?: string;
  business_name?: string;
  business_phone?: string;
  avatar_url?: string;
  reset_token?: string;
  reset_token_expires?: Date;
  last_login?: Date;
  created_at?: Date;
  status?: 'active' | 'banned' | 'restricted';
}

// Mock data for users
const MOCK_USERS: User[] = [
  {
    id: 1,
    name: 'Customer User',
    email: 'customer@example.com',
    role: 'customer',
    user_type: 'customer',
    status: 'active',
    created_at: new Date('2023-05-15T10:30:00Z'),
    last_login: new Date('2023-06-20T14:45:00Z')
  },
  {
    id: 2,
    name: 'Business User',
    email: 'business@example.com',
    role: 'business',
    user_type: 'business',
    status: 'active',
    created_at: new Date('2023-04-20T09:15:00Z'),
    last_login: new Date('2023-06-19T16:30:00Z')
  },
  {
    id: 3,
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    user_type: 'business',
    status: 'active',
    created_at: new Date('2023-01-10T11:00:00Z'),
    last_login: new Date('2023-06-21T10:15:00Z')
  },
  {
    id: 4,
    name: 'Suspended User',
    email: 'suspended@example.com',
    role: 'customer',
    user_type: 'customer',
    status: 'banned',
    created_at: new Date('2023-03-05T14:20:00Z'),
    last_login: new Date('2023-05-30T08:45:00Z')
  }
];

export const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // In a real app, this would be an API call
      // Simulating API latency
      await new Promise(resolve => setTimeout(resolve, 500));
      setUsers(MOCK_USERS);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleRoleFilter = (role: string | null) => {
    setSelectedRole(role === selectedRole ? null : role);
  };

  const handleStatusFilter = (status: string | null) => {
    setSelectedStatus(status === selectedStatus ? null : status);
  };

  const handleUserStatusChange = async (userId: number, newStatus: 'active' | 'banned' | 'restricted') => {
    try {
      // In a real app, this would be an API call
      // Simulating API latency
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !selectedRole || user.role === selectedRole;
    const matchesStatus = !selectedStatus || user.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <Users className="mr-2 h-6 w-6" />
          {t('User Management')}
        </h2>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={t('Search users...')}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => handleRoleFilter('customer')}
          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
            selectedRole === 'customer'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4 mr-1" />
          {t('Customers')}
        </button>
        <button
          onClick={() => handleRoleFilter('business')}
          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
            selectedRole === 'business'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Building className="w-4 h-4 mr-1" />
          {t('Businesses')}
        </button>
        <button
          onClick={() => handleRoleFilter('admin')}
          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
            selectedRole === 'admin'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          {t('Admins')}
        </button>
        <button
          onClick={() => handleStatusFilter('active')}
          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
            selectedStatus === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          {t('Active')}
        </button>
        <button
          onClick={() => handleStatusFilter('suspended')}
          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
            selectedStatus === 'suspended'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <XCircle className="w-4 h-4 mr-1" />
          {t('Suspended')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {t('Email')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {t('Role')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {t('Status')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {t('Created')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {t('Last Login')}
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {t('Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : user.role === 'business'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.last_login).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {user.status === 'active' ? (
                    <button
                      onClick={() => handleUserStatusChange(user.id, 'banned')}
                      className="text-red-600 hover:text-red-900 mr-3"
                    >
                      {t('Suspend')}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUserStatusChange(user.id, 'active')}
                      className="text-green-600 hover:text-green-900 mr-3"
                    >
                      {t('Activate')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 