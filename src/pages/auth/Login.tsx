import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff, Shield, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LanguageSelector from '../../components/LanguageSelector';
// SECURITY FIX: Removed direct database access via FailedLoginService
// Rate limiting and account lockout now handled by backend API

const Login = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Get the redirect path from location state or default
  const from = location.state?.from?.pathname || '/account'; // Changed to use /account redirect

  // SECURITY FIX: Removed client-side security checks
  // Rate limiting and account lockout now handled by backend API
  
  // Handle login form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError(t('auth.Please enter both email and password'));
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // Normalize the email to avoid case-sensitivity issues
      const formattedEmail = email.trim().toLowerCase();
      
      // SECURITY FIX: Let backend API handle rate limiting and account lockout
      // Attempt login through API
      const result = await login(formattedEmail, password);
      
      if (result && result.success) {
        // Login successful - navigate to destination
        navigate(from, { replace: true });
      } else {
        // Login failed - show error message
        // The error message may come from the backend API (e.g., account locked)
        setError(result?.error?.message || t('auth.Invalid email or password'));
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Check if error is from backend API
      if (err.message && err.message.includes('locked')) {
        setError(t('auth.Account locked due to too many failed attempts. Please try again later.'));
      } else if (err.message && err.message.includes('429')) {
        setError(t('auth.Too many login attempts. Please try again later.'));
      } else {
        setError(t('auth.An error occurred during login. Please try again later.'));
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper to toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <div className="min-h-screen bg-white loyalty-doodle-bg loyalty-doodle-overlay flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">

      {/* Language selector - top left */}
      <div className="absolute top-6 left-6 z-10">
        <LanguageSelector variant="default" showIcon={false} />
      </div>
      
      {/* Back to home link */}
      <div className="absolute top-6 right-6 z-10">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('auth.Back to Homepage')}
        </Link>
      </div>
      
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100 relative">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            {t('auth.Sign in to your account')}
          </h2>
          <p className="text-gray-600">
            {t('auth.Access the Vcarda platform')}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
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

          {/* SECURITY FIX: Security warnings now handled by backend API */}
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email-address" className={`block text-sm font-semibold text-gray-700 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>{t('auth.Email address')}</label>
              <div className="relative group">
                <div className={`absolute inset-y-0 flex items-center pointer-events-none z-10 ${i18n.language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'}`}>
                  <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`block w-full py-4 border-2 border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white ${i18n.language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
                  placeholder={t('auth.Email address')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                  style={i18n.language === 'ar' ? { textAlign: 'right' } : { textAlign: 'left' }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className={`block text-sm font-semibold text-gray-700 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>{t('auth.Password')}</label>
              <div className="relative group">
                <div className={`absolute inset-y-0 flex items-center pointer-events-none z-10 ${i18n.language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'}`}>
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`block w-full py-4 border-2 border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white ${i18n.language === 'ar' ? 'pr-12 pl-12 text-right' : 'pl-12 pr-12 text-left'}`}
                  placeholder={t('auth.Password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                  style={i18n.language === 'ar' ? { textAlign: 'right' } : { textAlign: 'left' }}
                />
                <div className={`absolute inset-y-0 flex items-center z-10 ${i18n.language === 'ar' ? 'left-0 pl-4' : 'right-0 pr-4'}`}>
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="text-gray-500 hover:text-blue-500 focus:outline-none transition-colors duration-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              />
              <label htmlFor="remember-me" className="ml-3 block text-sm font-medium text-gray-700">
                {t('auth.Remember me')}
              </label>
            </div>

            <div className="text-sm">
              <Link to="/forgot-password" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors duration-200">
                {t('auth.Forgot your password?')}
              </Link>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center items-center py-4 px-6 border border-transparent text-base font-semibold rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('auth.Signing in...')}
                </>
              ) : (
                <div className="flex items-center">
                  {t('auth.Sign in')}
                  <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-8 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">{t('auth.Don\'t have an account?')}</span>
            </div>
          </div>
          
          <Link 
            to="/register" 
            className="inline-flex items-center justify-center w-full py-3 px-6 border-2 border-blue-200 rounded-xl text-sm font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
          >
            {t('auth.Create an account')}
          </Link>
          
          <div className="flex flex-col items-center space-y-2">
            <Link 
              to="/" 
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('auth.Back to Homepage')}
            </Link>
            
            <Link 
              to="/login-diagnostics" 
              className="inline-flex items-center text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors duration-200"
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              Having login issues? Run diagnostics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;