import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Settings,
  Globe,
  Shield,
  Bell,
  Mail,
  DollarSign,
  CreditCard,
  Save,
  RefreshCw,
  HelpCircle,
  CheckSquare,
  Database,
  Key,
  Zap,
  Check,
  Info
} from 'lucide-react';

const AdminGlobalSettings = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'payments'>('general');
  
  // Placeholder state for settings
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'Vcarda Loyalty Platform',
    supportEmail: 'support@vcarda.com',
    defaultLanguage: 'en',
    timezone: 'UTC',
    maintenanceMode: false,
    maintenanceMessage: 'We are currently performing scheduled maintenance. Please check back later.',
    userRegistration: true,
    businessRegistration: true
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    passwordMinLength: 8,
    passwordRequireSpecialChar: true,
    passwordRequireNumber: true,
    passwordRequireUppercase: true,
    loginAttempts: 5,
    sessionTimeout: 30,
    apiRateLimit: 100
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    adminAlerts: true,
    userSignups: true,
    businessSignups: true,
    transactionAlerts: true,
    weeklyReports: true,
    marketingEmails: false
  });
  
  const [paymentSettings, setPaymentSettings] = useState({
    currency: 'USD',
    processingFee: 2.5,
    minimumPayout: 50,
    payoutSchedule: 'monthly',
    enableStripe: true,
    enablePayPal: true,
    testMode: true
  });
  
  // Handle form submission (would connect to API in real app)
  const handleSaveSettings = () => {
    console.log('Saving settings...');
    // Show success message or handle API call
  };
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
              <Settings className="w-6 h-6 text-blue-500 mr-2" />
              {t('Global Settings')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('Configure platform-wide settings and defaults')}
            </p>
          </div>
          <div>
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {t('Save All Settings')}
            </button>
          </div>
        </div>
        
        {/* Settings Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'general'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                <Globe className="w-4 h-4 inline mr-2" />
                {t('General')}
              </button>
              
              <button
                onClick={() => setActiveTab('security')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'security'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                <Shield className="w-4 h-4 inline mr-2" />
                {t('Security')}
              </button>
              
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'notifications'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                <Bell className="w-4 h-4 inline mr-2" />
                {t('Notifications')}
              </button>
              
              <button
                onClick={() => setActiveTab('payments')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'payments'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                <DollarSign className="w-4 h-4 inline mr-2" />
                {t('Payments')}
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Info className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        {t('About Global Settings')}
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          {t('These settings affect the entire platform. Changes will be applied immediately after saving.')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="siteName" className="block text-sm font-medium text-gray-700">
                      {t('Site Name')}
                    </label>
                    <input
                      type="text"
                      id="siteName"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={generalSettings.siteName}
                      onChange={(e) => setGeneralSettings({...generalSettings, siteName: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="supportEmail" className="block text-sm font-medium text-gray-700">
                      {t('Support Email')}
                    </label>
                    <input
                      type="email"
                      id="supportEmail"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={generalSettings.supportEmail}
                      onChange={(e) => setGeneralSettings({...generalSettings, supportEmail: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="defaultLanguage" className="block text-sm font-medium text-gray-700">
                      {t('Default Language')}
                    </label>
                    <select
                      id="defaultLanguage"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={generalSettings.defaultLanguage}
                      onChange={(e) => setGeneralSettings({...generalSettings, defaultLanguage: e.target.value})}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="zh">Chinese</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                      {t('Timezone')}
                    </label>
                    <select
                      id="timezone"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={generalSettings.timezone}
                      onChange={(e) => setGeneralSettings({...generalSettings, timezone: e.target.value})}
                    >
                      <option value="UTC">UTC</option>
                      <option value="EST">Eastern Time (EST)</option>
                      <option value="CST">Central Time (CST)</option>
                      <option value="MST">Mountain Time (MST)</option>
                      <option value="PST">Pacific Time (PST)</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4 mt-8">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">{t('Registration Settings')}</h3>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="userRegistration"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={generalSettings.userRegistration}
                      onChange={(e) => setGeneralSettings({...generalSettings, userRegistration: e.target.checked})}
                    />
                    <label htmlFor="userRegistration" className="ml-2 block text-sm text-gray-900">
                      {t('Allow User Registration')}
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="businessRegistration"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={generalSettings.businessRegistration}
                      onChange={(e) => setGeneralSettings({...generalSettings, businessRegistration: e.target.checked})}
                    />
                    <label htmlFor="businessRegistration" className="ml-2 block text-sm text-gray-900">
                      {t('Allow Business Registration')}
                    </label>
                  </div>
                </div>
                
                <div className="space-y-4 mt-8">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">{t('Maintenance Settings')}</h3>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="maintenanceMode"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={generalSettings.maintenanceMode}
                      onChange={(e) => setGeneralSettings({...generalSettings, maintenanceMode: e.target.checked})}
                    />
                    <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-900">
                      {t('Enable Maintenance Mode')}
                    </label>
                  </div>
                  
                  {generalSettings.maintenanceMode && (
                    <div>
                      <label htmlFor="maintenanceMessage" className="block text-sm font-medium text-gray-700">
                        {t('Maintenance Message')}
                      </label>
                      <textarea
                        id="maintenanceMessage"
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={generalSettings.maintenanceMessage}
                        onChange={(e) => setGeneralSettings({...generalSettings, maintenanceMessage: e.target.value})}
                      ></textarea>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="twoFactorAuth" className="block text-sm font-medium text-gray-700">
                        {t('Require Two-Factor Authentication')}
                      </label>
                      <span className="ml-2 text-xs text-white bg-green-500 px-2 py-1 rounded-full">
                        {t('Recommended')}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center">
                      <input
                        type="checkbox"
                        id="twoFactorAuth"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={securitySettings.twoFactorAuth}
                        onChange={(e) => setSecuritySettings({...securitySettings, twoFactorAuth: e.target.checked})}
                      />
                      <label htmlFor="twoFactorAuth" className="ml-2 block text-sm text-gray-500">
                        {t('Enforce 2FA for admin accounts')}
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="loginAttempts" className="block text-sm font-medium text-gray-700">
                      {t('Max Login Attempts')}
                    </label>
                    <input
                      type="number"
                      id="loginAttempts"
                      min="1"
                      max="10"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={securitySettings.loginAttempts}
                      onChange={(e) => setSecuritySettings({...securitySettings, loginAttempts: parseInt(e.target.value)})}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="sessionTimeout" className="block text-sm font-medium text-gray-700">
                      {t('Session Timeout (minutes)')}
                    </label>
                    <input
                      type="number"
                      id="sessionTimeout"
                      min="5"
                      max="120"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="apiRateLimit" className="block text-sm font-medium text-gray-700">
                      {t('API Rate Limit (requests per minute)')}
                    </label>
                    <input
                      type="number"
                      id="apiRateLimit"
                      min="10"
                      max="1000"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={securitySettings.apiRateLimit}
                      onChange={(e) => setSecuritySettings({...securitySettings, apiRateLimit: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                
                <div className="space-y-4 mt-8">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">{t('Password Requirements')}</h3>
                  
                  <div>
                    <label htmlFor="passwordMinLength" className="block text-sm font-medium text-gray-700">
                      {t('Minimum Password Length')}
                    </label>
                    <input
                      type="number"
                      id="passwordMinLength"
                      min="6"
                      max="20"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={securitySettings.passwordMinLength}
                      onChange={(e) => setSecuritySettings({...securitySettings, passwordMinLength: parseInt(e.target.value)})}
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="passwordRequireSpecialChar"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={securitySettings.passwordRequireSpecialChar}
                      onChange={(e) => setSecuritySettings({...securitySettings, passwordRequireSpecialChar: e.target.checked})}
                    />
                    <label htmlFor="passwordRequireSpecialChar" className="ml-2 block text-sm text-gray-900">
                      {t('Require Special Character')}
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="passwordRequireNumber"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={securitySettings.passwordRequireNumber}
                      onChange={(e) => setSecuritySettings({...securitySettings, passwordRequireNumber: e.target.checked})}
                    />
                    <label htmlFor="passwordRequireNumber" className="ml-2 block text-sm text-gray-900">
                      {t('Require Number')}
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="passwordRequireUppercase"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={securitySettings.passwordRequireUppercase}
                      onChange={(e) => setSecuritySettings({...securitySettings, passwordRequireUppercase: e.target.checked})}
                    />
                    <label htmlFor="passwordRequireUppercase" className="ml-2 block text-sm text-gray-900">
                      {t('Require Uppercase Letter')}
                    </label>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {t('Test Security Settings')}
                  </button>
                </div>
              </div>
            )}
            
            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">{t('Email Notifications')}</h3>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="emailNotifications"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) => setNotificationSettings({...notificationSettings, emailNotifications: e.target.checked})}
                      />
                      <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-900">
                        {t('Enable Email Notifications')}
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="userSignups"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={notificationSettings.userSignups}
                        onChange={(e) => setNotificationSettings({...notificationSettings, userSignups: e.target.checked})}
                      />
                      <label htmlFor="userSignups" className="ml-2 block text-sm text-gray-900">
                        {t('New User Signups')}
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="businessSignups"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={notificationSettings.businessSignups}
                        onChange={(e) => setNotificationSettings({...notificationSettings, businessSignups: e.target.checked})}
                      />
                      <label htmlFor="businessSignups" className="ml-2 block text-sm text-gray-900">
                        {t('New Business Signups')}
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="transactionAlerts"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={notificationSettings.transactionAlerts}
                        onChange={(e) => setNotificationSettings({...notificationSettings, transactionAlerts: e.target.checked})}
                      />
                      <label htmlFor="transactionAlerts" className="ml-2 block text-sm text-gray-900">
                        {t('High-Value Transaction Alerts')}
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="weeklyReports"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={notificationSettings.weeklyReports}
                        onChange={(e) => setNotificationSettings({...notificationSettings, weeklyReports: e.target.checked})}
                      />
                      <label htmlFor="weeklyReports" className="ml-2 block text-sm text-gray-900">
                        {t('Weekly Summary Reports')}
                      </label>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">{t('System Notifications')}</h3>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="pushNotifications"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={notificationSettings.pushNotifications}
                        onChange={(e) => setNotificationSettings({...notificationSettings, pushNotifications: e.target.checked})}
                      />
                      <label htmlFor="pushNotifications" className="ml-2 block text-sm text-gray-900">
                        {t('Enable Push Notifications')}
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="adminAlerts"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={notificationSettings.adminAlerts}
                        onChange={(e) => setNotificationSettings({...notificationSettings, adminAlerts: e.target.checked})}
                      />
                      <label htmlFor="adminAlerts" className="ml-2 block text-sm text-gray-900">
                        {t('Admin Security Alerts')}
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="marketingEmails"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={notificationSettings.marketingEmails}
                        onChange={(e) => setNotificationSettings({...notificationSettings, marketingEmails: e.target.checked})}
                      />
                      <label htmlFor="marketingEmails" className="ml-2 block text-sm text-gray-900">
                        {t('Marketing Emails')}
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {t('Test Email')}
                  </button>
                </div>
              </div>
            )}
            
            {/* Payment Settings */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                      {t('Default Currency')}
                    </label>
                    <select
                      id="currency"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={paymentSettings.currency}
                      onChange={(e) => setPaymentSettings({...paymentSettings, currency: e.target.value})}
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="AUD">AUD - Australian Dollar</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="processingFee" className="block text-sm font-medium text-gray-700">
                      {t('Processing Fee (%)')}
                    </label>
                    <input
                      type="number"
                      id="processingFee"
                      min="0"
                      step="0.1"
                      max="10"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={paymentSettings.processingFee}
                      onChange={(e) => setPaymentSettings({...paymentSettings, processingFee: parseFloat(e.target.value)})}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="minimumPayout" className="block text-sm font-medium text-gray-700">
                      {t('Minimum Payout Amount')}
                    </label>
                    <input
                      type="number"
                      id="minimumPayout"
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={paymentSettings.minimumPayout}
                      onChange={(e) => setPaymentSettings({...paymentSettings, minimumPayout: parseInt(e.target.value)})}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="payoutSchedule" className="block text-sm font-medium text-gray-700">
                      {t('Payout Schedule')}
                    </label>
                    <select
                      id="payoutSchedule"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={paymentSettings.payoutSchedule}
                      onChange={(e) => setPaymentSettings({...paymentSettings, payoutSchedule: e.target.value})}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4 mt-8">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">{t('Payment Gateways')}</h3>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableStripe"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={paymentSettings.enableStripe}
                      onChange={(e) => setPaymentSettings({...paymentSettings, enableStripe: e.target.checked})}
                    />
                    <label htmlFor="enableStripe" className="ml-2 block text-sm text-gray-900">
                      {t('Enable Stripe')}
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enablePayPal"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={paymentSettings.enablePayPal}
                      onChange={(e) => setPaymentSettings({...paymentSettings, enablePayPal: e.target.checked})}
                    />
                    <label htmlFor="enablePayPal" className="ml-2 block text-sm text-gray-900">
                      {t('Enable PayPal')}
                    </label>
                  </div>
                  
                  <div className="flex items-center mt-4">
                    <input
                      type="checkbox"
                      id="testMode"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={paymentSettings.testMode}
                      onChange={(e) => setPaymentSettings({...paymentSettings, testMode: e.target.checked})}
                    />
                    <label htmlFor="testMode" className="ml-2 block text-sm text-gray-900">
                      {t('Enable Test Mode')}
                    </label>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t('Test Payment Integration')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminGlobalSettings; 