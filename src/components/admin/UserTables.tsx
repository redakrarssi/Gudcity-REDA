import React, { useEffect, useState } from 'react';
import { Tab } from '@headlessui/react';
import { 
  User, 
  getUsersByType, 
  deleteUser, 
  banUser, 
  restrictUser, 
  activateUser,
  ensureDemoUsers
} from '../../services/userService';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  Users, 
  Briefcase, 
  Trash2, 
  AlertOctagon, 
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface UserTableProps {
  onRefresh: () => void;
}

export const UserTables: React.FC<UserTableProps> = ({ onRefresh }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [customers, setCustomers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<User[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const { user: adminUser } = useAuth();

  useEffect(() => {
    console.log('Loading users...');
    loadUsers();
  }, [onRefresh]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    console.log('Fetching users from database...');
    try {
      // First ensure demo users exist
      await ensureDemoUsers();
      console.log('Ensured demo users exist');
      
      const [customerData, businessData, staffData] = await Promise.all([
        getUsersByType('customer'),
        getUsersByType('business'),
        getUsersByType('staff')
      ]);
      
      console.log('Customer data:', customerData);
      console.log('Business data:', businessData);
      console.log('Staff data:', staffData);
      
      setCustomers(customerData);
      setBusinesses(businessData);
      setStaff(staffData);
      
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, userType: 'customer' | 'business' | 'staff') => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      setActionLoading(id);
      try {
        const success = await deleteUser(id);
        if (success) {
          // Update the appropriate state based on user type
          if (userType === 'customer') {
            setCustomers(customers.filter(user => user.id !== id));
          } else if (userType === 'business') {
            setBusinesses(businesses.filter(user => user.id !== id));
          } else if (userType === 'staff') {
            setStaff(staff.filter(user => user.id !== id));
          }
          onRefresh();
        } else {
          setError('Failed to delete user');
        }
      } catch (err) {
        setError('An error occurred while deleting the user');
        console.error(err);
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleStatusChange = async (
    id: number, 
    action: 'ban' | 'restrict' | 'activate',
    userType: 'customer' | 'business' | 'staff'
  ) => {
    setActionLoading(id);
    try {
      let success = false;
      const audit = {
        performedById: adminUser?.id,
        performedByEmail: adminUser?.email,
        reason: action === 'ban' ? 'Violation of terms' : action === 'restrict' ? 'Temporary restriction' : 'Reactivation by admin'
      };
      
      if (action === 'ban') {
        success = await banUser(id, audit);
      } else if (action === 'restrict') {
        success = await restrictUser(id, audit);
      } else if (action === 'activate') {
        success = await activateUser(id, audit);
      }
      
      if (success) {
        // Update the user status in the state
        const newStatus = action === 'activate' ? 'active' : (action === 'ban' ? 'banned' : 'restricted');
        
        if (userType === 'customer') {
          setCustomers(customers.map(user => 
            user.id === id ? { ...user, status: newStatus } : user
          ));
        } else if (userType === 'business') {
          setBusinesses(businesses.map(user => 
            user.id === id ? { ...user, status: newStatus } : user
          ));
        } else if (userType === 'staff') {
          setStaff(staff.map(user => 
            user.id === id ? { ...user, status: newStatus } : user
          ));
        }
        
        onRefresh();
      } else {
        setError(`Failed to ${action} user`);
      }
    } catch (err) {
      setError(`An error occurred while updating user status`);
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Helper to get status badge
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'banned':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            <XCircle className="w-4 h-4 mr-1" /> Banned
          </span>
        );
      case 'restricted':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-4 h-4 mr-1" /> Restricted
          </span>
        );
      default:
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" /> Active
          </span>
        );
    }
  };

  // Table render function
  const renderUserTable = (users: User[], userType: 'customer' | 'business' | 'staff') => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
          <span>Loading users...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          <div className="flex items-center">
            <AlertOctagon className="w-5 h-5 mr-2" />
            {error}
          </div>
          <button 
            onClick={loadUsers}
            className="mt-2 text-blue-600 underline flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Try Again
          </button>
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="text-center p-8 text-gray-500">
          No {userType} users found
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              {userType === 'business' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business Info
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className={`hover:bg-gray-50 ${user.status === 'banned' ? 'bg-red-50' : (user.status === 'restricted' ? 'bg-yellow-50' : '')}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {user.avatar_url ? (
                        <img className="h-10 w-10 rounded-full" src={user.avatar_url} alt="" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      {userType === 'staff' && (
                        <div className="text-xs text-blue-600">
                          {user.role === 'admin' ? 'Administrator' : user.role}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                </td>
                {userType === 'business' && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.business_name}</div>
                    <div className="text-sm text-gray-500">{user.business_phone}</div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {user.status === 'active' && (
                      <>
                        <button
                          onClick={() => user.id && handleStatusChange(user.id, 'restrict', userType)}
                          disabled={actionLoading === user.id}
                          className="text-yellow-600 hover:text-yellow-900 p-1 rounded"
                          title="Restrict Access"
                        >
                          <AlertTriangle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => user.id && handleStatusChange(user.id, 'ban', userType)}
                          disabled={actionLoading === user.id}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Ban User"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    {(user.status === 'banned' || user.status === 'restricted') && (
                      <button
                        onClick={() => user.id && handleStatusChange(user.id, 'activate', userType)}
                        disabled={actionLoading === user.id}
                        className="text-green-600 hover:text-green-900 p-1 rounded"
                        title="Activate User"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => user.id && handleDelete(user.id, userType)}
                      disabled={actionLoading === user.id}
                      className="text-gray-600 hover:text-gray-900 p-1 rounded"
                      title="Delete User"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    {actionLoading === user.id && (
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <Tab.List className="flex bg-gray-100 border-b border-gray-200">
          <Tab 
            className={({ selected }: { selected: boolean }) => 
              `py-3 px-6 text-sm font-medium flex items-center focus:outline-none ${
                selected
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <Users className="w-5 h-5 mr-2" />
            Customers ({customers.length})
          </Tab>
          <Tab 
            className={({ selected }: { selected: boolean }) => 
              `py-3 px-6 text-sm font-medium flex items-center focus:outline-none ${
                selected
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <Briefcase className="w-5 h-5 mr-2" />
            Businesses ({businesses.length})
          </Tab>
          <Tab 
            className={({ selected }: { selected: boolean }) => 
              `py-3 px-6 text-sm font-medium flex items-center focus:outline-none ${
                selected
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <Shield className="w-5 h-5 mr-2" />
            Staff ({staff.length})
          </Tab>
        </Tab.List>
        <Tab.Panels>
          <Tab.Panel>{renderUserTable(customers, 'customer')}</Tab.Panel>
          <Tab.Panel>{renderUserTable(businesses, 'business')}</Tab.Panel>
          <Tab.Panel>{renderUserTable(staff, 'staff')}</Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}; 