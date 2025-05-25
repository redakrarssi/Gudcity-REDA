import React, { useState } from 'react';
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
  Check
} from 'lucide-react';

const AdminSettings = () => {
  const { t } = useTranslation();
  
  // Placeholder state for admin profile settings
  const [profile, setProfile] = useState({
    name: 'Admin User',
    email: 'admin@gudcity.com',
    phone: '+1 555-123-4567',
    role: 'Administrator',
    avatarUrl: '',
    twoFactorEnabled: true,
    emailNotifications: true,
    loginAlerts: true
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
  
  // Handle profile update
  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Updating profile...', profile);
    // Here you would make an API call to update the profile
    
    // Show saved message
    setShowSavedMessage(true);
    setTimeout(() => setShowSavedMessage(false), 3000);
  };
  
  // Handle password change
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert(t('Passwords do not match'));
      return;
    }
    
    console.log('Changing password...');
    // Here you would make an API call to change the password
    
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
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = (field: 'showCurrentPassword' | 'showNewPassword' | 'showConfirmPassword') => {
    setPasswordData({
      ...passwordData,
      [field]: !passwordData[field]
    });
  };
  
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
                        <select
                          id="role"
                          className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={profile.role}
                          disabled
                        >
                          <option>Administrator</option>
                          <option>Manager</option>
                          <option>Support</option>
                        </select>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {t('Role cannot be changed here. Contact super admin.')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('Profile Picture')}
                    </label>
                    <div className="flex items-center space-x-6">
                      <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {profile.avatarUrl ? (
                          <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="avatar-upload"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <Image className="h-4 w-4 mr-2 text-gray-500" />
                          {t('Upload new image')}
                        </label>
                        <input
                          type="file"
                          id="avatar-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            // In a real app, you would upload the file to a server
                            // and get back a URL to set in the profile
                            console.log('File selected:', e.target.files?.[0]);
                          }}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          {t('JPG, PNG or GIF. Max size 1MB.')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {t('Save Changes')}
                    </button>
                  </div>
                </form>
              </div>
              
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">{t('Password')}</h2>
                
                <form onSubmit={handlePasswordChange}>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Current Password')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type={passwordData.showCurrentPassword ? 'text' : 'password'}
                          id="current-password"
                          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                          required
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => togglePasswordVisibility('showCurrentPassword')}
                        >
                          {passwordData.showCurrentPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('New Password')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type={passwordData.showNewPassword ? 'text' : 'password'}
                          id="new-password"
                          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => togglePasswordVisibility('showNewPassword')}
                        >
                          {passwordData.showNewPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('Confirm New Password')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type={passwordData.showConfirmPassword ? 'text' : 'password'}
                          id="confirm-password"
                          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                          required
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => togglePasswordVisibility('showConfirmPassword')}
                        >
                          {passwordData.showConfirmPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          {t('Changing your password will log you out of all devices except this one.')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {t('Update Password')}
                    </button>
                  </div>
                </form>
              </div>
              
              <div className="border-t border-gray-200 pt-8 mt-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">{t('Security Settings')}</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{t('Two-Factor Authentication')}</h3>
                      <p className="text-sm text-gray-500">{t('Add an extra layer of security to your account')}</p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="two-factor"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={profile.twoFactorEnabled}
                        onChange={(e) => setProfile({...profile, twoFactorEnabled: e.target.checked})}
                      />
                      <label htmlFor="two-factor" className="ml-2 block text-sm text-gray-900">
                        {profile.twoFactorEnabled ? t('Enabled') : t('Disabled')}
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{t('Login Alerts')}</h3>
                      <p className="text-sm text-gray-500">{t('Get notified when someone logs into your account')}</p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="login-alerts"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={profile.loginAlerts}
                        onChange={(e) => setProfile({...profile, loginAlerts: e.target.checked})}
                      />
                      <label htmlFor="login-alerts" className="ml-2 block text-sm text-gray-900">
                        {profile.loginAlerts ? t('Enabled') : t('Disabled')}
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{t('Email Notifications')}</h3>
                      <p className="text-sm text-gray-500">{t('Receive emails about account activity')}</p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="email-notifications"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={profile.emailNotifications}
                        onChange={(e) => setProfile({...profile, emailNotifications: e.target.checked})}
                      />
                      <label htmlFor="email-notifications" className="ml-2 block text-sm text-gray-900">
                        {profile.emailNotifications ? t('Enabled') : t('Disabled')}
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={handleProfileUpdate}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {t('Save Security Settings')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings; 