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
import { AppLogo } from '../ui/AppLogo';
import logoWebp from '../../../0975ff86-7f95-4f61-84aa-2d19e687d9c5.webp';

interface CustomerLayoutProps {
  children: ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isArabic = (i18n?.language || '').startsWith('ar');

  const menuItems = [
    { 
      name: t('menu.dashboard'), 
      icon: <Home className="w-5 h-5" />, 
      path: '/dashboard' 
    },
    { 
      name: t('menu.myCards'), 
      icon: <CreditCard className="w-5 h-5" />, 
      path: '/cards' 
    },
    { 
      name: t('menu.nearbyRewards'), 
      icon: <Map className="w-5 h-5" />, 
      path: '/nearby' 
    },
    { 
      name: t('menu.promotions'), 
      icon: <Ticket className="w-5 h-5" />, 
      path: '/promotions' 
    },
    { 
      name: t('menu.qrCard'), 
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
      <div dir={isArabic ? 'rtl' : 'ltr'} lang={isArabic ? 'ar' : i18n?.language} className={`flex h-screen bg-gray-50 customer-layout ${isArabic ? 'arabic-text' : ''}`}>
        {/* Main Content Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Mobile header */}
          <header className="bg-white border-b border-gray-200 md:hidden mobile-header">
            <div className={`flex items-center justify-between h-16 px-4 ${isArabic ? 'rtl-row-reverse' : ''}`}> 
              <AppLogo className="shrink-0" size="md" imageSrc={logoWebp} showText={false} heightPx={48} />
              <div className="flex items-center gap-2 mobile-controls">
                <ThemeToggle variant="icon" className="mobile-control" />
                <NotificationIndicator className="mobile-control" />
                <button 
                  className="p-1 text-gray-600 mobile-control"
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
              <div className="bg-white border-b border-gray-200 py-2 mobile-menu">
                <nav className="px-4 space-y-1.5 mobile-nav">
                  {menuItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      aria-current={isActive(item.path) ? 'page' : undefined}
                      className={[
                        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition transform-gpu hover:translate-x-0.5 mobile-nav-item',
                        isArabic ? 'flex-row-reverse text-right' : '',
                        isActive(item.path)
                          ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300'
                      ].join(' ')}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className={[
                        'w-5 h-5',
                        isActive(item.path) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                      ].join(' ')}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.name}</span>
                    </Link>
                  ))}
                  <Link
                    to="/settings"
                    aria-current={isActive('/settings') ? 'page' : undefined}
                    className={[
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition transform-gpu hover:translate-x-0.5 mobile-nav-item',
                      isArabic ? 'flex-row-reverse text-right' : '',
                      isActive('/settings')
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300'
                    ].join(' ')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className={[
                      'w-5 h-5',
                      isActive('/settings') ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                    ].join(' ')}>
                      <Settings className="w-5 h-5" />
                    </span>
                    <span className="truncate">{t('menu.settings')}</span>
                  </Link>
                  <button
                    onClick={(e) => {
                      handleLogout(e);
                      setMobileMenuOpen(false);
                    }}
                    className={[
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition transform-gpu hover:translate-x-0.5 w-full text-left mobile-nav-item',
                      isArabic ? 'flex-row-reverse text-right' : '',
                      'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300'
                    ].join(' ')}
                  >
                    <span className="w-5 h-5 text-gray-400 group-hover:text-gray-500">
                      <LogOut className="w-5 h-5" />
                    </span>
                    <span className="truncate">{t('menu.logout')}</span>
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

        {/* Sidebar: on large screens keep it visually to the right; internally flip content for RTL */}
        <aside className={`hidden md:flex md:flex-col w-64 bg-white ${isArabic ? 'border-r' : 'border-l'} border-gray-200 sidebar`}>
          <div className={`p-4 flex justify-between items-center ${isArabic ? 'rtl-row-reverse' : ''}`}> 
            <AppLogo className="shrink-0" size="lg" imageSrc={logoWebp} showText={false} heightPx={72} />
            <div className="flex items-center gap-2 header-controls">
              <NotificationIndicator />
              <ThemeToggle variant="icon" />
            </div>
          </div>

          <nav className="flex-1 px-4 pb-4 space-y-1.5 overflow-y-auto navigation">
            <div className={`px-3 py-2 text-xs uppercase tracking-wide text-gray-500 ${isArabic ? 'text-right' : ''}`}>Menu</div>
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive(item.path) ? 'page' : undefined}
                className={[
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition transform-gpu hover:translate-x-0.5 nav-item',
                  isArabic ? 'flex-row-reverse text-right' : '',
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
                  // Sidebar edge accent (RTL vs LTR)
                  isActive(item.path)
                    ? (isArabic ? 'border-l-2 border-blue-600' : 'border-r-2 border-blue-600')
                    : '',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300'
                ].join(' ')}
              >
                <span className={[
                  'w-5 h-5',
                  isActive(item.path) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                ].join(' ')}>
                  {item.icon}
                </span>
                <span className="truncate">{item.name}</span>
              </Link>
            ))}

            <div className={`mt-4 px-3 py-2 text-xs uppercase tracking-wide text-gray-500 ${isArabic ? 'text-right' : ''}`}>Account</div>
            <Link
              to="/settings"
              aria-current={isActive('/settings') ? 'page' : undefined}
              className={[
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition transform-gpu hover:translate-x-0.5 footer-item',
                isArabic ? 'flex-row-reverse text-right' : '',
                isActive('/settings')
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
                isActive('/settings')
                  ? (isArabic ? 'border-l-2 border-blue-600' : 'border-r-2 border-blue-600')
                  : '',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300'
              ].join(' ')}
            >
              <span className={[
                'w-5 h-5',
                isActive('/settings') ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
              ].join(' ')}>
                <Settings className="w-5 h-5" />
              </span>
              <span className="truncate">{t('menu.settings')}</span>
            </Link>
            <button
              onClick={handleLogout}
              className={[
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition transform-gpu hover:translate-x-0.5 w-full text-left footer-item',
                isArabic ? 'flex-row-reverse text-right' : '',
                'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300'
              ].join(' ')}
            >
              <span className="w-5 h-5 text-gray-400 group-hover:text-gray-500">
                <LogOut className="w-5 h-5" />
              </span>
              <span className="truncate">{t('menu.logout')}</span>
            </button>
          </nav>
        </aside>
      </div>
    </NotificationProvider>
  );
}; 