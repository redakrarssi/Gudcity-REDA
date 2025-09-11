import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, 
  Plus, 
  UserPlus, 
  Shield, 
  Settings, 
  Trash2, 
  Edit3,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Download
} from 'lucide-react';
import { 
  getStaffUsers, 
  createStaffUser, 
  deleteStaffUser, 
  updateStaffPermissions,
  type User,
  type StaffPermissions,
  createDefaultStaffPermissions
} from '../../services/userService';
import { CreateStaffModal } from '../../components/business/CreateStaffModal';

interface StaffMember extends User {
  permissions: StaffPermissions;
  business_owner_id: number;
}

const Staff: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // State management
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  // Load staff members
  const loadStaffMembers = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const staff = await getStaffUsers(user.id);
      const staffWithPermissions = staff.map(member => ({
        ...member,
        permissions: member.permissions || createDefaultStaffPermissions()
      })) as StaffMember[];
      
      setStaffMembers(staffWithPermissions);
    } catch (err) {
      console.error('Error loading staff members:', err);
      setError('Failed to load staff members. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffMembers();
  }, [user?.id]);

  // Handle staff creation
  const handleCreateStaff = async (staffData: { name: string; email: string; password: string }) => {
    if (!user?.id) return;

    try {
      const newStaff = await createStaffUser(user.id, {
        name: staffData.name,
        email: staffData.email,
        password: staffData.password
      });

      if (newStaff) {
        await loadStaffMembers(); // Reload the list
        setShowCreateModal(false);
      } else {
        setError('Failed to create staff user. Please check if the email is already in use.');
      }
    } catch (err) {
      console.error('Error creating staff user:', err);
      setError('Failed to create staff user. Please try again.');
    }
  };

  // Handle staff deletion
  const handleDeleteStaff = async (staffId: number) => {
    if (!user?.id) return;

    try {
      const success = await deleteStaffUser(staffId, user.id);
      if (success) {
        await loadStaffMembers(); // Reload the list
        setShowDeleteConfirm(null);
      } else {
        setError('Failed to delete staff user.');
      }
    } catch (err) {
      console.error('Error deleting staff user:', err);
      setError('Failed to delete staff user. Please try again.');
    }
  };

  // Handle permission updates
  const handleUpdatePermissions = async (staffId: number, permissions: Partial<StaffPermissions>) => {
    if (!user?.id) return;

    try {
      const success = await updateStaffPermissions(staffId, user.id, permissions);
      if (success) {
        await loadStaffMembers(); // Reload the list
        setShowPermissionsModal(false);
        setSelectedStaff(null);
      } else {
        setError('Failed to update permissions.');
      }
    } catch (err) {
      console.error('Error updating permissions:', err);
      setError('Failed to update permissions. Please try again.');
    }
  };

  // Filter staff members based on search and status
  const filteredStaffMembers = staffMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && member.status === 'active') ||
                         (statusFilter === 'inactive' && member.status !== 'active');
    
    return matchesSearch && matchesStatus;
  });

  // Render loading state
  if (loading) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">{t('Loading staff members...')}</p>
          </div>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-6 h-6 text-blue-500 mr-2" />
              {t('Staff Management')}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('Manage your staff accounts and permissions')}
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t('Add New Staff')}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t('Search staff members...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">{t('All Status')}</option>
                <option value="active">{t('Active')}</option>
                <option value="inactive">{t('Inactive')}</option>
              </select>
              <button className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {t('Staff Members')} ({filteredStaffMembers.length})
            </h2>
          </div>
          
          {filteredStaffMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {staffMembers.length === 0 ? t('No staff members') : t('No matching staff members')}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {staffMembers.length === 0 
                  ? t('Get started by creating your first staff account.')
                  : t('Try adjusting your search or filter criteria.')
                }
              </p>
              {staffMembers.length === 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t('Add Staff Member')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Staff Member')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Role')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Last Active')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Permissions')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStaffMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Shield className="w-3 h-3 mr-1" />
                          {t('Staff')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.status === 'active' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {member.status === 'active' ? t('Active') : t('Inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.last_login 
                          ? new Date(member.last_login).toLocaleDateString()
                          : t('Never')
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedStaff(member);
                            setShowPermissionsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {t('Manage')}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedStaff(member);
                              setShowPermissionsModal(true);
                            }}
                            className="text-gray-600 hover:text-gray-900"
                            title={t('Edit permissions')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(member.id!)}
                            className="text-red-600 hover:text-red-900"
                            title={t('Delete staff member')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Staff Modal */}
        {showCreateModal && (
          <CreateStaffModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateStaff}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  {t('Delete Staff Member')}
                </h3>
              </div>
              <p className="text-gray-600 mb-6">
                {t('Are you sure you want to delete this staff member? This action cannot be undone.')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('Cancel')}
                </button>
                <button
                  onClick={() => handleDeleteStaff(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  {t('Delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
};

export default Staff;
