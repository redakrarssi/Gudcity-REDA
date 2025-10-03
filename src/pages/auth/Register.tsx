import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  User, 
  Building2, 
  Phone, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  Check,
  Users,
  Store
} from 'lucide-react';
import { useAuth, RegisterData } from '../../contexts/AuthContext';
import { UserType } from '../../services/userService';
import LanguageSelector from '../../components/LanguageSelector';

const Register = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<RegisterData>({
    name: '',
    email: '',
    password: '',
    userType: 'customer',
    businessName: '',
    businessPhone: ''
  });
  
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Step configuration
  const totalSteps = selectedUserType === 'business' ? 4 : 3;
  const steps = [
    { id: 1, title: t('chooseRole'), description: t('selectAccountType') },
    { id: 2, title: t('personalInfo'), description: t('enterDetails') },
    { id: 3, title: selectedUserType === 'business' ? t('businessInfo') : t('security'), description: selectedUserType === 'business' ? t('enterBusinessDetails') : t('setupSecurity') },
    ...(selectedUserType === 'business' ? [{ id: 4, title: t('security'), description: t('setupSecurity') }] : [])
  ];
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle user type selection
  const handleUserTypeSelect = (userType: UserType) => {
    setSelectedUserType(userType);
    setFormData(prev => ({ ...prev, userType }));
    setCurrentStep(2);
  };
  
  // Navigate between steps
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
  
  // Validate current step
  const validateCurrentStep = (): boolean => {
    setError('');
    
    if (currentStep === 2) {
      if (!formData.name || !formData.email) {
        setError(t('Please fill in all required fields'));
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        setError(t('Please enter a valid email address'));
        return false;
      }
    }
    
    if (currentStep === 3 && selectedUserType === 'business') {
      if (!formData.businessName || !formData.businessPhone) {
        setError(t('Please fill in all business details'));
        return false;
      }
    }
    
    if ((currentStep === 3 && selectedUserType === 'customer') || (currentStep === 4 && selectedUserType === 'business')) {
      if (!formData.password || !confirmPassword) {
        setError(t('Please fill in all required fields'));
        return false;
      }
      if (formData.password !== confirmPassword) {
        setError(t('Passwords do not match'));
        return false;
      }
      if (formData.password.length < 6) {
        setError(t('Password must be at least 6 characters'));
        return false;
      }
      if (!termsAccepted) {
        setError(t('Please accept the terms and conditions'));
        return false;
      }
    }
    
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    
    if (currentStep < totalSteps) {
      nextStep();
    } else {
      // Final submission
      setIsLoading(true);
      try {
        const result = await register(formData);
        if (result && result.success) {
          navigate('/account');
        } else {
          setError(result?.message || t('Registration failed. Please try again.'));
        }
      } catch (err) {
        console.error('Registration error:', err);
        setError(t('An error occurred during registration. Please try again later.'));
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('chooseYourRole')}</h2>
              <p className="text-gray-600">{t('selectAccountTypeDesc')}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => handleUserTypeSelect('customer')}
                className="group p-8 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('customer')}</h3>
                  <p className="text-gray-600 text-sm">{t('joinLoyaltyPrograms')}</p>
                </div>
              </button>
              
              <button
                onClick={() => handleUserTypeSelect('business')}
                className="group p-8 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Store className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('businessRole')}</h3>
                  <p className="text-gray-600 text-sm">{t('createManagePrograms')}</p>
                </div>
              </button>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('personalInformation')}</h2>
              <p className="text-gray-600">{t('tellUsAboutYourself')}</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className={`block text-sm font-semibold text-gray-700 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
                  {t('fullName')} *
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 flex items-center pointer-events-none z-10 ${i18n.language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'}`}>
                    <User className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`block w-full py-4 border-2 border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white ${i18n.language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
                    placeholder={t('enterFullName')}
                    dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                    style={i18n.language === 'ar' ? { textAlign: 'right' } : { textAlign: 'left' }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className={`block text-sm font-semibold text-gray-700 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
                  {t('emailAddress')} *
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 flex items-center pointer-events-none z-10 ${i18n.language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'}`}>
                    <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`block w-full py-4 border-2 border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white ${i18n.language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
                    placeholder={t('enterEmailAddress')}
                    dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                    style={i18n.language === 'ar' ? { textAlign: 'right' } : { textAlign: 'left' }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 3:
        if (selectedUserType === 'business') {
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('businessInformation')}</h2>
                <p className="text-gray-600">{t('tellUsAboutBusiness')}</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold text-gray-700 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
                    {t('businessName')} *
                  </label>
                  <div className="relative group">
                    <div className={`absolute inset-y-0 flex items-center pointer-events-none z-10 ${i18n.language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'}`}>
                      <Building2 className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      className={`block w-full py-4 border-2 border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white ${i18n.language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
                      placeholder={t('enterBusinessName')}
                      dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                      style={i18n.language === 'ar' ? { textAlign: 'right' } : { textAlign: 'left' }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className={`block text-sm font-semibold text-gray-700 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
                    {t('businessPhone')} *
                  </label>
                  <div className="relative group">
                    <div className={`absolute inset-y-0 flex items-center pointer-events-none z-10 ${i18n.language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'}`}>
                      <Phone className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="tel"
                      name="businessPhone"
                      value={formData.businessPhone}
                      onChange={handleChange}
                      className={`block w-full py-4 border-2 border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white ${i18n.language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
                      placeholder={t('enterBusinessPhone')}
                      dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                      style={i18n.language === 'ar' ? { textAlign: 'right' } : { textAlign: 'left' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          return renderSecurityStep();
        }
        
      case 4:
        return renderSecurityStep();
        
      default:
        return null;
    }
  };
  
  const renderSecurityStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('securitySetup')}</h2>
        <p className="text-gray-600">{t('createSecurePassword')}</p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label className={`block text-sm font-semibold text-gray-700 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
            {t('Password')} *
          </label>
          <div className="relative group">
            <div className={`absolute inset-y-0 flex items-center pointer-events-none z-10 ${i18n.language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'}`}>
              <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`block w-full py-4 border-2 border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white ${i18n.language === 'ar' ? 'pr-12 pl-12 text-right' : 'pl-12 pr-12 text-left'}`}
              placeholder={t('enterPassword')}
              dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
              style={i18n.language === 'ar' ? { textAlign: 'right' } : { textAlign: 'left' }}
            />
            <div className={`absolute inset-y-0 flex items-center z-10 ${i18n.language === 'ar' ? 'left-0 pl-4' : 'right-0 pr-4'}`}>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-500 hover:text-blue-500 focus:outline-none transition-colors duration-200"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className={`block text-sm font-semibold text-gray-700 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
            {t('confirmPassword')} *
          </label>
          <div className="relative group">
            <div className={`absolute inset-y-0 flex items-center pointer-events-none z-10 ${i18n.language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'}`}>
              <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`block w-full py-4 border-2 border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white ${i18n.language === 'ar' ? 'pr-12 pl-12 text-right' : 'pl-12 pr-12 text-left'}`}
              placeholder={t('confirmYourPassword')}
              dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
              style={i18n.language === 'ar' ? { textAlign: 'right' } : { textAlign: 'left' }}
            />
            <div className={`absolute inset-y-0 flex items-center z-10 ${i18n.language === 'ar' ? 'left-0 pl-4' : 'right-0 pr-4'}`}>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-gray-500 hover:text-blue-500 focus:outline-none transition-colors duration-200"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="terms"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="terms" className="text-sm text-gray-600">
            {t('agreeToTerms')} <Link to="/terms" className="text-blue-600 hover:text-blue-500 font-medium">{t('termsOfService')}</Link> {t('and')} <Link to="/privacy" className="text-blue-600 hover:text-blue-500 font-medium">{t('privacyPolicy')}</Link>
          </label>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 loyalty-doodle-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Language selector - top left */}
      <div className="absolute top-6 left-6 z-10">
        <LanguageSelector variant="default" showIcon={false} />
      </div>
      
      <div className="max-w-2xl w-full space-y-8 bg-white/80 backdrop-blur-lg p-10 rounded-2xl shadow-2xl border border-white/20 relative">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{t('createAccount')}</h1>
            <span className="text-sm text-gray-500">{currentStep} / {totalSteps}</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          
          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  currentStep >= step.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <div className="text-center mt-2">
                  <div className={`text-xs font-medium ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'}`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
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
        
        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              currentStep === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('previous')}
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="group flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('processing')}
              </>
            ) : currentStep === totalSteps ? (
              <>
                {t('createAccount')}
                <Check className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                {t('next')}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
        
        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            {t('alreadyHaveAccount')}{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors duration-200">
              {t('signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;