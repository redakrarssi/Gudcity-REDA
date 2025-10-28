import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Shield,
  Plus,
  Edit,
  Trash,
  Save,
  X,
  Check,
  Users,
  Building,
  FileText,
  Settings as SettingsIcon,
  BarChart2,
  Globe,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Types for permissions system
interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'users' | 'businesses' | 'content' | 'settings' | 'analytics' | 'system';
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem?: boolean;
}

// Mock data for permissions
const MOCK_PERMISSIONS: Permission[] = [
  // User permissions
  {
    id: 'users.view',
    name: 'View Users',
    description: 'Can view user list and profiles',
    category: 'users'
  },
  {
    id: 'users.create',
    name: 'Create Users',
    description: 'Can create new user accounts',
    category: 'users'
  },
  {
    id: 'users.edit',
    name: 'Edit Users',
    description: 'Can edit user information',
    category: 'users'
  },
  {
    id: 'users.delete',
    name: 'Delete Users',
    description: 'Can delete user accounts',
    category: 'users'
  },
  
  // Business permissions
  {
    id: 'businesses.view',
    name: 'View Businesses',
    description: 'Can view business list and profiles',
    category: 'businesses'
  },
  {
    id: 'businesses.create',
    name: 'Create Businesses',
    description: 'Can create new business accounts',
    category: 'businesses'
  },
  {
    id: 'businesses.edit',
    name: 'Edit Businesses',
    description: 'Can edit business information',
    category: 'businesses'
  },
  {
    id: 'businesses.delete',
    name: 'Delete Businesses',
    description: 'Can delete business accounts',
    category: 'businesses'
  },
  {
    id: 'businesses.approve',
    name: 'Approve Businesses',
    description: 'Can approve business registrations',
    category: 'businesses'
  },
  
  // Settings permissions
  {
    id: 'settings.view',
    name: 'View Settings',
    description: 'Can view system settings',
    category: 'settings'
  },
  {
    id: 'settings.edit',
    name: 'Edit Settings',
    description: 'Can modify system settings',
    category: 'settings'
  },
  
  // Analytics permissions
  {
    id: 'analytics.view',
    name: 'View Analytics',
    description: 'Can view system analytics',
    category: 'analytics'
  },
  {
    id: 'analytics.export',
    name: 'Export Analytics',
    description: 'Can export analytics data',
    category: 'analytics'
  },
  
  // System permissions
  {
    id: 'system.logs',
    name: 'View System Logs',
    description: 'Can access system logs',
    category: 'system'
  },
  {
    id: 'system.backup',
    name: 'System Backup',
    description: 'Can perform system backups',
    category: 'system'
  },
  
  // Content permissions
  {
    id: 'content.view',
    name: 'View Content',
    description: 'Can view system content',
    category: 'content'
  },
  {
    id: 'content.create',
    name: 'Create Content',
    description: 'Can create new content',
    category: 'content'
  },
  {
    id: 'content.edit',
    name: 'Edit Content',
    description: 'Can edit existing content',
    category: 'content'
  },
  {
    id: 'content.delete',
    name: 'Delete Content',
    description: 'Can delete content',
    category: 'content'
  }
];

// Mock data for roles
const MOCK_ROLES: Role[] = [
  {
    id: 1,
    name: 'Administrator',
    description: 'Full system access',
    permissions: MOCK_PERMISSIONS.map(p => p.id),
    userCount: 3,
    isSystem: true
  },
  {
    id: 2,
    name: 'Manager',
    description: 'Can manage users and businesses, view analytics',
    permissions: [
      'users.view', 'users.create', 'users.edit',
      'businesses.view', 'businesses.edit', 'businesses.approve',
      'analytics.view',
      'content.view', 'content.create', 'content.edit'
    ],
    userCount: 5
  },
  {
    id: 3,
    name: 'Support',
    description: 'Can view users and businesses, handle approvals',
    permissions: [
      'users.view',
      'businesses.view', 'businesses.approve',
      'content.view'
    ],
    userCount: 8
  },
  {
    id: 4,
    name: 'Content Editor',
    description: 'Can manage system content',
    permissions: [
      'content.view', 'content.create', 'content.edit', 'content.delete'
    ],
    userCount: 2
  },
  {
    id: 5,
    name: 'Analytics Viewer',
    description: 'Can view and export analytics',
    permissions: [
      'analytics.view', 'analytics.export'
    ],
    userCount: 4
  }
];

const AdminPermissions = () => {
  const { t } = useTranslation();
  
  // State for roles and permissions
  const [roles, setRoles] = useState<Role[]>(MOCK_ROLES);
  const [permissions] = useState<Permission[]>(MOCK_PERMISSIONS);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['users', 'businesses', 'settings', 'analytics', 'system', 'content']);
  
  // New role form state
  const [roleForm, setRoleForm] = useState<Partial<Role>>({
    name: '',
    description: '',
    permissions: []
  });
  
  // Filter roles based on search
  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);
  
  // Handle role selection
  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setRoleForm({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: [...role.permissions]
    });
    setIsRoleModalOpen(true);
  };
  
  // Handle new role creation
  const handleCreateRole = () => {
    setSelectedRole(null);
    setRoleForm({
      name: '',
      description: '',
      permissions: []
    });
    setIsRoleModalOpen(true);
  };
  
  // Handle role save
  const handleSaveRole = () => {
    if (!roleForm.name) return;
    
    if (selectedRole) {
      // Update existing role
      setRoles(prevRoles => 
        prevRoles.map(role => 
          role.id === selectedRole.id
            ? { 
                ...role, 
                name: roleForm.name!, 
                description: roleForm.description || '', 
                permissions: roleForm.permissions || [] 
              }
            : role
        )
      );
    } else {
      // Create new role
      const newRole: Role = {
        id: Math.max(...roles.map(r => r.id)) + 1,
        name: roleForm.name,
        description: roleForm.description || '',
        permissions: roleForm.permissions || [],
        userCount: 0
      };
      setRoles([...roles, newRole]);
    }
    
    setIsRoleModalOpen(false);
  };
  
  // Handle role deletion
  const handleDeleteRole = () => {
    if (!selectedRole) return;
    
    setRoles(prevRoles => prevRoles.filter(role => role.id !== selectedRole.id));
    setIsDeleteModalOpen(false);
    setSelectedRole(null);
  };
  
  // Toggle permission selection
  const handleTogglePermission = (permissionId: string) => {
    setRoleForm(prev => {
      const permissions = prev.permissions || [];
      
      if (permissions.includes(permissionId)) {
        return { ...prev, permissions: permissions.filter(id => id !== permissionId) };
      } else {
        return { ...prev, permissions: [...permissions, permissionId] };
      }
    });
  };
  
  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };
  
  // Category icon mapping
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'users':
        return <Users className="w-4 h-4" />;
      case 'businesses':
        return <Building className="w-4 h-4" />;
      case 'content':
        return <FileText className="w-4 h-4" />;
      case 'settings':
        return <SettingsIcon className="w-4 h-4" />;
      case 'analytics':
        return <BarChart2 className="w-4 h-4" />;
      case 'system':
        return <Globe className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };
  
  // Format category name
  const formatCategoryName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };
  
  // Role modal component
  const RoleModal = () => {
    if (!isRoleModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {selectedRole ? t('Edit Role') : t('Create New Role')}
            </h2>
            <button 
              onClick={() => setIsRoleModalOpen(false)} 
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Role Name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={roleForm.name || ''}
                    onChange={e => setRoleForm({...roleForm, name: e.target.value})}
                    placeholder={t('Enter role name')}
                    disabled={selectedRole?.isSystem}
                  />
                  {selectedRole?.isSystem && (
                    <p className="mt-1 text-xs text-gray-500">
                      {t('System roles cannot be renamed')}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Description')}
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={roleForm.description || ''}
                    onChange={e => setRoleForm({...roleForm, description: e.target.value})}
                    placeholder={t('Enter role description')}
                    rows={4}
                  />
                </div>
                
                {selectedRole && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">{t('Role Statistics')}</h3>
                    <p className="text-sm text-blue-600">
                      {t('Users with this role')}: <span className="font-medium">{selectedRole.userCount}</span>
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      {t('Permissions')}: <span className="font-medium">{roleForm.permissions?.length || 0}</span>
                    </p>
                  </div>
                )}
              </div>
              
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('Permissions')}</h3>
                
                <div className="bg-gray-50 border border-gray-200 rounded-md">
                  {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                    <div key={category} className="border-b border-gray-200 last:border-b-0">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center">
                          <span className="mr-2 text-blue-600">
                            {getCategoryIcon(category)}
                          </span>
                          <span className="font-medium">
                            {t(formatCategoryName(category))}
                          </span>
                          <span className="ml-2 text-xs text-gray-500 px-2 py-0.5 bg-gray-200 rounded-full">
                            {categoryPermissions.length}
                          </span>
                        </div>
                        {expandedCategories.includes(category) ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      
                      {expandedCategories.includes(category) && (
                        <div className="px-4 py-2 bg-white">
                          {categoryPermissions.map(permission => (
                            <div key={permission.id} className="py-2 border-t border-gray-100 first:border-t-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-start">
                                  <div className="flex items-center h-5">
                                    <input
                                      id={`permission-${permission.id}`}
                                      type="checkbox"
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      checked={roleForm.permissions?.includes(permission.id) || false}
                                      onChange={() => handleTogglePermission(permission.id)}
                                      disabled={selectedRole?.isSystem}
                                    />
                                  </div>
                                  <div className="ml-3 text-sm">
                                    <label htmlFor={`permission-${permission.id}`} className="font-medium text-gray-700">
                                      {permission.name}
                                    </label>
                                    <p className="text-gray-500">{permission.description}</p>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                  {permission.id}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between">
            <div>
              {selectedRole && !selectedRole.isSystem && (
                <button
                  type="button"
                  onClick={() => {
                    setIsRoleModalOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  {t('Delete Role')}
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                disabled={!roleForm.name || selectedRole?.isSystem}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {t('Save Role')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Delete confirmation modal
  const DeleteModal = () => {
    if (!isDeleteModalOpen || !selectedRole) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <Trash className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {t('Delete Role')}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {t('Are you sure you want to delete the role')} <span className="font-semibold">{selectedRole.name}</span>?
                  {selectedRole.userCount > 0 && (
                    <>
                      <br />
                      <br />
                      <span className="text-red-600 font-medium">
                        {t('Warning')}: {t('This role is assigned to')} {selectedRole.userCount} {selectedRole.userCount === 1 ? t('user') : t('users')}.
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleDeleteRole}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {t('Delete')}
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {t('Cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
              <Shield className="w-6 h-6 text-blue-500 mr-2" />
              {t('Role & Permissions')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('Manage user roles and access permissions')}
            </p>
          </div>
          
          <button
            onClick={handleCreateRole}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('Create Role')}
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={t('Search roles...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Role Name')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Description')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Permissions')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Users')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Type')}
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">{t('Actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      {t('No roles found')}
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{role.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 line-clamp-2">{role.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{role.permissions.length}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{role.userCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {role.isSystem ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {t('System')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {t('Custom')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleSelectRole(role)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <Edit className="h-4 w-4 inline" />
                          <span className="ml-1">{t('Edit')}</span>
                        </button>
                        {!role.isSystem && (
                          <button
                            onClick={() => {
                              setSelectedRole(role);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash className="h-4 w-4 inline" />
                            <span className="ml-1">{t('Delete')}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('Permission Overview')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(permissionsByCategory).map(([category, permissions]) => (
              <div key={category} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center mb-3">
                  <div className="mr-2 text-blue-600">
                    {getCategoryIcon(category)}
                  </div>
                  <h3 className="text-md font-medium text-gray-900">
                    {t(formatCategoryName(category))}
                  </h3>
                  <span className="ml-2 text-xs text-gray-500 px-2 py-0.5 bg-gray-200 rounded-full">
                    {permissions.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {permissions.map(permission => (
                    <li key={permission.id} className="text-sm text-gray-600 flex items-center">
                      <Check className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                      <span>{permission.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <RoleModal />
      <DeleteModal />
    </AdminLayout>
  );
};

export default AdminPermissions; 