import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff, Shield, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LanguageSelector from '../../components/LanguageSelector';
import FailedLoginService, { LoginSecurityInfo } from '../../services/failedLoginService';

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
  
  // Failed login tracking state
  const [securityInfo, setSecurityInfo] = useState<LoginSecurityInfo | null>(null);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [lockoutCountdown, setLockoutCountdown] = useState<number>(0);
  
  // Get the redirect path from location state or default
  const from = location.state?.from?.pathname || '/account'; // Changed to use /account redirect

  // Check security info when email changes
  useEffect(() => {
    const checkSecurityInfo = async () => {
      if (email && email.includes('@')) {
        try {
          const info = await FailedLoginService.getLoginSecurityInfo(email);
          setSecurityInfo(info);
          setShowSecurityWarning(info.failedAttempts > 0 || info.isAccountLocked);
          
          if (info.isAccountLocked && info.lockoutRemainingMinutes) {
            setLockoutCountdown(info.lockoutRemainingMinutes);
          }
        } catch (error) {
          console.error('Error checking security info:', error);
        }
      } else {
        setSecurityInfo(null);
        setShowSecurityWarning(false);
        setLockoutCountdown(0);
      }
    };

    // Debounce the security check
    const timeoutId = setTimeout(checkSecurityInfo, 500);
    return () => clearTimeout(timeoutId);
  }, [email]);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutCountdown > 0) {
      const interval = setInterval(() => {
        setLockoutCountdown(prev => {
          if (prev <= 1) {
            // Refresh security info when lockout expires
            if (email && email.includes('@')) {
              FailedLoginService.getLoginSecurityInfo(email).then(info => {
                setSecurityInfo(info);
                setShowSecurityWarning(info.failedAttempts > 0 || info.isAccountLocked);
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [lockoutCountdown, email]);
  
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
      
      // Check if account is locked before attempting login
      const canAttempt = await FailedLoginService.canAttemptLogin(formattedEmail);
      if (!canAttempt.allowed) {
        setError(canAttempt.message || t('auth.Account is temporarily locked due to too many failed attempts'));
        setIsLoading(false);
        return;
      }
      
      // Attempt login
      const result = await login(formattedEmail, password);
      
      if (result && result.success) {
        // Reset failed login attempts on successful login
        await FailedLoginService.resetFailedAttempts(formattedEmail);
        navigate(from, { replace: true });
      } else {
        // Record failed login attempt
        const userAgent = navigator.userAgent;
        await FailedLoginService.recordFailedAttempt(
          formattedEmail,
          undefined, // IP will be handled server-side
          userAgent,
          'invalid_credentials'
        );
        
        // Update security info
        const updatedInfo = await FailedLoginService.getLoginSecurityInfo(formattedEmail);
        setSecurityInfo(updatedInfo);
        setShowSecurityWarning(true);
        
        // Set appropriate error message based on failed attempts
        if (updatedInfo.isAccountLocked) {
          setError(t('auth.Account locked due to too many failed attempts. Please try again later.'));
          setLockoutCountdown(updatedInfo.lockoutRemainingMinutes || 0);
        } else {
          const remainingAttempts = updatedInfo.remainingAttempts;
          setError(`Email or password is incorrect. ${remainingAttempts} attempts remaining.`);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(t('auth.An error occurred during login. Please try again later.'));
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

          {/* Security Warning Display */}
          {!error && showSecurityWarning && securityInfo && (
            <div className={`border-l-4 p-4 ${
              securityInfo.isAccountLocked 
                ? 'bg-red-50 border-red-400' 
                : 'bg-orange-50 border-orange-400'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {securityInfo.isAccountLocked ? (
                    <Shield className="h-5 w-5 text-red-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-400" />
                  )}
                </div>
                <div className="ml-3">
                  {securityInfo.isAccountLocked ? (
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        {t('auth.Account Temporarily Locked')}
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        {t('auth.Your account has been locked due to multiple failed login attempts.')}
                      </p>
                      {lockoutCountdown > 0 && (
                        <div className="flex items-center mt-2 text-sm text-red-600">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>
                            {t('auth.Try again in {{minutes}} minutes', { minutes: lockoutCountdown })}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-orange-800">
                        {t('auth.Security Warning')}
                      </p>
                      <p className="text-sm text-orange-700">
                        {t('auth.{{failed}} failed login attempts. {{remaining}} attempts remaining before account lockout.', {
                          failed: securityInfo.failedAttempts,
                          remaining: securityInfo.remainingAttempts
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Account Status Indicator */}
          {securityInfo && email && email.includes('@') && !securityInfo.isAccountLocked && securityInfo.failedAttempts === 0 && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Shield className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    {t('auth.Account status: Good standing')}
                  </p>
                </div>
              </div>
            </div>
          )}
          
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
              disabled={isLoading || (securityInfo?.isAccountLocked && lockoutCountdown > 0)}
              className={`group relative w-full flex justify-center items-center py-4 px-6 border border-transparent text-base font-semibold rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02] ${
                securityInfo?.isAccountLocked 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('auth.Signing in...')}
                </>
              ) : securityInfo?.isAccountLocked && lockoutCountdown > 0 ? (
                <div className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  {t('auth.Account Locked')}
                </div>
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
      </div>
    </div>
  );
};

export default Login;