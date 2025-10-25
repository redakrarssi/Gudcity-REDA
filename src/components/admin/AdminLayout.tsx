import React, { ReactNode, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Building, 
  BarChart3, 
  Bell,
  Settings, 
  LogOut,
  Globe,
  ShieldAlert,
  Menu,
  X,
  ChevronRight,
  Moon,
  Sun,
  User,
  Languages,
  Maximize,
  Minimize,
  FileText,
  Shield,
  Mail,
  DollarSign,
  Layout,
  Database
} from 'lucide-react';
import { LanguageSelector } from '../LanguageSelector';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseStatus } from './DatabaseStatus';
import { DashboardDiagnosis } from '../diagnostics/DashboardDiagnosis';

interface AdminLayoutProps {
  children: ReactNode;
}

interface BreadcrumbItem {
  name: string;
  path: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'New business registration pending approval', time: '10 min ago', read: false },
    { id: 2, message: 'System update scheduled for tomorrow', time: '1 hour ago', read: false },
    { id: 3, message: 'Monthly analytics report available', time: '3 hours ago', read: true }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDbStatus, setShowDbStatus] = useState(false);

  // Safe translation function with fallback
  const safeTranslate = (key: string): string => {
    try {
      return t(key);
    } catch (error) {
      console.warn(`Translation error for key "${key}":`, error);
      return key; // Return the key as fallback
    }
  };

  const menuItems = [
    { 
      name: safeTranslate('Dashboard'), 
      icon: <Home className="w-5 h-5" />, 
      path: '/admin' 
    },
    { 
      name: safeTranslate('Users'), 
      icon: <Users className="w-5 h-5" />, 
      path: '/admin/users' 
    },
    { 
      name: safeTranslate('Businesses'), 
      icon: <Building className="w-5 h-5" />, 
      path: '/admin/businesses' 
    },
    { 
      name: safeTranslate('Analytics'), 
      icon: <BarChart3 className="w-5 h-5" />, 
      path: '/admin/analytics' 
    },
    { 
      name: safeTranslate('Approvals'), 
      icon: <ShieldAlert className="w-5 h-5" />, 
      path: '/admin/approvals' 
    },
    { 
      name: safeTranslate('Page Manager'), 
      icon: <Layout className="w-5 h-5" />, 
      path: '/admin/page-manager' 
    },
    { 
      name: safeTranslate('Pricing Plans'), 
      icon: <DollarSign className="w-5 h-5" />, 
      path: '/admin/pricing-plans' 
    },
    { 
      name: safeTranslate('Global Settings'), 
      icon: <Globe className="w-5 h-5" />, 
      path: '/admin/global-settings' 
    },
    { 
      name: safeTranslate('System Logs'), 
      icon: <FileText className="w-5 h-5" />, 
      path: '/admin/system-logs' 
    },
    { 
      name: safeTranslate('Permissions'), 
      icon: <Shield className="w-5 h-5" />, 
      path: '/admin/permissions' 
    },
    { 
      name: safeTranslate('Email Templates'), 
      icon: <Mail className="w-5 h-5" />, 
      path: '/admin/email-templates' 
    },
    { 
      name: safeTranslate('Database Diagnostics'), 
      icon: <Database className="w-5 h-5" />, 
      path: '/admin/database-diagnostics' 
    }
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = location.pathname.split('/').filter(Boolean);
    let breadcrumbs: BreadcrumbItem[] = [{ name: 'Admin', path: '/admin' }];
    
    let currentPath = '';
    paths.forEach((path, index) => {
      if (index === 0 && path === 'admin') return;
      
      currentPath += `/${path}`;
      const breadcrumbName = path.charAt(0).toUpperCase() + path.slice(1);
      breadcrumbs.push({
        name: safeTranslate(breadcrumbName),
        path: index === paths.length - 1 ? '' : currentPath
      });
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();
  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Apply dark mode class on mount if needed
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }
  }, [darkMode]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      {/* Sidebar */}
      <aside 
        className={`${sidebarCollapsed ? 'w-20' : 'w-64'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
                  fixed md:static inset-y-0 left-0 z-50 flex flex-col 
                  ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} 
                  border-r transition-all duration-300 ease-in-out`}
      >
        <div className={`flex items-center justify-between ${sidebarCollapsed ? 'px-4' : 'px-6'} py-6`}>
          {!sidebarCollapsed && (
            <div className="flex items-center">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Vcarda</h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} ml-2`}>{t('Admin')}</p>
            </div>
          )}
          {sidebarCollapsed && (
            <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'} mx-auto`}>VC</div>
          )}
          <button 
            onClick={toggleSidebar}
            className={`md:flex hidden items-center justify-center p-1.5 rounded-lg 
                      ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        <nav className={`flex-1 ${sidebarCollapsed ? 'px-2' : 'px-4'} pb-4 space-y-1 overflow-y-auto`}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-4'} py-3 rounded-lg transition-colors 
                        ${isActive(item.path)
                          ? darkMode 
                            ? 'bg-blue-900/30 text-blue-400' 
                            : 'bg-blue-50 text-blue-600'
                          : darkMode
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
            >
              {item.icon}
              {!sidebarCollapsed && <span className="ml-3">{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${sidebarCollapsed ? 'px-2' : 'px-4'} py-4`}>
          <Link
            to="/admin/settings"
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-4'} py-3 
                      ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'} 
                      rounded-lg`}
          >
            <Settings className="w-5 h-5" />
            {!sidebarCollapsed && <span className="ml-3">{t('Settings')}</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-4'} py-3 w-full text-left
                      ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'} 
                      rounded-lg`}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span className="ml-3">{t('Logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className={`${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'} border-b px-6 py-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 mr-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              <div className="hidden md:flex">
                <nav className="flex" aria-label="Breadcrumb">
                  <ol className="inline-flex items-center space-x-1 md:space-x-3">
                    {breadcrumbs.map((item, index) => (
                      <li key={index} className="inline-flex items-center">
                        {index > 0 && (
                          <ChevronRight className={`w-5 h-5 mx-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        )}
                        {item.path ? (
                          <Link 
                            to={item.path} 
                            className={`${darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'} text-sm font-medium`}
                          >
                            {item.name}
                          </Link>
                        ) : (
                          <span className={`${darkMode ? 'text-gray-100' : 'text-gray-800'} text-sm font-medium`}>
                            {item.name}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowDbStatus(!showDbStatus)}
                className={`relative p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <Database className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
              </button>

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <Bell className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>
              
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-gray-300" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>
              
              <button
                onClick={toggleFullscreen}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                {isFullscreen ? (
                  <Minimize className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                ) : (
                  <Maximize className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                )}
              </button>
              
              <div className="relative hidden md:block">
                <LanguageSelector 
                  variant="default"
                  showIcon={true}
                  className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                />
              </div>
              
              <div className={`h-8 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} w-px mx-1`}></div>
              
              <Link
                to="/admin/profile"
                className="flex items-center"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="ml-2 hidden lg:block">
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Admin User</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Super Admin</p>
                </div>
              </Link>
            </div>
          </div>
          
          {/* Database Status Dropdown */}
          {showDbStatus && (
            <div 
              className="absolute right-40 top-16 z-50 mt-1 w-80"
              onBlur={() => setShowDbStatus(false)}
            >
              <div className={`rounded-lg shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
                <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    Database Connection Status
                  </h3>
                </div>
                <div className="px-1 py-2">
                  <DatabaseStatus showDetails showControls={false} refreshInterval={30000} />
                </div>
                <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} px-4 py-3`}>
                  <Link
                    to="/admin/database-diagnostics"
                    className={`text-sm text-center block w-full py-1.5 px-3 rounded ${darkMode ? 'bg-blue-800 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    onClick={() => setShowDbStatus(false)}
                  >
                    View Database Diagnostics
                  </Link>
                </div>
              </div>
            </div>
          )}
          
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div 
              className="absolute right-28 top-16 z-50 mt-1 w-80"
              onBlur={() => setShowNotifications(false)}
            >
              <div className={`rounded-lg shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
                <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
                  <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    Notifications
                  </h3>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {unreadNotifications} unread
                  </span>
                </div>
                <div className={`max-h-60 overflow-y-auto ${darkMode ? 'divide-gray-700' : 'divide-gray-100'} divide-y`}>
                  {notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`px-4 py-3 ${notification.read ? '' : darkMode ? 'bg-gray-700/30' : 'bg-blue-50'}`}
                    >
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                        {notification.message}
                      </p>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {notification.time}
                      </p>
                    </div>
                  ))}
                </div>
                <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} px-4 py-3`}>
                  <Link
                    to="/admin/notifications"
                    className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                    onClick={() => setShowNotifications(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            </div>
          )}
        </header>
        
        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto p-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto">
            {/* Diagnosis banner for all admin pages */}
            <DashboardDiagnosis dashboard="admin" className="mb-3" />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}; 