import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff, Shield, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LanguageSelector from '../../components/LanguageSelector';
import FailedLoginService, { LoginSecurityInfo } from '../../services/failedLoginService';

const Login = () => {
  const { t } = useTranslation();
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
      const success = await login(formattedEmail, password);
      
      if (success) {
        // Reset failed login attempts on successful login
        await FailedLoginService.resetFailedAttempts(formattedEmail);
        navigate(from, { replace: true });
      } else {
        // Record failed login attempt
        const userAgent = navigator.userAgent;
        const failedAttempts = await FailedLoginService.recordFailedAttempt(
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
          if (remainingAttempts <= 2) {
            setError(t('auth.Invalid credentials. Warning: {{remaining}} attempts remaining before account lockout.', { remaining: remainingAttempts }));
          } else {
            setError(t('auth.Invalid email or password. {{remaining}} attempts remaining.', { remaining: remainingAttempts }));
          }
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Language selector - top right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSelector variant="default" showIcon={false} />
      </div>
      
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
            {t('auth.Sign in to your account')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.Access the Vcarda platform')}
          </p>
          
          {/* Demo Credentials */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-1">{t('auth.Demo Credentials')}</h3>
            <p className="text-xs text-blue-700">
              <strong>{t('auth.Admin')}:</strong> admin@vcarda.com / password<br />
              <strong>{t('auth.Customer')}:</strong> customer@example.com / password<br />
              <strong>{t('auth.Business')}:</strong> business@example.com / password
            </p>
          </div>
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
                  {!securityInfo?.isAccountLocked && (
                    <p className="text-xs text-red-600 mt-1">
                      {t('auth.If you continue to experience issues, try using one of the demo accounts above.')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Warning Display */}
          {showSecurityWarning && securityInfo && (
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
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">{t('auth.Email address')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={t('auth.Email address')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">{t('auth.Password')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={t('auth.Password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                {t('auth.Remember me')}
              </label>
            </div>

            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                {t('auth.Forgot your password?')}
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || (securityInfo?.isAccountLocked && lockoutCountdown > 0)}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${
                securityInfo?.isAccountLocked 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('auth.Signing in...')}
                </>
              ) : securityInfo?.isAccountLocked && lockoutCountdown > 0 ? (
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  {t('auth.Account Locked')}
                </div>
              ) : (
                t('auth.Sign in')
              )}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600 mb-4">
            {t('auth.Don\'t have an account?')}{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              {t('auth.Create an account')}
            </Link>
          </p>
          
          <Link to="/" className="font-medium text-blue-600 hover:text-blue-500">
            {t('auth.Back to Homepage')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;