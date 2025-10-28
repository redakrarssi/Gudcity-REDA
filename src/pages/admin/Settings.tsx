import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  User,
  Lock,
  Mail,
  Phone,
  Image,
  Save,
  AlertTriangle,
  Bell,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  Check,
  Loader
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserSettingsService, type UserSettings } from '../../services/userSettingsService';

const AdminSettings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // State for user settings
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    avatar_url: string;
    two_factor_enabled: boolean;
    notification_settings: {
      email_notifications: boolean;
      login_alerts: boolean;
      system_updates?: boolean;
    }
  }>({
    id: 0,
    name: '',
    email: '',
    phone: '',
    role: '',
    avatar_url: '',
    two_factor_enabled: false,
    notification_settings: {
      email_notifications: true,
      login_alerts: true,
      system_updates: true
    }
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrentPassword: false,
    showNewPassword: false,
    showConfirmPassword: false
  });
  
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  
  // Load user settings when component mounts
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user) {
        setLoading(false);
        setError('No user found. Please log in.');
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const userSettings = await UserSettingsService.getUserSettings(user.id);
        
        if (userSettings) {
          setProfile({
            id: userSettings.id,
            name: userSettings.name,
            email: userSettings.email,
            phone: userSettings.phone || '',
            role: userSettings.role,
            avatar_url: userSettings.avatar_url || '',
            two_factor_enabled: userSettings.two_factor_enabled,
            notification_settings: userSettings.notification_settings
          });
        } else {
          setError('Failed to load settings. Please try again.');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setError('Error loading settings. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadUserSettings();
  }, [user]);
  
  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('No user found. Please log in.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const updatedSettings = await UserSettingsService.updateUserSettings(user.id, {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        two_factor_enabled: profile.two_factor_enabled,
        notification_settings: profile.notification_settings
      });
      
      if (updatedSettings) {
        // Show saved message
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 3000);
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error instanceof Error) {
        if (error.message.includes('phone')) {
          setError('Error updating phone number. This field may not be supported in your current database setup.');
        } else if (error.message.includes('column')) {
          setError('Database configuration error. Please contact administrator.');
        } else {
          setError(`Error updating profile: ${error.message}`);
        }
      } else {
        setError('Error updating profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('No user found. Please log in.');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const success = await UserSettingsService.updateUserPassword(
        user.id,
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      if (success) {
        // Reset form and show success message
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          showCurrentPassword: false,
          showNewPassword: false,
          showConfirmPassword: false
        });
        
        // Show saved message
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 3000);
      } else {
        setError('Failed to update password. Please check your current password and try again.');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      if (error instanceof Error) {
        if (error.message.includes('password_hash')) {
          setError('Password system configuration error. Please contact administrator.');
        } else if (error.message.includes('column')) {
          setError('Database configuration error. Password updates may not be supported.');
        } else if (error.message.includes('Invalid current password')) {
          setError('Current password is incorrect. Please try again.');
        } else {
          setError(`Error updating password: ${error.message}`);
        }
      } else {
        setError('Error updating password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = (field: 'showCurrentPassword' | 'showNewPassword' | 'showConfirmPassword') => {
    setPasswordData({
      ...passwordData,
      [field]: !passwordData[field]
    });
  };

  // Handle notification settings change
  const handleNotificationSettingChange = (setting: keyof typeof profile.notification_settings) => {
    setProfile({
      ...profile,
      notification_settings: {
        ...profile.notification_settings,
        [setting]: !profile.notification_settings[setting]
      }
    });
  };
  
  // Show loading state
  if (loading && !profile.id) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="mt-4 text-gray-600">{t('Loading settings...')}</span>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
              <SettingsIcon className="w-6 h-6 text-blue-500 mr-2" />
              {t('Account Settings')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('Manage your account settings and preferences')}
            </p>
          </div>
          
          {showSavedMessage && (
            <div className="flex items-center text-green-600 bg-green-50 px-4 py-2 rounded-md">
              <Check className="w-4 h-4 mr-2" />
              {t('Changes saved successfully')}
            </div>
          )}

          {error && (
            <div className="flex items-center text-red-600 bg-red-50 px-4 py-2 rounded-md">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {t(error)}
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex overflow-x-auto">
              <button
                className="py-4 px-6 text-sm font-medium border-b-2 border-blue-500 text-blue-600"
              >
                <User className="w-4 h-4 inline mr-2" />
                {t('Profile')}
              </button>
              
              <button
                className="py-4 px-6 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"
              >
                <Lock className="w-4 h-4 inline mr-2" />
                {t('Security')}
              </button>
              
              <button
                className="py-4 px-6 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"
              >
                <Bell className="w-4 h-4 inline mr-2" />
                {t('Notifications')}
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            <div className="max-w-3xl mx-auto">
              <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">{t('Personal Information')}</h2>
                
                <form onSubmit={handleProfileUpdate}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Name')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          id="name"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={profile.name}
                          onChange={(e) => setProfile({...profile, name: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Email')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          id="email"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={profile.email}
                          onChange={(e) => setProfile({...profile, email: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Phone')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          id="phone"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={profile.phone}
                          onChange={(e) => setProfile({...profile, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Role')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          id="role"
                          disabled
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={profile.role}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-md font-medium text-gray-800 mb-3">{t('Notification Settings')}</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="emailNotifications"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={profile.notification_settings.email_notifications}
                          onChange={() => handleNotificationSettingChange('email_notifications')}
                        />
                        <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-700">
                          {t('Email Notifications')}
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="loginAlerts"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={profile.notification_settings.login_alerts}
                          onChange={() => handleNotificationSettingChange('login_alerts')}
                        />
                        <label htmlFor="loginAlerts" className="ml-2 block text-sm text-gray-700">
                          {t('Login Alerts')}
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="systemUpdates"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={profile.notification_settings.system_updates || false}
                          onChange={() => handleNotificationSettingChange('system_updates')}
                        />
                        <label htmlFor="systemUpdates" className="ml-2 block text-sm text-gray-700">
                          {t('System Updates')}
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-md font-medium text-gray-800 mb-3">{t('Security Settings')}</h3>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="twoFactorEnabled"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={profile.two_factor_enabled}
                        onChange={(e) => setProfile({...profile, two_factor_enabled: e.target.checked})}
                      />
                      <label htmlFor="twoFactorEnabled" className="ml-2 block text-sm text-gray-700">
                        {t('Enable Two-Factor Authentication')}
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center disabled:opacity-50"
                      disabled={loading}
                    >
                      {loading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      {t('Save Changes')}
                    </button>
                  </div>
                </form>
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">{t('Change Password')}</h2>
                
                <form onSubmit={handlePasswordChange}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Current Password')}
                      </label>
                      <div className="relative">
                        <input
                          type={passwordData.showCurrentPassword ? 'text' : 'password'}
                          id="currentPassword"
                          className="block w-full pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => togglePasswordVisibility('showCurrentPassword')}
                        >
                          {passwordData.showCurrentPassword ? 
                            <EyeOff className="h-5 w-5 text-gray-400" /> : 
                            <Eye className="h-5 w-5 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('New Password')}
                      </label>
                      <div className="relative">
                        <input
                          type={passwordData.showNewPassword ? 'text' : 'password'}
                          id="newPassword"
                          className="block w-full pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => togglePasswordVisibility('showNewPassword')}
                        >
                          {passwordData.showNewPassword ? 
                            <EyeOff className="h-5 w-5 text-gray-400" /> : 
                            <Eye className="h-5 w-5 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Confirm New Password')}
                      </label>
                      <div className="relative">
                        <input
                          type={passwordData.showConfirmPassword ? 'text' : 'password'}
                          id="confirmPassword"
                          className="block w-full pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => togglePasswordVisibility('showConfirmPassword')}
                        >
                          {passwordData.showConfirmPassword ? 
                            <EyeOff className="h-5 w-5 text-gray-400" /> : 
                            <Eye className="h-5 w-5 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-4">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center disabled:opacity-50"
                        disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || loading}
                      >
                        {loading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                        {t('Change Password')}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings; 