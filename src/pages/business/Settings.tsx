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
  Send,
  Link,
  RefreshCw,
  Loader
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BusinessSettingsService, type BusinessSettings } from '../../services/businessSettingsService';
import { useBusinessCurrency } from '../../contexts/BusinessCurrencyContext';
import LanguageSelector from '../../components/LanguageSelector';

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
  businessName: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  website: string;
  logo: string;
  country: string;
  language: string;
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

// Available languages
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'ar', name: 'العربية' }
];

// MENA and European Countries
const COUNTRIES = [
  // MENA Countries
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'EG', name: 'Egypt' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LY', name: 'Libya' },
  { code: 'MA', name: 'Morocco' },
  { code: 'OM', name: 'Oman' },
  { code: 'QA', name: 'Qatar' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SY', name: 'Syria' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'YE', name: 'Yemen' },
  // European Countries
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DE', name: 'Germany' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'ES', name: 'Spain' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'GR', name: 'Greece' },
  { code: 'HR', name: 'Croatia' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'LV', name: 'Latvia' },
  { code: 'MT', name: 'Malta' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SE', name: 'Sweden' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SK', name: 'Slovakia' }
];

// Available currencies for MENA and Europe
const CURRENCIES = [
  // MENA Currencies
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'DZD', name: 'Algerian Dinar' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'IQD', name: 'Iraqi Dinar' },
  { code: 'JOD', name: 'Jordanian Dinar' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'LBP', name: 'Lebanese Pound' },
  { code: 'LYD', name: 'Libyan Dinar' },
  { code: 'MAD', name: 'Moroccan Dirham' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'SYP', name: 'Syrian Pound' },
  { code: 'TND', name: 'Tunisian Dinar' },
  { code: 'YER', name: 'Yemeni Rial' },
  // European Currencies
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'TRY', name: 'Turkish Lira' },
  // Common international currency
  { code: 'USD', name: 'US Dollar' }
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

// Convert BusinessSettings from service to BusinessData for the component
const convertBusinessSettingsToData = (settings: BusinessSettings, userEmail: string): BusinessData => {
  console.log('Converting business settings to data:', settings);
  
  // Use businessName as the primary name, fallback to name if needed
  const displayName = settings.businessName || settings.name || '';
  
  return {
    id: settings.businessId.toString(),
    name: displayName,
    businessName: displayName,
    email: settings.email || userEmail,
    phone: settings.phone,
    address: settings.address,
    description: settings.description,
    website: settings.website,
    logo: settings.logo,
    language: settings.language,
    country: settings.country,
    currency: settings.currency,
    timezone: settings.timezone,
    joinDate: settings.createdAt,
    taxId: settings.taxId,
    businessHours: settings.businessHours,
    paymentSettings: settings.paymentSettings,
    loyaltySettings: settings.loyaltySettings,
    notificationSettings: settings.notificationSettings,
    integrations: settings.integrations
  };
};

const BusinessSettings = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { refreshCurrency } = useBusinessCurrency();
  const [activeTab, setActiveTab] = useState('business');
  const [animateIn, setAnimateIn] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [formData, setFormData] = useState<BusinessData | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('There was an error updating your settings. Please try again.');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Trigger animation after a short delay
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // Load business settings from database
  const loadBusinessSettings = async () => {
    if (!user) {
      setLoading(false);
      setError('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const settings = await BusinessSettingsService.getBusinessSettings(user.id);
      console.log('Loaded business settings:', settings);
      
      if (settings) {
        const businessDataConverted = convertBusinessSettingsToData(settings, user.email);
        console.log('Converted business data:', businessDataConverted);
        
        // Ensure name and businessName are consistent
        if (businessDataConverted.name !== businessDataConverted.businessName) {
          const preferredName = businessDataConverted.businessName || businessDataConverted.name;
          businessDataConverted.name = preferredName;
          businessDataConverted.businessName = preferredName;
        }
        
        setBusinessData(businessDataConverted);
        setFormData(businessDataConverted);
      } else {
        setError('Failed to load business settings');
      }
    } catch (err) {
      console.error('Error loading business settings:', err);
      setError('An error occurred while loading settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinessSettings();
  }, [user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (!formData) return;
    
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      
      // Handle nested objects based on name format (e.g., "notificationSettings.email")
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        setFormData(prev => {
          if (!prev) return prev;
          
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
        setFormData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            [name]: checked
          };
        });
      }
    } else {
      // Handle nested objects
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        setFormData(prev => {
          if (!prev) return prev;
          
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
        setFormData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            [name]: value
          };
        });
      }
    }
  };

  const handleBusinessHoursChange = (day: string, field: string, value: string) => {
    if (!formData) return;
    
    setFormData(prev => {
      if (!prev) return prev;
      
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

  const handleSaveSettings = async () => {
    if (!formData || !user) return;
    
    setLoading(true);
    setSaveSuccess(false);
    setSaveError(false);
    setErrorMessage('There was an error updating your settings. Please try again.');
    
    try {
      console.log('Saving business settings with form data:', formData);
      
      // Convert form data to BusinessSettings format
      const businessSettings: Partial<BusinessSettings> = {
        businessId: parseInt(formData.id),
        name: formData.name,
        businessName: formData.businessName,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        description: formData.description,
        website: formData.website,
        logo: formData.logo,
        language: formData.language,
        country: formData.country,
        currency: formData.currency,
        timezone: formData.timezone,
        taxId: formData.taxId,
        businessHours: formData.businessHours,
        paymentSettings: formData.paymentSettings,
        loyaltySettings: formData.loyaltySettings,
        notificationSettings: formData.notificationSettings,
        integrations: formData.integrations
      };
      
      // Make sure both name and businessName are set to the same value
      // This ensures the update works regardless of which field the service uses
      if (businessSettings.name && !businessSettings.businessName) {
        businessSettings.businessName = businessSettings.name;
      } else if (businessSettings.businessName && !businessSettings.name) {
        businessSettings.name = businessSettings.businessName;
      }
      
      console.log('Sending business settings to service:', businessSettings);
      
      // Call service to update settings
      const updatedSettings = await BusinessSettingsService.updateBusinessSettings(
        user.id,
        businessSettings
      );
      
      if (updatedSettings) {
        // Update the displayed data with the response from the server
        const businessDataConverted = convertBusinessSettingsToData(updatedSettings, user.email);
        setBusinessData(businessDataConverted);
        setFormData(businessDataConverted);
        
        // Update language if changed
        if (businessDataConverted.language !== i18n.language) {
          i18n.changeLanguage(businessDataConverted.language);
        }
        
        setSaveSuccess(true);
        setEditMode(false);
        
        // Refresh currency context if currency was changed
        if (businessSettings.currency) {
          refreshCurrency();
        }
        
        // Clear success message after delay
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        setErrorMessage('Failed to save settings. Please try again.');
        setSaveError(true);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      
      // Set a more detailed error message
      if (error instanceof Error) {
        const errorMsg = error.message;
        
        // Check for specific error patterns and provide more helpful messages
        if (errorMsg.includes('column') && errorMsg.includes('does not exist')) {
          setErrorMessage(`Database schema error: ${errorMsg}. Please contact support with error code DB-SCHEMA-001.`);
        } else if (errorMsg.includes('business_name')) {
          setErrorMessage(`Business name update failed: ${errorMsg}. Please try with a different name or contact support.`);
        } else if (errorMsg.includes('JSON')) {
          setErrorMessage(`Invalid data format: ${errorMsg}. Please check your input and try again.`);
        } else if (errorMsg.includes('business_profile')) {
          setErrorMessage(`Business profile error: ${errorMsg}. Please contact support with error code BIZ-PROF-001.`);
        } else if (errorMsg.includes('loyalty settings')) {
          setErrorMessage(`Loyalty settings error: ${errorMsg}. Please contact support with error code LOYALTY-001.`);
        } else {
          // Default error message with the specific error
          setErrorMessage(`Error updating settings: ${errorMsg}`);
        }
      } else {
        setErrorMessage('Failed to save settings. Please try again or contact support.');
      }
      setSaveError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (businessData) {
      setFormData(businessData);
    }
    setEditMode(false);
  };
  
  // Show loading state when initially loading
  if (loading && !businessData) {
    return (
      <BusinessLayout>
        <div className="flex flex-col items-center justify-center h-64 loading-state">
          <div className="flex items-center justify-center mb-4">
            <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
          <span className="text-lg text-gray-600">{t('business.Loading business settings...')}</span>
        </div>
      </BusinessLayout>
    );
  }

  // Show error state if there was an error loading the data
  if (error && !businessData) {
    return (
      <BusinessLayout>
        <div className="max-w-5xl mx-auto mt-10">
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 error-state">
            <h2 className="text-lg font-semibold flex items-center mb-2">
              <AlertCircle className="w-5 h-5 mr-2" />
              {t('business.Error Loading Settings')}
            </h2>
            <p>{t(error)}</p>
            <button 
              onClick={() => loadBusinessSettings()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('business.Try Again')}
            </button>
          </div>
        </div>
      </BusinessLayout>
    );
  }
  
  // If no data to render, don't continue
  if (!businessData || !formData) {
    return (
      <BusinessLayout>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 empty-state">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{t('business.No business settings found')}</p>
            </div>
          </div>
        </div>
      </BusinessLayout>
    );
  }

  const renderBusinessSettings = () => {
    if (!formData || !businessData) return null;
    
    return (
      <div className="space-y-6 settings-section">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <Building2 className="w-5 h-5 text-blue-500 mr-2" />
              {t('business.Business Information')}
            </h2>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <Edit3 className="w-4 h-4 mr-1.5" />
                {t('business.Edit')}
              </button>
            ) : (
              <div className="flex gap-2 action-buttons">
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  <X className="w-4 h-4 mr-1.5" />
                  {t('business.Cancel')}
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="flex items-center text-sm text-green-600 hover:text-green-800 font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 mr-1.5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Save className="w-4 h-4 mr-1.5" />
                  )}
                  {t('business.Save')}
                </button>
              </div>
            )}
          </div>
          
          {saveSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
              <Check className="w-5 h-5 mr-2" />
              {t('business.Your business settings have been successfully updated')}
            </div>
          )}
          
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <div className="flex items-center mb-1">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="font-medium">{t('business.Error Updating Settings')}</span>
              </div>
              <p className="ml-7">{t(errorMessage)}</p>
              <div className="ml-7 mt-2">
                <button
                  onClick={() => setSaveError(false)}
                  className="text-xs text-red-700 underline hover:text-red-900 mr-4"
                >
                  {t('business.Dismiss')}
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="text-xs text-blue-600 underline hover:text-blue-800"
                >
                  {t('business.Try Again')}
                </button>
              </div>
            </div>
          )}
          
          <div className="grid gap-6 md:grid-cols-2 business-info-grid">
            <div className="form-group business-info-item">
              <label className="block text-sm font-medium text-gray-700 mb-1 info-label">
                {t('business.Business Name')}
              </label>
              {editMode ? (
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="text-gray-800 info-value">{businessData.businessName}</p>
              )}
            </div>
            
            <div className="form-group business-info-item">
              <label className="block text-sm font-medium text-gray-700 mb-1 info-label">
                {t('business.Business Email')}
              </label>
              <p className="text-gray-800 info-value">{businessData.email}</p>
            </div>
            
            <div className="form-group business-info-item">
              <label className="block text-sm font-medium text-gray-700 mb-1 info-label">
                {t('business.Phone Number')}
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
                <p className="text-gray-800 info-value">{businessData.phone}</p>
              )}
            </div>
            
            <div className="form-group business-info-item">
              <label className="block text-sm font-medium text-gray-700 mb-1 info-label">
                {t('business.Website')}
              </label>
              {editMode ? (
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="text-gray-800 info-value">
                  {businessData.website ? (
                    <a href={businessData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                      {businessData.website} <Link className="w-3 h-3 ml-1" />
                    </a>
                  ) : (
                    t('business.Not specified')
                  )}
                </p>
              )}
            </div>
            
            <div className="md:col-span-2 form-group business-info-item">
              <label className="block text-sm font-medium text-gray-700 mb-1 info-label">
                {t('business.Business Description')}
              </label>
              {editMode ? (
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange as React.ChangeEventHandler<HTMLTextAreaElement>}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="text-gray-800 info-value">{businessData.description || t('business.No description provided')}</p>
              )}
            </div>
            
            <div className="md:col-span-2 form-group business-info-item">
              <label className="block text-sm font-medium text-gray-700 mb-1 info-label">
                {t('business.Business Address')}
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
                <p className="text-gray-800 whitespace-pre-line info-value">{businessData.address || t('business.No address provided')}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.Country')}
              </label>
              {editMode ? (
                <select
                  name="country"
                  value={formData.country || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('business.Select a country')}</option>
                  <optgroup label={t('business.MENA Region')}>
                    {COUNTRIES.slice(0, 16).map(country => (
                      <option key={country.code} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={t('business.Europe')}>
                    {COUNTRIES.slice(16).map(country => (
                      <option key={country.code} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              ) : (
                <p className="text-gray-800">{businessData.country || 'Not specified'}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.Currency')}
              </label>
              {editMode ? (
                <select
                  name="currency"
                  value={formData.currency || 'EUR'}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <optgroup label={t('business.MENA Currencies')}>
                    {CURRENCIES.slice(0, 16).map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={t('business.European Currencies')}>
                    {CURRENCIES.slice(16, 27).map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={t('business.International')}>
                    {CURRENCIES.slice(27).map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              ) : (
                <p className="text-gray-800">
                  {businessData.currency ? (
                    `${businessData.currency} - ${CURRENCIES.find(c => c.code === businessData.currency)?.name || ''}`
                  ) : (
                    'EUR - Euro'
                  )}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.settings.language')}
              </label>
              <div className="mt-1">
                <LanguageSelector 
                  variant="settings"
                  showIcon={true}
                  className="w-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t('business.Language changes will be applied immediately')}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.Member Since')}
              </label>
              <p className="text-gray-800">{new Date(businessData.joinDate).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBusinessHours = () => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <Clock className="w-5 h-5 text-blue-500 mr-2" />
          {t('business.Business Hours')}
        </h2>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Edit3 className="w-4 h-4 mr-1.5" />
            {t('business.Edit')}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancelEdit}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              <X className="w-4 h-4 mr-1.5" />
              {t('business.Cancel')}
            </button>
            <button
              onClick={handleSaveSettings}
              className="flex items-center text-sm text-green-600 hover:text-green-800 font-medium"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {t('business.Save')}
            </button>
          </div>
        )}
      </div>
      
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
          <Check className="w-5 h-5 mr-2" />
          {t('business.Your business hours have been successfully updated')}
        </div>
      )}
      
      {saveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <div className="flex items-center mb-1">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="font-medium">{t('business.Error Updating Settings')}</span>
          </div>
          <p className="ml-7">{t(errorMessage)}</p>
          <div className="ml-7 mt-2">
            <button
              onClick={() => setSaveError(false)}
              className="text-xs text-red-700 underline hover:text-red-900 mr-4"
            >
              {t('business.Dismiss')}
            </button>
            <button
              onClick={handleSaveSettings}
              className="text-xs text-blue-600 underline hover:text-blue-800"
            >
              {t('business.Try Again')}
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {DAYS_OF_WEEK.map((day) => {
          const dayData = formData.businessHours[day as keyof typeof formData.businessHours];
          const isClosedValue = dayData?.isClosed ? 'true' : 'false';
          
          return (
            <div key={day} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700 capitalize">{t(`business.${day}`)}</h3>
                
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
                      <span className="ml-2 text-sm text-gray-600">{t('business.Open')}</span>
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
                      <span className="ml-2 text-sm text-gray-600">{t('business.Closed')}</span>
                    </label>
                  </div>
                ) : (
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${dayData?.isClosed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                    {dayData?.isClosed ? t('business.Closed') : t('business.Open')}
                  </span>
                )}
              </div>
              
              {!dayData?.isClosed && (
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('business.Open')}</label>
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
                    <label className="block text-xs text-gray-500 mb-1">{t('business.Close')}</label>
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
    <div className={`bg-white rounded-xl p-6 border border-gray-200 shadow-sm ${activeTab === 'loyalty' ? '' : 'hidden'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <DollarSign className="w-5 h-5 text-blue-500 mr-2" />
          {t('business.Loyalty Program Settings')}
        </h2>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            {t('business.Edit')}
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleSaveSettings}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center text-sm"
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              {t('business.Save')}
            </button>
            <button
              onClick={handleCancelEdit}
              className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded border border-gray-300 flex items-center text-sm"
            >
              <X className="w-4 h-4 mr-1" />
              {t('business.Cancel')}
            </button>
          </div>
        )}
      </div>
      
      {saveSuccess && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 animated fadeIn">
          <div className="flex">
            <div className="flex-shrink-0">
              <Check className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                {t('business.Your loyalty program settings have been updated successfully.')}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {saveError && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 animated fadeIn">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('business.Points per Unit Spent')}
          </label>
          <div className="relative">
            <input
              type="number"
              className={`block w-full px-4 py-2 border ${
                editMode ? 'border-gray-300' : 'border-gray-100 bg-gray-50'
              } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
              value={formData?.loyaltySettings.pointsPerDollar || 0}
              onChange={(e) => {
                if (!formData) return;
                const value = parseFloat(e.target.value);
                if (isNaN(value) || value < 0) return;
                
                setFormData({
                  ...formData,
                  loyaltySettings: {
                    ...formData.loyaltySettings,
                    pointsPerDollar: value
                  }
                });
              }}
              disabled={!editMode}
              min="0"
              step="0.1"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-500">{t('business.points')}</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {t('business.How many points customers earn for each unit spent at your business')}
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('business.Points Expiration')}
          </label>
          <div className="relative">
            <input
              type="number"
              className={`block w-full px-4 py-2 border ${
                editMode ? 'border-gray-300' : 'border-gray-100 bg-gray-50'
              } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
              value={formData?.loyaltySettings.pointsExpiryDays || 0}
              onChange={(e) => {
                if (!formData) return;
                const value = parseInt(e.target.value);
                if (isNaN(value) || value < 0) return;
                
                setFormData({
                  ...formData,
                  loyaltySettings: {
                    ...formData.loyaltySettings,
                    pointsExpiryDays: value
                  }
                });
              }}
              disabled={!editMode}
              min="0"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-500">{t('business.days')}</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {t('business.Number of days until points expire (0 = never expire)')}
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('business.Minimum Points for Redemption')}
          </label>
          <div className="relative">
            <input
              type="number"
              className={`block w-full px-4 py-2 border ${
                editMode ? 'border-gray-300' : 'border-gray-100 bg-gray-50'
              } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
              value={formData?.loyaltySettings.minimumPointsRedemption || 0}
              onChange={(e) => {
                if (!formData) return;
                const value = parseInt(e.target.value);
                if (isNaN(value) || value < 0) return;
                
                setFormData({
                  ...formData,
                  loyaltySettings: {
                    ...formData.loyaltySettings,
                    minimumPointsRedemption: value
                  }
                });
              }}
              disabled={!editMode}
              min="0"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-500">{t('business.points')}</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {t('business.Minimum number of points required for customers to redeem rewards')}
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('business.Welcome Bonus')}
          </label>
          <div className="relative">
            <input
              type="number"
              className={`block w-full px-4 py-2 border ${
                editMode ? 'border-gray-300' : 'border-gray-100 bg-gray-50'
              } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
              value={formData?.loyaltySettings.welcomeBonus || 0}
              onChange={(e) => {
                if (!formData) return;
                const value = parseInt(e.target.value);
                if (isNaN(value) || value < 0) return;
                
                setFormData({
                  ...formData,
                  loyaltySettings: {
                    ...formData.loyaltySettings,
                    welcomeBonus: value
                  }
                });
              }}
              disabled={!editMode}
              min="0"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-500">{t('business.points')}</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {t('business.Bonus points awarded to new customers when they join your loyalty program')}
          </p>
        </div>
        
        <div className="pt-4 border-t border-gray-200">
          <h3 className="font-medium text-gray-800 mb-2">{t('business.Points Value Calculator')}</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('business.Customer spends')}</p>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    className="block w-full pl-8 pr-12 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value="10"
                    disabled
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('business.Customer earns')}</p>
                <div className="relative">
                  <input
                    type="text"
                    className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-blue-50 text-blue-700 font-medium"
                    value={`${(10 * (formData?.loyaltySettings.pointsPerDollar || 0)).toFixed(0)} ${t('business.points')}`}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-6">
        <Bell className="w-5 h-5 text-blue-500 mr-2" />
        {t('business.Notification Preferences')}
      </h2>
      
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
          <Check className="w-5 h-5 mr-2" />
          {t('business.Your notification settings have been successfully updated')}
        </div>
      )}
      
      <div className="space-y-6">
        <div>
          <h3 className="text-md font-medium text-gray-700 mb-3">
            {t('business.Notification Channels')}
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
                {t('business.Email Notifications')}
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
                {t('business.Push Notifications')}
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
                {t('business.SMS Notifications')}
              </label>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-md font-medium text-gray-700 mb-3">
            {t('business.Notification Types')}
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
                {t('business.Customer Activity (new sign-ups, redemptions)')}
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
                {t('business.Promotion Statistics and Reports')}
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
                {t('business.System Updates and Announcements')}
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
          {t('business.Save Preferences')}
        </button>
      </div>
    </div>
  );

  const renderIntegrationSettings = () => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-6">
        <Store className="w-5 h-5 text-blue-500 mr-2" />
        {t('business.Third-Party Integrations')}
      </h2>
      
      <div className="space-y-6">
        <div className="border-b border-gray-100 pb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-medium text-gray-800">
                {t('business.Point of Sale (POS) System')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('business.Connect your POS system to automatically award points on purchases')}
              </p>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 text-sm font-medium ${formData.integrations.pos ? 'text-green-600' : 'text-gray-500'}`}>
                {formData.integrations.pos ? t('business.Connected') : t('business.Not Connected')}
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
                {t('business.Accounting Software')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('business.Connect your accounting software to track loyalty program expenses')}
              </p>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 text-sm font-medium ${formData.integrations.accounting ? 'text-green-600' : 'text-gray-500'}`}>
                {formData.integrations.accounting ? t('business.Connected') : t('business.Not Connected')}
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
                {t('business.Marketing Platform')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('business.Connect your marketing tools to send targeted promotions')}
              </p>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 text-sm font-medium ${formData.integrations.marketing ? 'text-green-600' : 'text-gray-500'}`}>
                {formData.integrations.marketing ? t('business.Connected') : t('business.Not Connected')}
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
                {t('business.CRM System')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('business.Connect your CRM to sync customer data across platforms')}
              </p>
            </div>
            <div className="flex items-center">
              <span className={`mr-3 text-sm font-medium ${formData.integrations.crm ? 'text-green-600' : 'text-gray-500'}`}>
                {formData.integrations.crm ? t('business.Connected') : t('business.Not Connected')}
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
          {t('business.Save Integration Settings')}
        </button>
      </div>
    </div>
  );

  return (
    <BusinessLayout>
      <div className="space-y-6 pb-10 max-w-5xl mx-auto business-settings-page">
        {/* Header */}
        <div className={`transition-all duration-500 ease-out transform business-settings-header ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
                <SettingsIcon className="w-6 h-6 text-blue-500 mr-2" />
                {t('business.Business Settings')}
              </h1>
              <p className="text-gray-500 mt-1">{t('business.Manage your business profile, preferences and loyalty program settings')}</p>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-500 ease-out transform delay-100 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex border-b border-gray-200 overflow-x-auto settings-tabs">
            <button
              onClick={() => setActiveTab('business')}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'business'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('business.Business Profile')}
            </button>
            <button
              onClick={() => setActiveTab('hours')}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'hours'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('business.Business Hours')}
            </button>
            <button
              onClick={() => setActiveTab('loyalty')}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'loyalty'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('business.Loyalty Program')}
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'notifications'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('business.Notifications')}
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'integrations'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('business.Integrations')}
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className={`transition-all duration-500 ease-out transform delay-200 settings-content ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {activeTab === 'business' && renderBusinessSettings()}
          {activeTab === 'hours' && renderBusinessHours()}
          {activeTab === 'loyalty' && renderLoyaltySettings()}
          {activeTab === 'notifications' && renderNotificationSettings()}
          {activeTab === 'integrations' && renderIntegrationSettings()}
        </div>
        
        {/* Help Section */}
        <div className={`mt-8 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100 transition-all duration-500 ease-out transform delay-300 help-section ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-lg font-medium text-gray-800 flex items-center mb-2">
            <HelpCircle className="w-5 h-5 text-indigo-500 mr-2" />
            {t('business.Need Help?')}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {t('business.If you have any questions about your business settings or loyalty program configuration, our support team is here to help.')}
          </p>
          <button
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium help-button"
          >
            <Send className="w-4 h-4 mr-1.5" />
            {t('business.Contact Business Support')}
          </button>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default BusinessSettings; 