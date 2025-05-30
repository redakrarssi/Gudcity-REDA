import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Globe, 
  ShieldCheck, 
  CreditCard, 
  HelpCircle, 
  LogOut, 
  ChevronRight,
  Save,
  Check,
  Edit3,
  X,
  AlertCircle,
  Loader
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CustomerSettingsService, type CustomerSettings } from '../../services/customerSettingsService';

// Available languages
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'ar', name: 'العربية' }
];

// Available currencies
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'MAD', name: 'Moroccan Dirham' },
  { code: 'TND', name: 'Tunisian Dinar' },
  { code: 'JOD', name: 'Jordanian Dinar' }
];

const CustomerSettings = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [animateIn, setAnimateIn] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<CustomerSettings | null>(null);
  const [formData, setFormData] = useState<CustomerSettings | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    // Trigger animation after a short delay
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // Fetch customer settings when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const settings = await CustomerSettingsService.getCustomerSettings(user.id);
        if (settings) {
          setUserData(settings);
          setFormData(settings);
        }
      } catch (error) {
        console.error('Error fetching customer settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!formData) return;
    
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (name.includes('.')) {
      // Handle nested properties (e.g., "notificationPreferences.email")
      const [parentKey, childKey] = name.split('.');
      setFormData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          [parentKey]: {
            ...(prev as any)[parentKey],
            [childKey]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
          }
        };
      });
    } else {
      if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({
          ...prev!,
          [name]: checked
        }));
      } else {
        setFormData(prev => ({
          ...prev!,
          [name]: value
        }));
      }
    }
  };

  const handleSaveSettings = async () => {
    if (!formData || !user) return;
    
    setLoading(true);
    setSaveSuccess(false);
    setSaveError(false);
    
    try {
      const updatedSettings = await CustomerSettingsService.updateCustomerSettings(
        formData.id,
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          birthday: formData.birthday,
          notificationPreferences: formData.notificationPreferences,
          regionalSettings: formData.regionalSettings
        }
      );
      
      if (updatedSettings) {
        setUserData(updatedSettings);
        setFormData(updatedSettings);
        
        // Update language if changed
        if (updatedSettings.regionalSettings.language !== userData?.regionalSettings.language) {
          i18n.changeLanguage(updatedSettings.regionalSettings.language);
        }
        
        setSaveSuccess(true);
        setEditMode(false);
        
        // Clear success message after delay
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        setSaveError(true);
        setTimeout(() => {
          setSaveError(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError(true);
      setTimeout(() => {
        setSaveError(false);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData(userData);
    setEditMode(false);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!formData) return;
    
    const newLang = e.target.value;
    setFormData(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        regionalSettings: {
          ...prev.regionalSettings,
          language: newLang
        }
      };
    });
  };

  // Show loading state
  if (loading && !userData) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-2 text-lg text-gray-600">{t('Loading settings...')}</span>
        </div>
      </CustomerLayout>
    );
  }

  // Show error state if no user data could be loaded
  if (!userData && !loading) {
    return (
      <CustomerLayout>
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 max-w-xl mx-auto mt-10">
          <h2 className="text-lg font-semibold flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {t('Error Loading Settings')}
          </h2>
          <p className="mt-2">
            {t('We couldn\'t load your settings. Please try refreshing the page or contact support if the problem persists.')}
          </p>
        </div>
      </CustomerLayout>
    );
  }

  const renderPersonalSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <User className="w-5 h-5 text-blue-500 mr-2" />
            {t('Personal Information')}
          </h2>
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <Edit3 className="w-4 h-4 mr-1.5" />
              {t('Edit')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                <X className="w-4 h-4 mr-1.5" />
                {t('Cancel')}
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex items-center text-sm text-green-600 hover:text-green-800 font-medium"
                disabled={loading}
              >
                {loading ? (
                  <Loader className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1.5" />
                )}
                {t('Save')}
              </button>
            </div>
          )}
        </div>
        
        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
            <Check className="w-5 h-5 mr-2" />
            {t('Your settings have been successfully updated')}
          </div>
        )}
        
        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {t('There was an error updating your settings. Please try again.')}
          </div>
        )}
        
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Full Name')}
            </label>
            {editMode ? (
              <input
                type="text"
                name="name"
                value={formData?.name || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-gray-800">{userData?.name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Email Address')}
            </label>
            {editMode ? (
              <input
                type="email"
                name="email"
                value={formData?.email || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-gray-800">{userData?.email}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Phone Number')}
            </label>
            {editMode ? (
              <input
                type="tel"
                name="phone"
                value={formData?.phone || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-gray-800">{userData?.phone || t('Not specified')}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Member Since')}
            </label>
            <p className="text-gray-800">{new Date(userData?.joinedAt || '').toLocaleDateString()}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-6">
          <Globe className="w-5 h-5 text-blue-500 mr-2" />
          {t('Regional Settings')}
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Language')}
            </label>
            {editMode ? (
              <select
                name="regionalSettings.language"
                value={formData?.regionalSettings.language || 'en'}
                onChange={handleLanguageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-800">
                {LANGUAGES.find(lang => lang.code === userData?.regionalSettings.language)?.name || userData?.regionalSettings.language}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Preferred Currency')}
            </label>
            {editMode ? (
              <select
                name="regionalSettings.currency"
                value={formData?.regionalSettings.currency || 'USD'}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CURRENCIES.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-800">
                {CURRENCIES.find(c => c.code === userData?.regionalSettings.currency)?.name 
                  ? `${userData?.regionalSettings.currency} - ${CURRENCIES.find(c => c.code === userData?.regionalSettings.currency)?.name}`
                  : userData?.regionalSettings.currency}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Bell className="w-5 h-5 text-blue-500 mr-2" />
            {t('Notification Settings')}
          </h2>
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <Edit3 className="w-4 h-4 mr-1.5" />
              {t('Edit')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                <X className="w-4 h-4 mr-1.5" />
                {t('Cancel')}
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex items-center text-sm text-green-600 hover:text-green-800 font-medium"
                disabled={loading}
              >
                {loading ? (
                  <Loader className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1.5" />
                )}
                {t('Save')}
              </button>
            </div>
          )}
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-3">
              {t('Communication Channels')}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="email-notifications"
                  name="notificationPreferences.email"
                  checked={formData?.notificationPreferences.email || false}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="email-notifications" className="ml-2 block text-sm text-gray-700">
                  {t('Email Notifications')}
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="push-notifications"
                  name="notificationPreferences.push"
                  checked={formData?.notificationPreferences.push || false}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="push-notifications" className="ml-2 block text-sm text-gray-700">
                  {t('Push Notifications')}
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sms-notifications"
                  name="notificationPreferences.sms"
                  checked={formData?.notificationPreferences.sms || false}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="sms-notifications" className="ml-2 block text-sm text-gray-700">
                  {t('SMS Notifications')}
                </label>
              </div>
            </div>
          </div>
        
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-3">
              {t('Notification Types')}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="promotion-notifications"
                  name="notificationPreferences.promotions"
                  checked={formData?.notificationPreferences.promotions || false}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="promotion-notifications" className="ml-2 block text-sm text-gray-700">
                  {t('Promotions and Offers')}
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="reward-notifications"
                  name="notificationPreferences.rewards"
                  checked={formData?.notificationPreferences.rewards || false}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="reward-notifications" className="ml-2 block text-sm text-gray-700">
                  {t('Rewards and Points Updates')}
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="system-notifications"
                  name="notificationPreferences.system"
                  checked={formData?.notificationPreferences.system || false}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="system-notifications" className="ml-2 block text-sm text-gray-700">
                  {t('System Notifications')}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
        {editMode && (
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {t('Saving...')}
              </span>
            ) : (
              t('Save Preferences')
            )}
          </button>
        )}
      </div>
    </div>
  );

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-6">
          <ShieldCheck className="w-5 h-5 text-blue-500 mr-2" />
          {t('Security Settings')}
        </h2>
        
        <div className="space-y-4">
          <button
            className="w-full flex justify-between items-center p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">{t('Change Password')}</h3>
                <p className="text-sm text-gray-500">{t('Update your password')}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          
          <button
            className="w-full flex justify-between items-center p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <div className="bg-purple-100 p-2 rounded-full mr-3">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">{t('Login Notifications')}</h3>
                <p className="text-sm text-gray-500">{t('Get notified of new logins to your account')}</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="mr-2 text-sm text-green-600 font-medium">{t('Enabled')}</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-6">
          <CreditCard className="w-5 h-5 text-blue-500 mr-2" />
          {t('Connected Accounts')}
        </h2>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="bg-red-100 p-2 rounded-full mr-3">
                <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-9.5v3h2v-3h3v-2h-3v-3h-2v3H8v2h3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Google</h3>
                <p className="text-sm text-gray-500">{t('Connect your Google account')}</p>
              </div>
            </div>
            <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
              {t('Connect')}
            </button>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Facebook</h3>
                <p className="text-sm text-gray-500">{t('Connect your Facebook account')}</p>
              </div>
            </div>
            <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
              {t('Connect')}
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          {t('Account Actions')}
        </h2>
        
        <div className="space-y-4">
          <button
            className="w-full flex justify-between items-center p-3 text-left bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-red-700"
          >
            <div className="flex items-center">
              <div className="bg-red-100 p-2 rounded-full mr-3">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium">{t('Delete Account')}</h3>
                <p className="text-sm opacity-80">{t('Permanently delete your account and data')}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <CustomerLayout>
      <div className="space-y-6 pb-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className={`transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
                <SettingsIcon className="w-6 h-6 text-blue-500 mr-2" />
                {t('Settings')}
              </h1>
              <p className="text-gray-500 mt-1">{t('Manage your account settings and preferences')}</p>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-500 ease-out transform delay-100 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'personal'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('Personal Settings')}
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'notifications'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('Notifications')}
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'account'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('Account')}
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className={`transition-all duration-500 ease-out transform delay-200 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {activeTab === 'personal' && renderPersonalSettings()}
          {activeTab === 'notifications' && renderNotificationSettings()}
          {activeTab === 'account' && renderAccountSettings()}
        </div>
        
        {/* Help Section */}
        <div className={`mt-8 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100 transition-all duration-500 ease-out transform delay-300 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-lg font-medium text-gray-800 flex items-center mb-2">
            <HelpCircle className="w-5 h-5 text-indigo-500 mr-2" />
            {t('Need Help?')}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {t('If you have any questions about your account or settings, our support team is here to help.')}
          </p>
          <button
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <HelpCircle className="w-4 h-4 mr-1.5" />
            {t('Contact Support')}
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerSettings; 