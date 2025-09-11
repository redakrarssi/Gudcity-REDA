import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, UserEdit, Save, AlertCircle, Info, Eye, EyeOff } from 'lucide-react';
import type { User, StaffPermissions } from '../../services/userService';

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (staffId: number, updatedData: {
    name?: string;
    email?: string;
    password?: string;
    permissions?: StaffPermissions;
  }) => Promise<void>;
  staffMember: User | null;
}

export const EditStaffModal: React.FC<EditStaffModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  staffMember
}) => {
  const { t } = useTranslation();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // Permission state
  const [permissions, setPermissions] = useState<StaffPermissions>({
    canCreatePrograms: true,
    canEditPrograms: true,
    canDeletePrograms: false,
    canCreatePromotions: true,
    canEditPromotions: true,
    canDeletePromotions: false,
    canAccessSettings: false,
    canManageStaff: false,
    canViewCustomers: true,
    canViewReports: true,
    canScanQR: true,
    canAwardPoints: true
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'permissions'>('basic');
  
  // Initialize form data when staff member changes
  useEffect(() => {
    if (staffMember) {
      setFormData({
        name: staffMember.name || '',
        email: staffMember.email || '',
        password: '',
        confirmPassword: ''
      });
      
      if (staffMember.permissions) {
        setPermissions(staffMember.permissions);
      }
    }
  }, [staffMember]);
  
  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Basic info validation
    if (activeTab === 'basic') {
      if (!formData.name.trim()) {
        newErrors.name = t('Name is required');
      } else if (formData.name.trim().length < 2) {
        newErrors.name = t('Name must be at least 2 characters');
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email.trim()) {
        newErrors.email = t('Email is required');
      } else if (!emailRegex.test(formData.email)) {
        newErrors.email = t('Please enter a valid email address');
      }
      
      // Password validation (only if password is provided)
      if (formData.password) {
        if (formData.password.length < 8) {
          newErrors.password = t('Password must be at least 8 characters');
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
          newErrors.password = t('Password must contain uppercase, lowercase, and number');
        }
        
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = t('Passwords do not match');
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // Handle permission changes
  const handlePermissionChange = (permission: keyof StaffPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: !prev[permission]
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !staffMember?.id) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const updateData: any = {};
      
      if (activeTab === 'basic') {
        updateData.name = formData.name.trim();
        updateData.email = formData.email.trim().toLowerCase();
        
        if (formData.password) {
          updateData.password = formData.password;
        }
      } else {
        updateData.permissions = permissions;
      }
      
      await onSubmit(staffMember.id, updateData);
      
      // Reset form on success
      if (activeTab === 'basic') {
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      }
      setErrors({});
    } catch (error) {
      console.error('Error updating staff:', error);
      setErrors({ submit: t('Failed to update staff member. Please try again.') });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle modal close
  const handleClose = () => {
    if (isSubmitting) return;
    
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setErrors({});
    setActiveTab('basic');
    onClose();
  };
  
  if (!isOpen || !staffMember) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <UserEdit className="w-5 h-5 text-blue-500 mr-2" />
            {t('Edit Staff Member')}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'basic'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('Basic Info')}
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'permissions'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('Permissions')}
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          {/* General error */}
          {errors.submit && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            {activeTab === 'basic' && (
              <div className="space-y-4">
                {/* Basic info notice */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">{t('Edit Staff Information')}</p>
                      <p className="text-xs">
                        {t('Leave password fields empty if you don\'t want to change the password.')}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Name field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Full Name')} *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 ${
                      errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                  )}
                </div>
                
                {/* Email field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Email Address')} *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 ${
                      errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                  )}
                </div>
                
                {/* Password field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('New Password')} {t('(optional)')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 ${
                        errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder={t('Leave empty to keep current password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSubmitting}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                  )}
                </div>
                
                {/* Confirm Password field */}
                {formData.password && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('Confirm New Password')} *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 ${
                          errors.confirmPassword ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isSubmitting}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'permissions' && (
              <div className="space-y-4">
                {/* Permissions notice */}
                <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-amber-700">
                      <p className="font-medium mb-1">{t('Staff Permissions')}</p>
                      <p className="text-xs">
                        {t('Configure what this staff member can access and modify.')}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Programs permissions */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{t('Programs')}</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={permissions.canCreatePrograms}
                        onChange={() => handlePermissionChange('canCreatePrograms')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('Can create programs')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={permissions.canEditPrograms}
                        onChange={() => handlePermissionChange('canEditPrograms')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('Can edit programs')}</span>
                    </label>
                    <label className="flex items-center opacity-50">
                      <input
                        type="checkbox"
                        checked={false}
                        disabled
                        className="h-4 w-4 text-gray-400 border-gray-300 rounded cursor-not-allowed"
                      />
                      <span className="ml-2 text-sm text-gray-500">{t('Can delete programs')} ({t('Owner only')})</span>
                    </label>
                  </div>
                </div>
                
                {/* Promotions permissions */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{t('Promotions')}</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={permissions.canCreatePromotions}
                        onChange={() => handlePermissionChange('canCreatePromotions')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('Can create promotions')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={permissions.canEditPromotions}
                        onChange={() => handlePermissionChange('canEditPromotions')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('Can edit promotions')}</span>
                    </label>
                    <label className="flex items-center opacity-50">
                      <input
                        type="checkbox"
                        checked={false}
                        disabled
                        className="h-4 w-4 text-gray-400 border-gray-300 rounded cursor-not-allowed"
                      />
                      <span className="ml-2 text-sm text-gray-500">{t('Can delete promotions')} ({t('Owner only')})</span>
                    </label>
                  </div>
                </div>
                
                {/* Other permissions */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{t('Other Permissions')}</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={permissions.canViewCustomers}
                        onChange={() => handlePermissionChange('canViewCustomers')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('Can view customers')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={permissions.canViewReports}
                        onChange={() => handlePermissionChange('canViewReports')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('Can view reports')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={permissions.canScanQR}
                        onChange={() => handlePermissionChange('canScanQR')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('Can scan QR codes')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={permissions.canAwardPoints}
                        onChange={() => handlePermissionChange('canAwardPoints')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('Can award points')}</span>
                    </label>
                    <label className="flex items-center opacity-50">
                      <input
                        type="checkbox"
                        checked={false}
                        disabled
                        className="h-4 w-4 text-gray-400 border-gray-300 rounded cursor-not-allowed"
                      />
                      <span className="ml-2 text-sm text-gray-500">{t('Can access settings')} ({t('Owner only')})</span>
                    </label>
                    <label className="flex items-center opacity-50">
                      <input
                        type="checkbox"
                        checked={false}
                        disabled
                        className="h-4 w-4 text-gray-400 border-gray-300 rounded cursor-not-allowed"
                      />
                      <span className="ml-2 text-sm text-gray-500">{t('Can manage staff')} ({t('Owner only')})</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            {/* Form actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
              >
                {t('Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('Saving...')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {activeTab === 'basic' ? t('Save Info') : t('Save Permissions')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
