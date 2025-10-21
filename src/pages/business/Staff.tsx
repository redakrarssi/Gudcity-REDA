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
  type User
} from '../../services/userService';

// TODO: Staff management functions need to be implemented via API
// These functions were removed during API migration and need new endpoints:
// - getStaffUsers, createStaffUser, deleteStaffUser, updateStaffUser, updateStaffPermissions

// Temporary type definitions
type StaffPermissions = Record<string, boolean>;
const createDefaultStaffPermissions = (): StaffPermissions => ({});

// Temporary stub functions until API endpoints are implemented
const createStaffUser = async (businessId: number, data: any): Promise<any> => {
  throw new Error('Staff creation API endpoint not yet implemented');
};
const deleteStaffUser = async (staffId: number, businessId: number): Promise<boolean> => {
  throw new Error('Staff deletion API endpoint not yet implemented');
};
const updateStaffUser = async (staffId: number, businessId: number, data: any): Promise<boolean> => {
  throw new Error('Staff update API endpoint not yet implemented');
};
const updateStaffPermissions = async (staffId: number, businessId: number, permissions: StaffPermissions): Promise<boolean> => {
  throw new Error('Staff permissions API endpoint not yet implemented');
};
import { getBusinessId } from '../../utils/businessContext';
import { CreateStaffModal } from '../../components/business/CreateStaffModal';
import { EditStaffModal } from '../../components/business/EditStaffModal';

interface StaffMember extends User {
  permissions: StaffPermissions;
  business_owner_id: number;
}

const Staff: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = (i18n?.language || '').startsWith('ar');
  const { user } = useAuth();
  
  // State management
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  // Success message handler with auto-dismiss
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setError(null); // Clear any existing errors
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

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
      
      // TODO: Implement staff loading via API
      // const businessId = getBusinessId(user);
      // const response = await ApiClient.get(`/api/business/${businessId}/staff`);
      // setStaffMembers(response.staff || []);
      
      // Temporarily show empty list until API endpoint is implemented
      setStaffMembers([]);
      setError('Staff management API endpoint is being implemented. This feature will be available soon.');
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
      const businessId = getBusinessId(user);
      const newStaff = await createStaffUser(businessId!, {
        name: staffData.name,
        email: staffData.email,
        password: staffData.password
      });

      if (newStaff) {
        await loadStaffMembers(); // Reload the list
        setShowCreateModal(false);
        showSuccessMessage(`🎉 New staff member "${staffData.name}" has been created successfully!`);
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
      // Get staff member name before deletion for success message
      const staffMember = staffMembers.find(member => member.id === staffId);
      const staffName = staffMember?.name || 'Staff member';
      
      const businessId = getBusinessId(user);
      const success = await deleteStaffUser(staffId, businessId!);
      if (success) {
        await loadStaffMembers(); // Reload the list
        setShowDeleteConfirm(null);
        showSuccessMessage(`🗑️ "${staffName}" has been removed from your staff successfully.`);
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
      const businessId = getBusinessId(user);
      const success = await updateStaffPermissions(staffId, businessId!, permissions);
      if (success) {
        await loadStaffMembers(); // Reload the list
        setShowPermissionsModal(false);
        setSelectedStaff(null);
        
        // Get staff member name for success message
        const staffMember = staffMembers.find(member => member.id === staffId);
        const staffName = staffMember?.name || 'Staff member';
        showSuccessMessage(`🔑 "${staffName}'s" permissions have been updated successfully!`);
      } else {
        setError('Failed to update permissions.');
      }
    } catch (err) {
      console.error('Error updating permissions:', err);
      setError('Failed to update permissions. Please try again.');
    }
  };

  // Handle edit staff
  const handleEditStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setShowEditModal(true);
  };

  // Handle staff update - ENHANCED ERROR HANDLING
  const handleUpdateStaff = async (staffId: number, updatedData: {
    name?: string;
    email?: string;
    password?: string;
    permissions?: StaffPermissions;
  }) => {
    if (!user?.id) {
      setError('Authentication required. Please log in again.');
      return;
    }

    try {
      const businessId = getBusinessId(user);
      if (!businessId) {
        setError('Business context not found. Please try refreshing the page.');
        return;
      }

      console.log('Attempting to update staff user:', staffId, 'with data:', {
        hasName: !!updatedData.name,
        hasEmail: !!updatedData.email,
        hasPassword: !!updatedData.password,
        hasPermissions: !!updatedData.permissions,
        name: updatedData.name,
        email: updatedData.email,
        permissionKeys: updatedData.permissions ? Object.keys(updatedData.permissions) : []
      });

      const success = await updateStaffUser(staffId, businessId, updatedData);
      
      if (success) {
        console.log('Staff user updated successfully');
        await loadStaffMembers(); // Reload the list
        setShowEditModal(false);
        setSelectedStaff(null);
        
        // Show success notification
        let successMsg = `✅ Staff member updated successfully!`;
        if (updatedData.name && updatedData.email) {
          successMsg = `✅ ${updatedData.name}'s profile has been updated successfully!`;
        } else if (updatedData.name) {
          successMsg = `✅ ${updatedData.name}'s information has been updated!`;
        } else if (updatedData.email) {
          successMsg = `✅ Staff member's email has been updated to ${updatedData.email}!`;
        } else if (updatedData.password) {
          successMsg = `✅ Staff member's password has been updated successfully!`;
        } else if (updatedData.permissions) {
          successMsg = `✅ Staff member's permissions have been updated!`;
        }
        
        showSuccessMessage(successMsg);
      } else {
        console.error('❌ FRONTEND: Staff update failed - check console for detailed diagnostics');
        
        // Enhanced diagnostic error message
        let errorMessage = '🔍 DIAGNOSTIC ERROR: Failed to update staff user.\n\n';
        
        errorMessage += '📊 ATTEMPTED UPDATE:\n';
        if (updatedData.name) errorMessage += `• Name: "${updatedData.name}"\n`;
        if (updatedData.email) errorMessage += `• Email: "${updatedData.email}"\n`;
        if (updatedData.password) errorMessage += `• Password: [PROVIDED]\n`;
        if (updatedData.permissions) errorMessage += `• Permissions: [${Object.keys(updatedData.permissions).length} changes]\n`;
        
        errorMessage += '\n🔍 CHECK CONSOLE for detailed step-by-step diagnostics.\n\n';
        errorMessage += '💡 Common issues:\n';
        
        if (updatedData.email) {
          errorMessage += '• Email may already be in use by another user\n';
          errorMessage += '• Email format validation failed\n';
        }
        
        if (updatedData.password) {
          errorMessage += '• Password must be ≥8 chars with uppercase, lowercase, and numbers\n';
        }
        
        if (updatedData.name && updatedData.name.trim().length < 2) {
          errorMessage += '• Name must be 2-100 characters long\n';
        }
        
        errorMessage += '\n📝 Review the detailed diagnostics in browser console (F12) for exact failure point.';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Error updating staff user:', err);
      
      // Enhanced error handling with specific messages
      let errorMessage = 'Failed to update staff user. ';
      
      if (err instanceof Error) {
        // Don't expose sensitive error details to UI, but log them for debugging
        console.error('Detailed error:', err.message);
        
        if (err.message.includes('network') || err.message.includes('connection')) {
          errorMessage += 'Network connection error. Please check your internet connection and try again.';
        } else if (err.message.includes('validation') || err.message.includes('invalid')) {
          errorMessage += 'Invalid input data. Please check your entries and try again.';
        } else if (err.message.includes('permission') || err.message.includes('unauthorized')) {
          errorMessage += 'You do not have permission to perform this action.';
        } else {
          errorMessage += 'An unexpected error occurred. Please try again or contact support if the problem persists.';
        }
      } else {
        errorMessage += 'An unexpected error occurred. Please try again.';
      }
      
      setError(errorMessage);
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
        <div className={`flex flex-col md:flex-row md:items-center md:justify-between ${isArabic ? 'md:flex-row-reverse' : ''}`}>
          <div>
            <h1 className={`text-2xl font-bold text-gray-900 flex items-center ${isArabic ? 'justify-end' : ''}`}>
              <Users className={`w-6 h-6 text-blue-500 ${isArabic ? 'ml-2' : 'mr-2'}`} />
              {t('Staff Management')}
            </h1>
            <p className={`text-gray-600 mt-1 ${isArabic ? 'text-right' : ''}`}>
              {t('Manage your staff accounts and permissions')}
            </p>
          </div>
          <div className={`mt-4 md:mt-0 ${isArabic ? 'md:self-start' : ''}`}>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
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

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
              <p className="text-green-700 font-medium">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-auto text-green-500 hover:text-green-700 font-bold text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className={`bg-white rounded-lg shadow p-6 ${isArabic ? 'text-right' : ''}`}>
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
            <div className="relative flex-1">
              <Search className={`absolute ${isArabic ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4`} />
              <input
                type="text"
                placeholder={t('Search staff members...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${isArabic ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
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
              <h3 className={`mt-2 text-sm font-medium text-gray-900 ${isArabic ? 'text-right' : ''}`}>
                {staffMembers.length === 0 ? t('No staff members') : t('No matching staff members')}
              </h3>
              <p className={`mt-1 text-sm text-gray-500 ${isArabic ? 'text-right' : ''}`}>
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
                    <UserPlus className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
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
                            onClick={() => handleEditStaff(member)}
                            className="text-blue-600 hover:text-blue-900"
                            title={t('Edit staff info')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStaff(member);
                              setShowPermissionsModal(true);
                            }}
                            className="text-gray-600 hover:text-gray-900"
                            title={t('Edit permissions')}
                          >
                            <Settings className="w-4 h-4" />
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

        {/* Edit Staff Modal */}
        <EditStaffModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedStaff(null);
          }}
          onSubmit={handleUpdateStaff}
          staffMember={selectedStaff}
        />

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
