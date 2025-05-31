import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, Building2, Phone, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth, RegisterData } from '../../contexts/AuthContext';
import { UserType } from '../../services/userService';

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState<RegisterData>({
    name: '',
    email: '',
    password: '',
    userType: 'customer', // Default to customer type
    businessName: '',
    businessPhone: ''
  });
  
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle user type change
  const handleUserTypeChange = (userType: UserType) => {
    setFormData(prev => ({ ...prev, userType }));
  };
  
  // Validate form
  const validateForm = (): boolean => {
    // Reset error
    setError('');
    
    // Check required fields
    if (!formData.name || !formData.email || !formData.password || !confirmPassword) {
      setError(t('Please fill in all required fields'));
      return false;
    }
    
    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(t('Please enter a valid email address'));
      return false;
    }
    
    // Check password strength - simplified to just check length > 6
    if (formData.password.length <= 6) {
      setError(t('Password must be more than 6 characters'));
      return false;
    }
    
    // Check if passwords match
    if (formData.password !== confirmPassword) {
      setError(t('Passwords do not match'));
      return false;
    }
    
    // Check business fields if business user type
    if (formData.userType === 'business') {
      if (!formData.businessName) {
        setError(t('Business name is required'));
        return false;
      }
      if (!formData.businessPhone) {
        setError(t('Business phone is required'));
        return false;
      }
    }
    
    // Check terms acceptance
    if (!termsAccepted) {
      setError(t('You must accept the terms and conditions'));
      return false;
    }
    
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await register(formData);
      
      if (success) {
        // Redirect based on user type
        if (formData.userType === 'business') {
          navigate('/business/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(t('Registration failed. Please try a different email address or check your credentials.'));
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(t('An error occurred during registration. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper to toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Helper to toggle confirm password visibility
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {t('Create your account')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('Join GudCity and connect with your community')}
          </p>
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
        
        {/* User Type Selection */}
        <div className="flex border border-gray-300 rounded-md mb-6">
          <button
            type="button"
            className={`flex-1 py-3 px-4 text-center ${
              formData.userType === 'customer' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } rounded-l-md transition-colors duration-150`}
            onClick={() => handleUserTypeChange('customer')}
          >
            <User className="h-5 w-5 mx-auto mb-1" />
            {t('Customer')}
          </button>
          <button
            type="button"
            className={`flex-1 py-3 px-4 text-center ${
              formData.userType === 'business' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } rounded-r-md transition-colors duration-150`}
            onClick={() => handleUserTypeChange('business')}
          >
            <Building2 className="h-5 w-5 mx-auto mb-1" />
            {t('Business')}
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('Full Name')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('Enter your full name')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('Email Address')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('Enter your email')}
              />
            </div>
          </div>
          
          {/* Password fields with strong requirements */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {t('Password')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('Create a password')}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {t('Password must be more than 6 characters')}
            </p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
              {t('Confirm Password')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('Confirm your password')}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Business Information - Only show if Business type is selected */}
          {formData.userType === 'business' && (
            <>
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Business Name')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="businessName"
                    name="businessName"
                    type="text"
                    required={formData.userType === 'business'}
                    value={formData.businessName}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('Enter your business name')}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Business Phone')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="businessPhone"
                    name="businessPhone"
                    type="tel"
                    required={formData.userType === 'business'}
                    value={formData.businessPhone}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('Enter your business phone')}
                  />
                </div>
              </div>
            </>
          )}
          
          {/* Terms & Conditions checkbox */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="font-medium text-gray-700">
                {t('I accept the')}
                {' '}
                <Link to="/terms-of-service" className="text-blue-600 hover:text-blue-500">
                  {t('Terms of Service')}
                </Link>
                {' '}
                {t('and')}
                {' '}
                <Link to="/privacy-policy" className="text-blue-600 hover:text-blue-500">
                  {t('Privacy Policy')}
                </Link>
              </label>
            </div>
          </div>
          
          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('Creating account...')}
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('Create account')}
                </>
              )}
            </button>
          </div>
        </form>
        
        {/* Sign in link */}
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            {t('Already have an account?')}{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              {t('Sign in')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;