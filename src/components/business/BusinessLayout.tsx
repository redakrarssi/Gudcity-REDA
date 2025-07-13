import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Settings, 
  Bell, 
  Menu, 
  X,
  LogOut, 
  CreditCard, 
  BarChart2, 
  Gift, 
  Coffee,
  QrCode,
  Scan
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NotificationIndicator from '../notifications/NotificationIndicator';
import Footer from '../layout/Footer';

interface BusinessLayoutProps {
  children: React.ReactNode;
}

export const BusinessLayout: React.FC<BusinessLayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showQrButton, setShowQrButton] = useState(true);
  
  // Close mobile menu when navigating
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);
  
  // Hide QR button on QR scanner page
  useEffect(() => {
    if (pathname === '/business/qr-scanner') {
      setShowQrButton(false);
    } else {
      setShowQrButton(true);
    }
  }, [pathname]);

  const businessNavLinks = [
    { 
      name: 'Dashboard', 
      path: '/business/dashboard', 
      icon: <Home className="h-5 w-5" />
    },
    { 
      name: 'Customers', 
      path: '/business/customers', 
      icon: <Users className="h-5 w-5" />
    },
    { 
      name: 'Cards', 
      path: '/business/loyalty-cards', 
      icon: <CreditCard className="h-5 w-5" />
    },
    { 
      name: 'Programs', 
      path: '/business/loyalty-programs', 
      icon: <Coffee className="h-5 w-5" />
    },
    { 
      name: 'Analytics', 
      path: '/business/analytics', 
      icon: <BarChart2 className="h-5 w-5" />
    },
    { 
      name: 'Promotions', 
      path: '/business/promotions', 
      icon: <Gift className="h-5 w-5" />
    },
    { 
      name: 'Settings', 
      path: '/business/settings', 
      icon: <Settings className="h-5 w-5" />
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          {/* Logo and title */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/business/dashboard" className="flex items-center">
              <span className="text-xl font-bold text-indigo-600">GudCity</span>
              <span className="ml-1 text-sm text-gray-500">Business</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {businessNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                  pathname === link.path
                    ? 'text-indigo-600 border-b-2 border-indigo-500'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                } transition-colors`}
              >
                {link.name}
              </Link>
            ))}
            
            <Link
              to="/business/qr-scanner"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                pathname === '/business/qr-scanner'
                  ? 'text-indigo-600 border-b-2 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
              } transition-colors`}
            >
              <QrCode className="h-5 w-5 mr-1" />
              QR Scanner
            </Link>
          </nav>

          {/* User menu and mobile menu button */}
          <div className="flex items-center space-x-4">
            <Link 
              to="/business/notifications" 
              className="text-gray-500 hover:text-gray-600 transition-colors p-1 relative"
            >
              <Bell className="h-6 w-6" />
              <NotificationIndicator />
            </Link>
            
            <button 
              onClick={() => logout()}
              className="hidden md:flex items-center text-gray-500 hover:text-gray-600 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
            
            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg z-30">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {businessNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-3 py-2 rounded-md text-base font-medium flex items-center ${
                  pathname === link.path
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {link.icon}
                <span className="ml-2">{link.name}</span>
              </Link>
            ))}
            
            <Link
              to="/business/qr-scanner"
              className={`block px-3 py-2 rounded-md text-base font-medium flex items-center ${
                pathname === '/business/qr-scanner'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <QrCode className="h-5 w-5" />
              <span className="ml-2">QR Scanner</span>
            </Link>
            
            <hr className="my-2 border-gray-200" />
            
            <button
              onClick={() => logout()}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full text-left flex items-center"
            >
              <LogOut className="h-5 w-5" />
              <span className="ml-2">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Floating QR scanner button */}
      {showQrButton && (
        <Link
          to="/business/qr-scanner"
          className="award-points-helper"
          aria-label="QR Scanner"
        >
          <Scan className="h-6 w-6" />
        </Link>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}; 