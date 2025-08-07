import React, { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  CreditCard, 
  Map, 
  Ticket, 
  Settings, 
  LogOut, 
  QrCode,
  X,
  Menu
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import NotificationIndicator from '../notifications/NotificationIndicator';
import GlobalNotificationCenter from '../notifications/GlobalNotificationCenter';
import NotificationPopup from '../notifications/NotificationPopup';

interface CustomerLayoutProps {
  children: ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { 
      name: t('Dashboard'), 
      icon: <Home className="w-5 h-5" />, 
      path: '/dashboard' 
    },
    { 
      name: t('My Cards'), 
      icon: <CreditCard className="w-5 h-5" />, 
      path: '/cards' 
    },
    { 
      name: t('Nearby Rewards'), 
      icon: <Map className="w-5 h-5" />, 
      path: '/nearby' 
    },
    { 
      name: t('Promotions'), 
      icon: <Ticket className="w-5 h-5" />, 
      path: '/promotions' 
    },
    { 
      name: t('QR Card'), 
      icon: <QrCode className="w-5 h-5" />, 
      path: '/qr-card' 
    }
  ];

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
    <NotificationProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200">
          <div className="p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-blue-600">Vcarda</h2>
              <p className="text-sm text-gray-500 mt-1">{t('Rewards')}</p>
            </div>
            <div className="flex items-center space-x-2">
              <NotificationIndicator />
              <ThemeToggle variant="icon" />
            </div>
          </div>

          <nav className="flex-1 px-4 pb-4 space-y-1">
            {menuItems.map((item) => (
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
            ))}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <Link
              to="/settings"
              className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Settings className="w-5 h-5" />
              <span className="ml-3">{t('Settings')}</span>
            </Link>
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
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="bg-white border-b border-gray-200 md:hidden">
            <div className="flex items-center justify-between p-4">
              <h2 className="text-xl font-bold text-blue-600">Vcarda</h2>
              <div className="flex items-center">
                <ThemeToggle variant="icon" className="mr-2" />
                <NotificationIndicator className="mr-2" />
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
                  {menuItems.map((item) => (
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
                  ))}
                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="w-5 h-5" />
                    <span className="ml-3">{t('Settings')}</span>
                  </Link>
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
          
          {/* Notification components */}
          <GlobalNotificationCenter />
          <NotificationPopup />
        </div>
      </div>
    </NotificationProvider>
  );
}; 