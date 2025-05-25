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
  Layout
} from 'lucide-react';
import { LanguageSelector } from '../LanguageSelector';

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

  const menuItems = [
    { 
      name: t('Dashboard'), 
      icon: <Home className="w-5 h-5" />, 
      path: '/admin/dashboard' 
    },
    { 
      name: t('Users'), 
      icon: <Users className="w-5 h-5" />, 
      path: '/admin/users' 
    },
    { 
      name: t('Businesses'), 
      icon: <Building className="w-5 h-5" />, 
      path: '/admin/businesses' 
    },
    { 
      name: t('Analytics'), 
      icon: <BarChart3 className="w-5 h-5" />, 
      path: '/admin/analytics' 
    },
    { 
      name: t('Approvals'), 
      icon: <ShieldAlert className="w-5 h-5" />, 
      path: '/admin/approvals' 
    },
    { 
      name: t('Page Manager'), 
      icon: <Layout className="w-5 h-5" />, 
      path: '/admin/page-manager' 
    },
    { 
      name: t('Pricing Plans'), 
      icon: <DollarSign className="w-5 h-5" />, 
      path: '/admin/pricing-plans' 
    },
    { 
      name: t('Global Settings'), 
      icon: <Globe className="w-5 h-5" />, 
      path: '/admin/global-settings' 
    },
    { 
      name: t('System Logs'), 
      icon: <FileText className="w-5 h-5" />, 
      path: '/admin/system-logs' 
    },
    { 
      name: t('Permissions'), 
      icon: <Shield className="w-5 h-5" />, 
      path: '/admin/permissions' 
    },
    { 
      name: t('Email Templates'), 
      icon: <Mail className="w-5 h-5" />, 
      path: '/admin/email-templates' 
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
        name: t(breadcrumbName),
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
  }, []);

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
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>GudCity</h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} ml-2`}>{t('Admin')}</p>
            </div>
          )}
          {sidebarCollapsed && (
            <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'} mx-auto`}>GC</div>
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
          <Link
            to="/logout"
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-4'} py-3 
                      ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'} 
                      rounded-lg`}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span className="ml-3">{t('Logout')}</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b transition-colors duration-200`}>
          <div className="flex items-center justify-between px-4 py-3">
            {/* Mobile menu button and breadcrumbs */}
            <div className="flex items-center space-x-4">
              <button 
                className="md:hidden text-gray-500 hover:text-gray-600" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              {/* Breadcrumbs */}
              <nav className="hidden md:flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  {breadcrumbs.map((item, index) => (
                    <li key={index} className="inline-flex items-center">
                      {index > 0 && <ChevronRight className={`mx-1 w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />}
                      {item.path ? (
                        <Link 
                          to={item.path} 
                          className={`inline-flex items-center text-sm font-medium ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          {index === 0 && <Home className="mr-1 w-4 h-4" />}
                          {item.name}
                        </Link>
                      ) : (
                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {item.name}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </div>

            {/* Right side header items */}
            <div className="flex items-center space-x-3">
              {/* Dark mode toggle */}
              <button 
                onClick={toggleDarkMode}
                className={`p-1.5 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-100 text-gray-700'}`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Fullscreen toggle */}
              <button 
                onClick={toggleFullscreen}
                className={`p-1.5 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>

              {/* Language selector */}
              <div className="relative">
                <button 
                  className={`p-1.5 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                >
                  <Languages className="w-5 h-5" />
                </button>
                <div className="absolute right-0 mt-2 z-10 hidden group-hover:block">
                  <LanguageSelector />
                </div>
              </div>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-1.5 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'} relative`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>
                  )}
                </button>

                {showNotifications && (
                  <div className={`absolute right-0 mt-2 w-80 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} 
                                  border rounded-lg shadow-lg overflow-hidden z-10`}>
                    <div className={`px-4 py-3 ${darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`}>
                      <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {t('Notifications')} ({unreadNotifications})
                      </h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">{t('No notifications')}</div>
                      ) : (
                        notifications.map(notification => (
                          <div 
                            key={notification.id} 
                            className={`px-4 py-3 border-b last:border-0 ${darkMode ? 'border-gray-700' : 'border-gray-100'} 
                                      ${!notification.read ? (darkMode ? 'bg-blue-900/20' : 'bg-blue-50') : ''}`}
                          >
                            <div className={`font-medium text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              {notification.message}
                            </div>
                            <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {notification.time}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className={`px-4 py-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-t`}>
                      <button className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {t('Mark all as read')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Profile */}
              <div className="flex items-center">
                <div className={`hidden md:block mr-3 text-right ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <div className="text-sm font-medium">Admin User</div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>admin@gudcity.com</div>
                </div>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-blue-100'}`}>
                  <User className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-blue-600'}`} />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={`flex-1 overflow-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-4 transition-colors duration-200`}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}; 