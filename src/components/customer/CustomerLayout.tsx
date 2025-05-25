import React, { ReactNode } from 'react';
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
  Bell 
} from 'lucide-react';

interface CustomerLayoutProps {
  children: ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();

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
      name: t('QR Code'), 
      icon: <QrCode className="w-5 h-5" />, 
      path: '/qr-code' 
    }
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-blue-600">GudCity</h2>
          <p className="text-sm text-gray-500 mt-1">{t('Rewards')}</p>
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
          <Link
            to="/logout"
            className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
            <span className="ml-3">{t('Logout')}</span>
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white border-b border-gray-200 md:hidden">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-xl font-bold text-blue-600">GudCity</h2>
            <div className="flex items-center">
              <button className="p-1 mr-2 text-gray-600">
                <Bell className="w-6 h-6" />
              </button>
              <button className="p-1 text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}; 