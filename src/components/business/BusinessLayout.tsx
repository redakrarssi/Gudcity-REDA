import React, { ReactNode, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  CreditCard, 
  BarChart3, 
  Users, 
  Gift, 
  Settings, 
  LogOut, 
  QrCode,
  X,
  Menu,
  Bell,
  User
} from 'lucide-react';
import { IconBell } from '../icons/IconBell';
import { BusinessNotificationCenter } from './BusinessNotificationCenter';
import { StaffSettingsModal } from './StaffSettingsModal';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useNotifications } from '../../contexts/NotificationContext';
import { canAccessNavigation, isBusinessOwner, isStaffMember } from '../../utils/permissions';
import { LanguageSelector } from '../LanguageSelector';
import { AppLogo } from '../ui/AppLogo';

interface BusinessLayoutProps {
  children: ReactNode;
}

export const BusinessLayout: React.FC<BusinessLayoutProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { businessUnreadCount } = useNotifications();
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showStaffSettings, setShowStaffSettings] = useState(false);
  const hasNotifications = businessUnreadCount > 0;
  const isArabic = (i18n?.language || '').startsWith('ar');

  // Define all possible menu items
  const allMenuItems = [
    { 
      name: t('Dashboard'), 
      icon: <Home className="w-5 h-5" />, 
      path: '/business/dashboard' 
    },
    { 
      name: t('Programs'), 
      icon: <CreditCard className="w-5 h-5" />, 
      path: '/business/programs' 
    },
    { 
      name: t('Analytics'), 
      icon: <BarChart3 className="w-5 h-5" />, 
      path: '/business/analytics' 
    },
    { 
      name: t('Customers'), 
      icon: <Users className="w-5 h-5" />, 
      path: '/business/customers' 
    },
    { 
      name: t('Staff'), 
      icon: <Users className="w-5 h-5" />, 
      path: '/business/staff',
      requiresOwner: true // Only business owners can access staff management
    },
    { 
      name: t('Promotions'), 
      icon: <Gift className="w-5 h-5" />, 
      path: '/business/promotions' 
    },
    { 
      name: t('QR Scanner'), 
      icon: (
        <div className="relative">
          <QrCode className="w-5 h-5" />
          {hasNotifications && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></span>
          )}
        </div>
      ), 
      path: '/business/qr-scanner' 
    },
    { 
      name: t('Settings'), 
      icon: <Settings className="w-5 h-5" />, 
      path: '/business/settings',
      requiresOwner: true // Only business owners can access settings
    },
    { 
      name: t('My Settings'), 
      icon: <User className="w-5 h-5" />, 
      path: '/business/my-settings',
      requiresStaff: true, // Only staff users can access this
      isModal: true // This opens a modal instead of navigating
    }
  ];

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => {
    // Check if item requires owner permissions
    if (item.requiresOwner && !isBusinessOwner(user)) {
      return false;
    }
    
    // Check if item requires staff permissions
    if (item.requiresStaff && !isStaffMember(user)) {
      return false;
    }
    
    // Check general navigation access permissions
    return canAccessNavigation(user, item.path);
  });

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      <div dir={isArabic ? 'rtl' : 'ltr'} lang={isArabic ? 'ar' : i18n?.language} className={`flex h-screen bg-gray-50 business-layout ${isArabic ? 'arabic-text' : ''}`}>
        {/* Sidebar */}
        <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200 business-sidebar">
          <div className="p-6 flex justify-between items-center">
            <div className="flex items-center">
              <AppLogo size="lg" className="mr-3" />
              <p className="text-sm text-gray-500 mt-1">{t('Business Portal')}</p>
            </div>
            <div className="flex items-center space-x-2">
              <LanguageSelector variant="compact" showIcon={false} />
              <button
                className="relative p-1"
                onClick={() => setShowNotificationCenter(true)}
                aria-label="Notifications"
              >
                <IconBell showNotification={hasNotifications} unreadCount={businessUnreadCount} className="w-7 h-7" />
              </button>
              <ThemeToggle variant="icon" />
            </div>
          </div>

          <nav className="flex-1 px-4 pb-4 space-y-1">
            {menuItems.map((item) => {
              if (item.isModal) {
                return (
                  <button
                    key={item.path}
                    onClick={() => setShowStaffSettings(true)}
                    className="flex items-center px-4 py-3 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 w-full text-left"
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </button>
                );
              }
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg w-full text-left"
            >
              <LogOut className="w-5 h-5" />
              <span className="ml-3">{t('Logout')}</span>
            </button>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="flex flex-col flex-1 overflow-hidden business-main-content">
          <header className="bg-white border-b border-gray-200 md:hidden">
            <div className="flex items-center justify-between p-4">
              <AppLogo size="md" />
              <div className="flex items-center">
                <LanguageSelector variant="compact" showIcon={false} className="mr-2" />
                <ThemeToggle variant="icon" className="mr-2" />
                <button
                  className="p-1 mr-2 text-gray-600 relative"
                  onClick={() => setShowNotificationCenter(true)}
                  aria-label="Notifications"
                >
                  <IconBell showNotification={hasNotifications} unreadCount={businessUnreadCount} className="w-7 h-7" />
                </button>
                <button 
                  className="p-1 text-gray-600"
                  onClick={toggleMobileMenu}
                >
                  {mobileMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="bg-white border-b border-gray-200 py-2">
                <nav className="px-4 space-y-1">
                  {menuItems.map((item) => {
                    if (item.isModal) {
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            setShowStaffSettings(true);
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center px-4 py-3 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 w-full text-left"
                        >
                          {item.icon}
                          <span className="ml-3">{item.name}</span>
                        </button>
                      );
                    }
                    
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                          isActive(item.path)
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.icon}
                        <span className="ml-3">{item.name}</span>
                      </Link>
                    );
                  })}
                  <button
                    onClick={(e) => {
                      handleLogout(e);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg w-full text-left"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="ml-3">{t('Logout')}</span>
                  </button>
                </nav>
              </div>
            )}
          </header>

          <main className="flex-1 overflow-auto bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>

          {/* Notification Drawer */}
          <BusinessNotificationCenter
            isOpen={showNotificationCenter}
            onClose={() => setShowNotificationCenter(false)}
          />
        </div>
      </div>

      {/* Staff Settings Modal */}
      <StaffSettingsModal
        isOpen={showStaffSettings}
        onClose={() => setShowStaffSettings(false)}
      />

      {/* Floating QR Scanner Button */}
      <Link 
        to="/business/qr-scanner"
        className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors z-40"
        aria-label="Open QR Scanner"
      >
        <QrCode className="w-6 h-6" />
      </Link>
    </>
  );
}; 