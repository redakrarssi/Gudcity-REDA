import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { 
  Settings as SettingsIcon, 
  Building2, 
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
  Store,
  Clock,
  DollarSign,
  Percent,
  Users,
  Send
} from 'lucide-react';

// Define types for nested objects
interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    isClosed: boolean;
  };
}

interface LoyaltySettings {
  pointsPerDollar: number;
  pointsExpiryDays: number;
  minimumPointsRedemption: number;
  welcomeBonus: number;
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  customerActivity: boolean;
  promotionStats: boolean;
  systemUpdates: boolean;
}

interface Integrations {
  pos: boolean;
  accounting: boolean;
  marketing: boolean;
  crm: boolean;
}

interface BusinessData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  language: string;
  country: string;
  currency: string;
  timezone: string;
  joinDate: string;
  taxId: string;
  businessHours: BusinessHours;
  paymentSettings: {
    acceptsCard: boolean;
    acceptsCash: boolean;
    acceptsOnline: boolean;
    serviceFeePercent: number;
  };
  loyaltySettings: LoyaltySettings;
  notificationSettings: NotificationSettings;
  integrations: Integrations;
}

// Mock business data - replace with actual business auth in production
const MOCK_BUSINESS: BusinessData = {
  id: 'biz123',
  name: 'Coffee Haven',
  email: 'info@coffeehaven.com',
  phone: '+1 555-987-6543',
  address: '123 Main St, Downtown',
  language: 'en',
  country: 'United States',
  currency: 'USD',
  timezone: 'America/New_York',
  joinDate: '2023-01-10',
  taxId: 'TAX12345678',
  businessHours: {
    monday: { open: '08:00', close: '20:00', isClosed: false },
    tuesday: { open: '08:00', close: '20:00', isClosed: false },
    wednesday: { open: '08:00', close: '20:00', isClosed: false },
    thursday: { open: '08:00', close: '20:00', isClosed: false },
    friday: { open: '08:00', close: '22:00', isClosed: false },
    saturday: { open: '09:00', close: '22:00', isClosed: false },
    sunday: { open: '10:00', close: '18:00', isClosed: false }
  },
  paymentSettings: {
    acceptsCard: true,
    acceptsCash: true,
    acceptsOnline: true,
    serviceFeePercent: 2.5
  },
  loyaltySettings: {
    pointsPerDollar: 10,
    pointsExpiryDays: 365,
    minimumPointsRedemption: 100,
    welcomeBonus: 50
  },
  notificationSettings: {
    email: true,
    push: true,
    sms: false,
    customerActivity: true,
    promotionStats: true,
    systemUpdates: true
  },
  integrations: {
    pos: true,
    accounting: false,
    marketing: true,
    crm: false
  }
};

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

// Timezones (abbreviated list)
const TIMEZONES = [
  { code: 'America/New_York', name: 'Eastern Time (ET)' },
  { code: 'America/Chicago', name: 'Central Time (CT)' },
  { code: 'America/Denver', name: 'Mountain Time (MT)' },
  { code: 'America/Los_Angeles', name: 'Pacific Time (PT)' },
  { code: 'Europe/London', name: 'Greenwich Mean Time (GMT)' },
  { code: 'Europe/Paris', name: 'Central European Time (CET)' },
  { code: 'Asia/Dubai', name: 'Gulf Standard Time (GST)' },
  { code: 'Asia/Tokyo', name: 'Japan Standard Time (JST)' }
];

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

const BusinessSettings = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('business');
  const [animateIn, setAnimateIn] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [businessData, setBusinessData] = useState<BusinessData>(MOCK_BUSINESS);
  const [formData, setFormData] = useState<BusinessData>(MOCK_BUSINESS);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    // Trigger animation after a short delay
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      
      // Handle nested objects based on name format (e.g., "notificationSettings.email")
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        setFormData(prev => {
          const updatedParent = {
            ...prev[parent as keyof BusinessData] as Record<string, any>,
            [child]: checked
          };
          
          return {
            ...prev,
            [parent]: updatedParent
          };
        });
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: checked
        }));
      }
    } else {
      // Handle nested objects
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        setFormData(prev => {
          const updatedParent = {
            ...prev[parent as keyof BusinessData] as Record<string, any>,
            [child]: value
          };
          
          return {
            ...prev,
            [parent]: updatedParent
          };
        });
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    }
  };

  const handleBusinessHoursChange = (day: string, field: string, value: string) => {
    setFormData(prev => {
      const businessHours = { ...prev.businessHours };
      const dayData = { ...businessHours[day] };
      
      if (field === 'isClosed') {
        dayData.isClosed = value === 'true';
      } else {
        (dayData as any)[field] = value;
      }
      
      businessHours[day] = dayData;
      
      return {
        ...prev,
        businessHours
      };
    });
  };

  const handleSaveSettings = () => {
    // Simulate API call
    setTimeout(() => {
      try {
        // Update language if changed
        if (formData.language !== businessData.language) {
          i18n.changeLanguage(formData.language);
        }
        
        setBusinessData(formData);
        setSaveSuccess(true);
        setEditMode(false);
        
        // Clear success message after delay
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } catch (error) {
        setSaveError(true);
        setTimeout(() => {
          setSaveError(false);
        }, 3000);
      }
    }, 800);
  };

  const handleCancelEdit = () => {
    setFormData(businessData);
    setEditMode(false);
  };

  const renderBusinessSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Building2 className="w-5 h-5 text-blue-500 mr-2" />
            {t('Business Information')}
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
              >
                <Save className="w-4 h-4 mr-1.5" />
                {t('Save')}
              </button>
            </div>
          )}
        </div>
        
        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
            <Check className="w-5 h-5 mr-2" />
            {t('Your business settings have been successfully updated')}
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
              {t('Business Name')}
            </label>
            {editMode ? (
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-gray-800">{businessData.name}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Business Email')}
            </label>
            {editMode ? (
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-gray-800">{businessData.email}</p>
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
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-gray-800">{businessData.phone}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Tax ID / Business Registration')}
            </label>
            {editMode ? (
              <input
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-gray-800">{businessData.taxId}</p>
            )}
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Business Address')}
            </label>
            {editMode ? (
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-gray-800">{businessData.address}</p>
            )}
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
                name="language"
                value={formData.language}
                onChange={handleInputChange}
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
                {LANGUAGES.find(lang => lang.code === businessData.language)?.name || businessData.language}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Currency')}
            </label>
            {editMode ? (
              <select
                name="currency"
                value={formData.currency}
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
                {CURRENCIES.find(c => c.code === businessData.currency)?.name || businessData.currency}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Timezone')}
            </label>
            {editMode ? (
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.code} value={tz.code}>
                    {tz.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-800">
                {TIMEZONES.find(tz => tz.code === businessData.timezone)?.name || businessData.timezone}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Member Since')}
            </label>
            <p className="text-gray-800">{new Date(businessData.joinDate).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBusinessHours = () => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <Clock className="w-5 h-5 text-blue-500 mr-2" />
          {t('Business Hours')}
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
            >
              <Save className="w-4 h-4 mr-1.5" />
              {t('Save')}
            </button>
          </div>
        )}
      </div>
      
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
          <Check className="w-5 h-5 mr-2" />
          {t('Your business hours have been successfully updated')}
        </div>
      )}
      
      {saveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {t('There was an error updating your business hours. Please try again.')}
        </div>
      )}
      
      <div className="space-y-4">
        {DAYS_OF_WEEK.map((day) => {
          const dayData = formData.businessHours[day as keyof typeof formData.businessHours];
          const isClosedValue = dayData?.isClosed ? 'true' : 'false';
          
          return (
            <div key={day} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700 capitalize">{t(day)}</h3>
                
                {editMode ? (
                  <div className="flex items-center">
                    <label className="inline-flex items-center mr-4">
                      <input
                        type="radio"
                        name={`${day}-status`}
                        value="false"
                        checked={!dayData?.isClosed}
                        onChange={() => handleBusinessHoursChange(day, 'isClosed', 'false')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-600">{t('Open')}</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name={`${day}-status`}
                        value="true"
                        checked={dayData?.isClosed}
                        onChange={() => handleBusinessHoursChange(day, 'isClosed', 'true')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-600">{t('Closed')}</span>
                    </label>
                  </div>
                ) : (
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${dayData?.isClosed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                    {dayData?.isClosed ? t('Closed') : t('Open')}
                  </span>
                )}
              </div>
              
              {!dayData?.isClosed && (
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('Open')}</label>
                    {editMode ? (
                      <input
                        type="time"
                        name={`${day}-open`}
                        value={dayData?.open || ''}
                        onChange={(e) => handleBusinessHoursChange(day, 'open', e.target.value)}
                        disabled={dayData?.isClosed}
                        className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                      />
                    ) : (
                      <span className="text-sm text-gray-700">{dayData?.open}</span>
                    )}
                  </div>
                  <div className="text-gray-400">—</div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('Close')}</label>
                    {editMode ? (
                      <input
                        type="time"
                        name={`${day}-close`}
                        value={dayData?.close || ''}
                        onChange={(e) => handleBusinessHoursChange(day, 'close', e.target.value)}
                        disabled={dayData?.isClosed}
                        className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                      />
                    ) : (
                      <span className="text-sm text-gray-700">{dayData?.close}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderLoyaltySettings = () => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <CreditCard className="w-5 h-5 text-blue-500 mr-2" />
          {t('Loyalty Program Settings')}
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
            >
              <Save className="w-4 h-4 mr-1.5" />
              {t('Save')}
            </button>
          </div>
        )}
      </div>
      
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
          <Check className="w-5 h-5 mr-2" />
          {t('Your loyalty program settings have been successfully updated')}
        </div>
      )}
      
      {saveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {t('There was an error updating your loyalty settings. Please try again.')}
        </div>
      )}
      
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('Points Per Dollar')}
          </label>
          {editMode ? (
            <div className="flex items-center">
              <input
                type="number"
                name="loyaltySettings.pointsPerDollar"
                value={formData.loyaltySettings.pointsPerDollar}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="ml-2 text-gray-500">{t('points')}</span>
            </div>
          ) : (
            <p className="text-gray-800">
              {businessData.loyaltySettings.pointsPerDollar} {t('points per dollar')}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('Welcome Bonus')}
          </label>
          {editMode ? (
            <div className="flex items-center">
              <input
                type="number"
                name="loyaltySettings.welcomeBonus"
                value={formData.loyaltySettings.welcomeBonus}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="ml-2 text-gray-500">{t('points')}</span>
            </div>
          ) : (
            <p className="text-gray-800">
              {businessData.loyaltySettings.welcomeBonus} {t('points')}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('Points Expiry')}
          </label>
          {editMode ? (
            <div className="flex items-center">
              <input
                type="number"
                name="loyaltySettings.pointsExpiryDays"
                value={formData.loyaltySettings.pointsExpiryDays}
                onChange={handleInputChange}
                min="30"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="ml-2 text-gray-500">{t('days')}</span>
            </div>
          ) : (
            <p className="text-gray-800">
              {businessData.loyaltySettings.pointsExpiryDays} {t('days')}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('Minimum Points for Redemption')}
          </label>
          {editMode ? (
            <div className="flex items-center">
              <input
                type="number"
                name="loyaltySettings.minimumPointsRedemption"
                value={formData.loyaltySettings.minimumPointsRedemption}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="ml-2 text-gray-500">{t('points')}</span>
            </div>
          ) : (
            <p className="text-gray-800">
              {businessData.loyaltySettings.minimumPointsRedemption} {t('points')}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-6">
        <Bell className="w-5 h-5 text-blue-500 mr-2" />
        {t('Notification Preferences')}
      </h2>
      
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
          <Check className="w-5 h-5 mr-2" />
          {t('Your notification settings have been successfully updated')}
        </div>
      )}
      
      <div className="space-y-6">
        <div>
          <h3 className="text-md font-medium text-gray-700 mb-3">
            {t('Notification Channels')}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="email-notifications"
                name="notificationSettings.email"
                checked={formData.notificationSettings.email}
                onChange={handleInputChange}
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
                name="notificationSettings.push"
                checked={formData.notificationSettings.push}
                onChange={handleInputChange}
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
                name="notificationSettings.sms"
                checked={formData.notificationSettings.sms}
                onChange={handleInputChange}
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
                id="customer-activity"
                name="notificationSettings.customerActivity"
                checked={formData.notificationSettings.customerActivity}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="customer-activity" className="ml-2 block text-sm text-gray-700">
                {t('Customer Activity (new sign-ups, redemptions)')}
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="promotion-stats"
                name="notificationSettings.promotionStats"
                checked={formData.notificationSettings.promotionStats}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="promotion-stats" className="ml-2 block text-sm text-gray-700">
                {t('Promotion Statistics and Reports')}
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="system-updates"
                name="notificationSettings.systemUpdates"
                checked={formData.notificationSettings.systemUpdates}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="system-updates" className="ml-2 block text-sm text-gray-700">
                {t('System Updates and Announcements')}
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('Save Preferences')}
        </button>
      </div>
    </div>
  );

  const renderIntegrationSettings = () => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-6">
        <Store className="w-5 h-5 text-blue-500 mr-2" />
        {t('Third-Party Integrations')}
      </h2>
      
      <div className="space-y-6">
        <div className="border-b border-gray-100 pb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-medium text-gray-800">
                {t('Point of Sale (POS) System')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('Connect your POS system to automatically award points on purchases')}
              </p>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 text-sm font-medium ${formData.integrations.pos ? 'text-green-600' : 'text-gray-500'}`}>
                {formData.integrations.pos ? t('Connected') : t('Not Connected')}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox"
                  name="integrations.pos"
                  checked={formData.integrations.pos}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-100 pb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-medium text-gray-800">
                {t('Accounting Software')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('Connect your accounting software to track loyalty program expenses')}
              </p>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 text-sm font-medium ${formData.integrations.accounting ? 'text-green-600' : 'text-gray-500'}`}>
                {formData.integrations.accounting ? t('Connected') : t('Not Connected')}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox"
                  name="integrations.accounting"
                  checked={formData.integrations.accounting}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-100 pb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-medium text-gray-800">
                {t('Marketing Platform')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('Connect your marketing tools to send targeted promotions')}
              </p>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 text-sm font-medium ${formData.integrations.marketing ? 'text-green-600' : 'text-gray-500'}`}>
                {formData.integrations.marketing ? t('Connected') : t('Not Connected')}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox"
                  name="integrations.marketing"
                  checked={formData.integrations.marketing}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-medium text-gray-800">
                {t('CRM System')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('Connect your CRM to sync customer data across platforms')}
              </p>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 text-sm font-medium ${formData.integrations.crm ? 'text-green-600' : 'text-gray-500'}`}>
                {formData.integrations.crm ? t('Connected') : t('Not Connected')}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox"
                  name="integrations.crm"
                  checked={formData.integrations.crm}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('Save Integration Settings')}
        </button>
      </div>
    </div>
  );

  return (
    <BusinessLayout>
      <div className="space-y-6 pb-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className={`transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
                <SettingsIcon className="w-6 h-6 text-blue-500 mr-2" />
                {t('Business Settings')}
              </h1>
              <p className="text-gray-500 mt-1">{t('Manage your business profile, preferences and loyalty program settings')}</p>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-500 ease-out transform delay-100 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('business')}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'business'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('Business Profile')}
            </button>
            <button
              onClick={() => setActiveTab('hours')}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'hours'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('Business Hours')}
            </button>
            <button
              onClick={() => setActiveTab('loyalty')}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'loyalty'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('Loyalty Program')}
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'notifications'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('Notifications')}
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'integrations'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('Integrations')}
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className={`transition-all duration-500 ease-out transform delay-200 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {activeTab === 'business' && renderBusinessSettings()}
          {activeTab === 'hours' && renderBusinessHours()}
          {activeTab === 'loyalty' && renderLoyaltySettings()}
          {activeTab === 'notifications' && renderNotificationSettings()}
          {activeTab === 'integrations' && renderIntegrationSettings()}
        </div>
        
        {/* Help Section */}
        <div className={`mt-8 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100 transition-all duration-500 ease-out transform delay-300 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-lg font-medium text-gray-800 flex items-center mb-2">
            <HelpCircle className="w-5 h-5 text-indigo-500 mr-2" />
            {t('Need Help?')}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {t('If you have any questions about your business settings or loyalty program configuration, our support team is here to help.')}
          </p>
          <button
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <Send className="w-4 h-4 mr-1.5" />
            {t('Contact Business Support')}
          </button>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default BusinessSettings; 