import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { IconBell } from '../icons/IconBell';
import { NotificationService } from '../../services/notificationService';
import logoWebp from '../../../0975ff86-7f95-4f61-84aa-2d19e687d9c5.webp';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  
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
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-[0.805rem]">
          {/* Logo */}
          <Link to="/" className="flex items-center relative">
            <span className="sr-only">Vcarda</span>
            <div className="relative h-10 md:h-12 w-[180px] md:w-[220px] overflow-visible">
              <img 
                src={logoWebp} 
                alt="Vcarda" 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[108px] md:h-[126px] w-auto object-contain"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-gray-600 hover:text-blue-600"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Auth Buttons / User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="relative group flex items-center">
                {user?.role === 'business' && (
                  <div className="mr-3">
                    <IconBell showNotification={hasNotifications} />
                  </div>
                )}
                <button className="flex items-center space-x-2 text-gray-700 hover:text-blue-600">
                  <span>{user?.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div className="absolute right-0 w-48 mt-2 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      {t('Admin Dashboard')}
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    {t('Profile')}
                  </Link>
                  <button
                    onClick={logout}
                    className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    {t('Logout')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-blue-600"
                >
                  {t('Login')}
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  {t('Sign Up')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 py-3 bg-gray-50 border-t border-gray-100">
          <nav className="flex flex-col space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-gray-600 hover:text-blue-600 py-2"
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
                    className="text-gray-600 hover:text-blue-600 py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('Admin Dashboard')}
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="text-gray-600 hover:text-blue-600 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('Profile')}
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-gray-600 hover:text-blue-600 py-2"
                >
                  {t('Logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-blue-600 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('Login')}
                </Link>
                <Link
                  to="/register"
                  className="text-gray-600 hover:text-blue-600 py-2"
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