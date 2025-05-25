import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload, Clock, Tag, Check, ChevronLeft, ChevronRight, Image, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Business category options
const BUSINESS_CATEGORIES = [
  'Restaurant', 'Retail', 'Cafe', 'Salon', 'Spa', 
  'Fitness', 'Healthcare', 'Education', 'Technology', 
  'Entertainment', 'Professional Services', 'Other'
];

// Business service types
interface ServiceType {
  id: string;
  name: string;
  description: string;
  price?: string;
}

interface BusinessSetupData {
  logoUrl: string;
  businessHours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  categories: string[];
  description: string;
  services: ServiceType[];
}

const BusinessSetupWizard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Steps in the wizard
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  // Form data
  const [formData, setFormData] = useState<BusinessSetupData>({
    logoUrl: '',
    businessHours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: true },
      sunday: { open: '09:00', close: '17:00', closed: true }
    },
    categories: [],
    description: '',
    services: []
  });
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  
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
  
  // Logo upload handlers
  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      // In a real app, you would upload the file to a server and get a URL back
      // For now, we'll just create a local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewLogo(result);
        setFormData({ ...formData, logoUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Business hours handlers
  const handleHoursChange = (day: string, field: 'open' | 'close', value: string) => {
    setFormData({
      ...formData,
      businessHours: {
        ...formData.businessHours,
        [day]: {
          ...formData.businessHours[day as keyof typeof formData.businessHours],
          [field]: value
        }
      }
    });
  };
  
  const toggleDayClosed = (day: string) => {
    const currentDay = formData.businessHours[day as keyof typeof formData.businessHours];
    setFormData({
      ...formData,
      businessHours: {
        ...formData.businessHours,
        [day]: {
          ...currentDay,
          closed: !currentDay.closed
        }
      }
    });
  };
  
  // Category handlers
  const toggleCategory = (category: string) => {
    if (formData.categories.includes(category)) {
      setFormData({
        ...formData,
        categories: formData.categories.filter(c => c !== category)
      });
    } else {
      setFormData({
        ...formData,
        categories: [...formData.categories, category]
      });
    }
  };
  
  // Service handlers
  const addService = () => {
    const newService: ServiceType = {
      id: Date.now().toString(),
      name: '',
      description: '',
      price: ''
    };
    
    setFormData({
      ...formData,
      services: [...formData.services, newService]
    });
  };
  
  const updateService = (id: string, field: keyof ServiceType, value: string) => {
    setFormData({
      ...formData,
      services: formData.services.map(service => 
        service.id === id ? { ...service, [field]: value } : service
      )
    });
  };
  
  const removeService = (id: string) => {
    setFormData({
      ...formData,
      services: formData.services.filter(service => service.id !== id)
    });
  };
  
  // Form submission
  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // In a real app, you would send the data to your backend
      console.log('Submitting business setup data:', formData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Navigate to the business dashboard
      navigate('/business/dashboard');
    } catch (err) {
      setError('Failed to save business profile. Please try again.');
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
            <h2 className="text-xl font-semibold text-gray-800">{t('Upload Your Business Logo')}</h2>
            <p className="text-gray-600">{t('Your logo helps customers recognize your business')}</p>
            
            <div 
              className="mt-4 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={handleLogoClick}
            >
              {previewLogo ? (
                <div className="flex flex-col items-center">
                  <img 
                    src={previewLogo} 
                    alt="Business Logo" 
                    className="w-32 h-32 object-contain mb-4"
                  />
                  <p className="text-sm text-blue-600">{t('Click to change logo')}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Image className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-gray-500">{t('Click to upload your logo')}</p>
                  <p className="text-sm text-gray-400 mt-2">{t('Recommended size: 512x512px (PNG, JPG)')}</p>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleLogoChange}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('Business Description')}
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('Describe your business in a few sentences...')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">{t('Business Hours')}</h2>
            <p className="text-gray-600">{t('Set your regular operating hours')}</p>
            
            <div className="space-y-4 mt-4">
              {Object.entries(formData.businessHours).map(([day, hours]) => (
                <div key={day} className="flex items-center justify-between py-2 border-b border-gray-200">
                  <div className="w-1/4 font-medium capitalize">{t(day)}</div>
                  
                  {hours.closed ? (
                    <div className="w-2/4 text-gray-500">{t('Closed')}</div>
                  ) : (
                    <div className="w-2/4 flex space-x-2">
                      <input
                        type="time"
                        className="px-2 py-1 border border-gray-300 rounded-md"
                        value={hours.open}
                        onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                      />
                      <span className="self-center">-</span>
                      <input
                        type="time"
                        className="px-2 py-1 border border-gray-300 rounded-md"
                        value={hours.close}
                        onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                      />
                    </div>
                  )}
                  
                  <div className="w-1/4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleDayClosed(day)}
                      className={`px-2 py-1 text-xs rounded ${
                        hours.closed
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {hours.closed ? t('Set Hours') : t('Mark Closed')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">{t('Business Categories')}</h2>
            <p className="text-gray-600">{t('Select categories that best describe your business')}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              {BUSINESS_CATEGORIES.map(category => (
                <div
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.categories.includes(category)
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    {formData.categories.includes(category) && (
                      <Check className="w-4 h-4 mr-2 text-blue-500" />
                    )}
                    <span>{t(category)}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {formData.categories.length === 0 && (
              <div className="text-amber-600 text-sm mt-2">
                {t('Please select at least one category')}
              </div>
            )}
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">{t('Services & Offerings')}</h2>
            <p className="text-gray-600">{t('Add the services or products your business provides')}</p>
            
            <div className="space-y-4 mt-4">
              {formData.services.map(service => (
                <div key={service.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      placeholder={t('Service Name')}
                      className="w-2/3 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={service.name}
                      onChange={(e) => updateService(service.id, 'name', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder={t('Price')}
                      className="w-1/4 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={service.price || ''}
                      onChange={(e) => updateService(service.id, 'price', e.target.value)}
                    />
                  </div>
                  
                  <textarea
                    rows={2}
                    placeholder={t('Brief description of this service')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={service.description}
                    onChange={(e) => updateService(service.id, 'description', e.target.value)}
                  />
                  
                  <button
                    type="button"
                    onClick={() => removeService(service.id)}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    {t('Remove')}
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addService}
                className="w-full py-2 px-4 border border-dashed border-gray-300 rounded-md text-gray-600 hover:text-gray-800 hover:border-gray-400"
              >
                + {t('Add Service')}
              </button>
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
            {t('Setup Your Business')}
          </h1>
          <p className="text-gray-600">
            {t('Complete your business profile to get started')}
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
              disabled={currentStep === 3 && formData.categories.length === 0}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md flex items-center ${
                currentStep === 3 && formData.categories.length === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-blue-700'
              }`}
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

export default BusinessSetupWizard; 