import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Heart, Check, ChevronLeft, ChevronRight, Image, AlertCircle, MapPin, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Interest categories for customers to select
const INTEREST_CATEGORIES = [
  'Food & Dining', 'Shopping', 'Entertainment', 'Health & Wellness', 
  'Beauty & Spa', 'Sports', 'Outdoors', 'Education', 'Technology',
  'Arts & Culture', 'Home Services', 'Travel', 'Local Events'
];

interface CustomerSetupData {
  profilePicture: string;
  displayName: string;
  location: string;
  birthdate: string;
  bio: string;
  interests: string[];
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacySettings: {
    profileVisibility: 'public' | 'private' | 'friends';
    locationSharing: boolean;
    activitySharing: boolean;
  };
}

const CustomerSetupWizard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Steps in the wizard
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  // Form data
  const [formData, setFormData] = useState<CustomerSetupData>({
    profilePicture: '',
    displayName: user?.name || user?.email?.split('@')[0] || '',
    location: '',
    birthdate: '',
    bio: '',
    interests: [],
    notificationPreferences: {
      email: true,
      push: true,
      sms: false
    },
    privacySettings: {
      profileVisibility: 'public',
      locationSharing: true,
      activitySharing: true
    }
  });
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewProfilePic, setPreviewProfilePic] = useState<string | null>(null);
  
  // Navigation between steps
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Profile picture upload handler
  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      // In a real app, you would upload the file to a server and get a URL back
      // For now, we'll just create a local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewProfilePic(result);
        setFormData({ ...formData, profilePicture: result });
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Interest toggles
  const toggleInterest = (interest: string) => {
    if (formData.interests.includes(interest)) {
      setFormData({
        ...formData,
        interests: formData.interests.filter(i => i !== interest)
      });
    } else {
      setFormData({
        ...formData,
        interests: [...formData.interests, interest]
      });
    }
  };
  
  // Form submission
  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // In a real app, you would send the data to your backend
      console.log('Submitting customer profile data:', formData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Navigate to the customer dashboard
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render the appropriate step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">{t('Personal Information')}</h2>
            <p className="text-gray-600">{t('Tell us a bit about yourself')}</p>
            
            <div className="flex flex-col items-center mb-6">
              <div 
                className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer mb-2"
                onClick={() => document.getElementById('profile-pic-upload')?.click()}
              >
                {previewProfilePic ? (
                  <img src={previewProfilePic} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <label
                htmlFor="profile-pic-upload"
                className="text-sm text-blue-600 cursor-pointer"
              >
                {t('Upload Photo')}
              </label>
              <input
                type="file"
                id="profile-pic-upload"
                className="hidden"
                accept="image/*"
                onChange={handleProfilePicChange}
              />
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Display Name')}
                </label>
                <input
                  type="text"
                  id="displayName"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Location')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="location"
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('City, State')}
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="birthdate" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Birthdate')} <span className="text-gray-500 text-xs">({t('Optional')})</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="birthdate"
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.birthdate}
                    onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('About Me')} <span className="text-gray-500 text-xs">({t('Optional')})</span>
                </label>
                <textarea
                  id="bio"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('Tell us a bit about yourself...')}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">{t('Your Interests')}</h2>
            <p className="text-gray-600">{t('Select categories you\'re interested in to personalize your experience')}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
              {INTEREST_CATEGORIES.map(interest => (
                <div
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.interests.includes(interest)
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    {formData.interests.includes(interest) && (
                      <Check className="w-4 h-4 mr-2 text-blue-500" />
                    )}
                    <span>{t(interest)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">{t('Preferences')}</h2>
            <p className="text-gray-600">{t('Customize your notification and privacy settings')}</p>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">{t('Notifications')}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">{t('Email Notifications')}</h4>
                    <p className="text-xs text-gray-500">{t('Receive updates and offers via email')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.notificationPreferences.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        notificationPreferences: {
                          ...formData.notificationPreferences,
                          email: e.target.checked
                        }
                      })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">{t('Push Notifications')}</h4>
                    <p className="text-xs text-gray-500">{t('Receive real-time updates on your device')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.notificationPreferences.push}
                      onChange={(e) => setFormData({
                        ...formData,
                        notificationPreferences: {
                          ...formData.notificationPreferences,
                          push: e.target.checked
                        }
                      })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">{t('SMS Notifications')}</h4>
                    <p className="text-xs text-gray-500">{t('Receive updates via text message')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.notificationPreferences.sms}
                      onChange={(e) => setFormData({
                        ...formData,
                        notificationPreferences: {
                          ...formData.notificationPreferences,
                          sms: e.target.checked
                        }
                      })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-800 mb-3">{t('Privacy')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Profile Visibility')}
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.privacySettings.profileVisibility}
                    onChange={(e) => setFormData({
                      ...formData,
                      privacySettings: {
                        ...formData.privacySettings,
                        profileVisibility: e.target.value as 'public' | 'private' | 'friends'
                      }
                    })}
                  >
                    <option value="public">{t('Public - Anyone can view')}</option>
                    <option value="friends">{t('Friends Only - Only connections can view')}</option>
                    <option value="private">{t('Private - Only you can view')}</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">{t('Location Sharing')}</h4>
                    <p className="text-xs text-gray-500">{t('Allow businesses to see your general location')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.privacySettings.locationSharing}
                      onChange={(e) => setFormData({
                        ...formData,
                        privacySettings: {
                          ...formData.privacySettings,
                          locationSharing: e.target.checked
                        }
                      })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">{t('Activity Sharing')}</h4>
                    <p className="text-xs text-gray-500">{t('Allow sharing of your reviews and activities')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.privacySettings.activitySharing}
                      onChange={(e) => setFormData({
                        ...formData,
                        privacySettings: {
                          ...formData.privacySettings,
                          activitySharing: e.target.checked
                        }
                      })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('Complete Your Profile')}
          </h1>
          <p className="text-gray-600">
            {t('Tell us a bit about yourself to get the most out of GudCity')}
          </p>
          
          {/* Progress indicator */}
          <div className="flex justify-between items-center mt-8 mb-8">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <React.Fragment key={index}>
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep > index
                      ? 'bg-blue-600 text-white'
                      : currentStep === index + 1
                      ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {currentStep > index ? <Check className="w-5 h-5" /> : index + 1}
                </div>
                
                {index < totalSteps - 1 && (
                  <div 
                    className={`flex-1 h-1 ${
                      currentStep > index + 1 ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Step content */}
        {renderStep()}
        
        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-4 py-2 flex items-center text-gray-700 rounded-md ${
              currentStep === 1
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-100'
            }`}
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            {t('Previous')}
          </button>
          
          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700"
            >
              {t('Next')}
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? t('Saving...') : t('Complete Setup')}
              {!isLoading && <Check className="w-5 h-5 ml-1" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerSetupWizard; 