import React, { useEffect, useState } from 'react';
import { Tab } from '@headlessui/react';
import { 
  getUsersByType, 
  deleteUserPermanently, 
  banUser, 
  restrictUser, 
  activateUser,
  getUserWithDetails,
  getUserActivityLog,
  updateUserPermissions,
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
  RefreshCw,
  Eye,
  Edit,
  Settings,
  Clock,
  Activity,
  Ban,
  Unlock,
  Lock,
  UserCheck,
  UserX,
  MoreVertical,
  Info,
  AlertCircle
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

interface UserTableProps {
  onRefresh: () => void;
}

interface UserDetails {
  user: User;
  activityLog: any[];
  isOpen: boolean;
}

export const UserTables: React.FC<UserTableProps> = ({ onRefresh }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [customers, setCustomers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<User[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ show: boolean; user: User | null }>({ show: false, user: null });
  const [showStatusModal, setShowStatusModal] = useState<{ show: boolean; user: User | null; action: string }>({ show: false, user: null, action: '' });
  const [showPermissionsModal, setShowPermissionsModal] = useState<{ show: boolean; user: User | null }>({ show: false, user: null });

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

  const handleDelete = async (user: User) => {
    setShowDeleteModal({ show: true, user });
  };

  const confirmDelete = async () => {
    if (!showDeleteModal.user) return;
    
    setActionLoading(showDeleteModal.user.id!);
    try {
      const success = await deleteUserPermanently(showDeleteModal.user.id!);
      if (success) {
        // Update the appropriate state based on user type
        const userType = showDeleteModal.user.user_type as 'customer' | 'business' | 'staff';
        if (userType === 'customer') {
          setCustomers(customers.filter(u => u.id !== showDeleteModal.user!.id));
        } else if (userType === 'business') {
          setBusinesses(businesses.filter(u => u.id !== showDeleteModal.user!.id));
        } else if (userType === 'staff') {
          setStaff(staff.filter(u => u.id !== showDeleteModal.user!.id));
        }
        onRefresh();
        setShowDeleteModal({ show: false, user: null });
      } else {
        setError('Failed to delete user');
      }
    } catch (err) {
      setError('An error occurred while deleting the user');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (
    user: User,
    action: 'ban' | 'restrict' | 'activate',
    userType: 'customer' | 'business' | 'staff'
  ) => {
    setShowStatusModal({ show: true, user, action });
  };

  const confirmStatusChange = async () => {
    if (!showStatusModal.user) return;
    
    setActionLoading(showStatusModal.user.id!);
    try {
      let success = false;
      
      switch (showStatusModal.action) {
        case 'ban':
          success = await banUser(showStatusModal.user.id!);
          break;
        case 'restrict':
          success = await restrictUser(showStatusModal.user.id!);
          break;
        case 'activate':
          success = await activateUser(showStatusModal.user.id!);
          break;
      }
      
      if (success) {
        // Update user status in the appropriate state
        const userType = showStatusModal.user.user_type as 'customer' | 'business' | 'staff';
        const updateUserInState = (users: User[], updatedUser: User) => {
          return users.map(u => u.id === updatedUser.id ? { ...u, status: updatedUser.status } : u);
        };
        
        if (userType === 'customer') {
          setCustomers(updateUserInState(customers, { ...showStatusModal.user, status: showStatusModal.action === 'activate' ? 'active' : showStatusModal.action === 'ban' ? 'banned' : 'restricted' }));
        } else if (userType === 'business') {
          setBusinesses(updateUserInState(businesses, { ...showStatusModal.user, status: showStatusModal.action === 'activate' ? 'active' : showStatusModal.action === 'ban' ? 'banned' : 'restricted' }));
        } else if (userType === 'staff') {
          setStaff(updateUserInState(staff, { ...showStatusModal.user, status: showStatusModal.action === 'activate' ? 'active' : showStatusModal.action === 'ban' ? 'banned' : 'restricted' }));
        }
        
        onRefresh();
        setShowStatusModal({ show: false, user: null, action: '' });
      } else {
        setError(`Failed to ${showStatusModal.action} user`);
      }
    } catch (err) {
      setError(`An error occurred while ${showStatusModal.action}ing the user`);
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetails = async (user: User) => {
    try {
      const userDetails = await getUserWithDetails(user.id!);
      const activityLog = await getUserActivityLog(user.id!);
      
      if (userDetails) {
        setSelectedUser({
          user: userDetails,
          activityLog,
          isOpen: true
        });
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError('Failed to load user details');
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'restricted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Restricted
          </span>
        );
      case 'banned':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Banned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Info className="w-3 h-3 mr-1" />
            Unknown
          </span>
        );
    }
  };

  const getActionButtons = (user: User, userType: 'customer' | 'business' | 'staff') => {
    const isActionLoading = actionLoading === user.id;
    
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleViewDetails(user)}
          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
        
        {user.status === 'active' ? (
          <>
            <button
              onClick={() => handleStatusChange(user, 'restrict', userType)}
              disabled={isActionLoading}
              className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors disabled:opacity-50"
              title="Restrict User"
            >
              <Lock className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleStatusChange(user, 'ban', userType)}
              disabled={isActionLoading}
              className="p-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
              title="Ban User"
            >
              <Ban className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => handleStatusChange(user, 'activate', userType)}
            disabled={isActionLoading}
            className="p-1 text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
            title="Activate User"
          >
            <Unlock className="w-4 h-4" />
          </button>
        )}
        
        <button
          onClick={() => handleDelete(user)}
          disabled={isActionLoading}
          className="p-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
          title="Delete User"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const renderUserTable = (users: User[], userType: 'customer' | 'business' | 'staff') => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading users...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading users</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-500">No {userType} users have been created yet.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
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
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 capitalize">{user.user_type}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {getActionButtons(user, userType)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Confirmation Modals */}
      {showDeleteModal.show && showDeleteModal.user && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <AlertOctagon className="mx-auto flex items-center justify-center h-12 w-12 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete User</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to permanently delete <strong>{showDeleteModal.user.name}</strong>? 
                  This action cannot be undone and will remove all associated data.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={confirmDelete}
                  disabled={actionLoading === showDeleteModal.user.id}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === showDeleteModal.user.id ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteModal({ show: false, user: null })}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-24 hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStatusModal.show && showStatusModal.user && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <AlertTriangle className="mx-auto flex items-center justify-center h-12 w-12 text-yellow-600" />
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                {showStatusModal.action === 'ban' ? 'Ban User' : 
                 showStatusModal.action === 'restrict' ? 'Restrict User' : 'Activate User'}
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to {showStatusModal.action} <strong>{showStatusModal.user.name}</strong>?
                  {showStatusModal.action === 'ban' && ' This will prevent them from accessing the platform.'}
                  {showStatusModal.action === 'restrict' && ' This will limit their access to certain features.'}
                  {showStatusModal.action === 'activate' && ' This will restore their full access.'}
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={confirmStatusChange}
                  disabled={actionLoading === showStatusModal.user.id}
                  className={`px-4 py-2 text-white text-base font-medium rounded-md w-24 mr-2 disabled:opacity-50 ${
                    showStatusModal.action === 'ban' ? 'bg-red-600 hover:bg-red-700' :
                    showStatusModal.action === 'restrict' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {actionLoading === showStatusModal.user.id ? 'Updating...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowStatusModal({ show: false, user: null, action: '' })}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-24 hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && selectedUser.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-3/4 shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">User Details</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">User Information</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {selectedUser.user.name}</p>
                  <p><strong>Email:</strong> {selectedUser.user.email}</p>
                  <p><strong>Type:</strong> {selectedUser.user.user_type}</p>
                  <p><strong>Role:</strong> {selectedUser.user.role}</p>
                  <p><strong>Status:</strong> {getStatusBadge(selectedUser.user.status)}</p>
                  <p><strong>Created:</strong> {selectedUser.user.created_at ? new Date(selectedUser.user.created_at).toLocaleString() : 'N/A'}</p>
                  <p><strong>Last Login:</strong> {selectedUser.user.last_login ? new Date(selectedUser.user.last_login).toLocaleString() : 'Never'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Activity Log (Last 30 Days)</h4>
                <div className="max-h-48 overflow-y-auto">
                  {selectedUser.activityLog.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUser.activityLog.slice(0, 10).map((log, index) => (
                        <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                          <p><strong>{log.action}</strong></p>
                          <p className="text-gray-600">{log.details}</p>
                          <p className="text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
               ${selected
                 ? 'bg-white text-blue-700 shadow'
                 : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
               }`
            }
          >
            <div className="flex items-center justify-center">
              <Users className="w-4 h-4 mr-2" />
              Customers ({customers.length})
            </div>
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
               ${selected
                 ? 'bg-white text-blue-700 shadow'
                 : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
               }`
            }
          >
            <div className="flex items-center justify-center">
              <Briefcase className="w-4 h-4 mr-2" />
              Businesses ({businesses.length})
            </div>
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
               ${selected
                 ? 'bg-white text-blue-700 shadow'
                 : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
               }`
            }
          >
            <div className="flex items-center justify-center">
              <Shield className="w-4 h-4 mr-2" />
              Staff ({staff.length})
            </div>
          </Tab>
        </Tab.List>
        <Tab.Panels className="mt-2">
          <Tab.Panel>
            {renderUserTable(customers, 'customer')}
          </Tab.Panel>
          <Tab.Panel>
            {renderUserTable(businesses, 'business')}
          </Tab.Panel>
          <Tab.Panel>
            {renderUserTable(staff, 'staff')}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}; 