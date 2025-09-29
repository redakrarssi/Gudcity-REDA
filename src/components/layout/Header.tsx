import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { IconBell } from '../icons/IconBell';
import { NotificationService } from '../../services/notificationService';
import { AppLogo } from '../ui/AppLogo';
import logoWebp from '../../../0975ff86-7f95-4f61-84aa-2d19e687d9c5.webp';

const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  const location = useLocation();
  const isArabic = (i18n?.language || '').startsWith('ar');
  
  useEffect(() => {
    // Check for notifications if user is authenticated
    const checkNotifications = async () => {
      if (user?.id && user.role === 'business') {
        try {
          const result = await NotificationService.getBusinessRedemptionNotifications(user.id.toString());
          if (result.success) {
            const pendingNotifications = result.notifications.filter(n => n.status === 'PENDING');
            setHasNotifications(pendingNotifications.length > 0);
          }
        } catch (error) {
          console.error('Error checking notifications:', error);
        }
      }
    };

    if (isAuthenticated) {
      checkNotifications();
      
      // Listen for real-time notification updates
      const handleNotificationEvent = () => {
        checkNotifications();
      };

      window.addEventListener('redemption-notification', handleNotificationEvent);

      return () => {
        window.removeEventListener('redemption-notification', handleNotificationEvent);
      };
    }
  }, [user, isAuthenticated]);
  
  const navItems = [
    { name: t('Home'), path: '/' },
    { name: t('About'), path: '/about' },
    { name: t('Businesses'), path: '/businesses' },
    { name: t('Pricing'), path: '/pricing' },
    { name: t('Comments'), path: '/comments' },
    { name: t('Contact'), path: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm ring-1 ring-gray-900/5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center" aria-label="Vcarda Home">
            <AppLogo className="shrink-0" imageSrc={logoWebp} showText={false} heightPx={48} />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={[
                  'text-sm font-medium transition-colors',
                  location.pathname === item.path ? 'text-blue-700' : 'text-gray-700/80 hover:text-blue-700'
                ].join(' ')}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Auth Buttons / User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative group flex items-center gap-3">
                {user?.role === 'business' && (
                  <div className="">
                    <IconBell showNotification={hasNotifications} />
                  </div>
                )}
                <button className="flex items-center gap-2 text-gray-700 hover:text-blue-700">
                  <span className="max-w-[12rem] truncate">{user?.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div className={`absolute ${isArabic ? 'left-0' : 'right-0'} w-48 mt-2 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200`}> 
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      {t('Admin Dashboard')}
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    {t('Profile')}
                  </Link>
                  <button
                    onClick={logout}
                    className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    {t('Logout')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700/80 hover:text-blue-700"
                >
                  {t('Login')}
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg shadow-sm hover:from-blue-700 hover:to-indigo-700"
                >
                  {t('Sign Up')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-gray-800"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>
      <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-sky-500 to-blue-600" />

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 py-3 bg-gray-50 border-t border-gray-100">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-gray-700/90 hover:text-blue-700 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="text-gray-700/90 hover:text-blue-700 py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('Admin Dashboard')}
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="text-gray-700/90 hover:text-blue-700 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('Profile')}
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-gray-700/90 hover:text-blue-700 py-2"
                >
                  {t('Logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700/90 hover:text-blue-700 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('Login')}
                </Link>
                <Link
                  to="/register"
                  className="text-gray-700/90 hover:text-blue-700 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('Sign Up')}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header; 