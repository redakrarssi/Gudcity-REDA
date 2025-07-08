import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, ProtectedRoute, AdminProtectedRoute, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import DiagnosticRenderer from './components/DiagnosticRenderer';
import Pricing from './pages/Pricing';
import CommentsPage from './pages/Comments';
import Unauthorized from './pages/auth/Unauthorized';
import CustomerDashboard from './pages/customer/Dashboard';
import CustomerCards from './pages/customer/Cards';
import CustomerPromotions from './pages/customer/Promotions';
import CustomerQrCard from './pages/customer/QrCard';
import CustomerSettings from './pages/customer/Settings';
import CustomerNearby from './pages/customer/Nearby';
import BusinessDashboard from './pages/business/Dashboard';
import BusinessPrograms from './pages/business/Programs';
import BusinessAnalytics from './pages/business/Analytics';
import BusinessCustomers from './pages/business/Customers';
import BusinessPromotions from './pages/business/Promotions';
import BusinessQrScanner from './pages/business/QrScanner';
import BusinessTestCodes from './pages/business/TestCodes';
import BusinessSettings from './pages/business/Settings';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminBusinesses from './pages/admin/Businesses';
import AdminAnalytics from './pages/admin/Analytics';
import AdminApprovals from './pages/admin/Approvals';
import AdminGlobalSettings from './pages/admin/GlobalSettings';
import AdminSettings from './pages/admin/Settings';
import AdminSystemLogs from './pages/admin/SystemLogs';
import AdminPermissions from './pages/admin/Permissions';
import AdminEmailTemplates from './pages/admin/EmailTemplates';
import AdminPageManager from './pages/admin/PageManager';
import AdminPricingPlans from './pages/admin/PricingPlans';
import DatabaseDiagnosticsPage from './pages/admin/DatabaseDiagnostics';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminLogin from './pages/auth/AdminLogin';
import SetupController from './components/onboarding/SetupController';
import DatabaseConnectionAlert from './components/DatabaseConnectionAlert';
import { FallbackProvider } from './components/FallbackIndicator';
import { registerNotificationListeners } from './utils/notificationHandler';

// Custom route component to redirect based on user type
const UserTypeRedirect = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (user.user_type === 'business' || user.role === 'business') {
    return <Navigate to="/business/dashboard" />;
  }
  
  return <Navigate to="/dashboard" />;
};

// Create a fallback component for the error boundary
const AppErrorFallback = () => (
  <div style={{ 
    padding: '30px', 
    margin: '50px auto', 
    maxWidth: '600px',
    backgroundColor: '#f8f9fa', 
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    textAlign: 'center'
  }}>
    <h2 style={{ marginBottom: '20px', color: '#dc3545' }}>Application Error</h2>
    <p style={{ marginBottom: '20px' }}>
      We're sorry, but something went wrong with the application. 
      Please try refreshing the page or contact support if the issue persists.
    </p>
    <button 
      onClick={() => window.location.reload()}
      style={{
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Refresh Page
    </button>
  </div>
);

function App() {
  const { t } = useTranslation();

  // Register notification listeners for real-time updates
  useEffect(() => {
    // Register notification listeners for rewards and points
    registerNotificationListeners();
    
    // Log that listeners were initialized
    console.log('Notification listeners registered for points and rewards');
  }, []);

  return (
    <ErrorBoundary fallback={<AppErrorFallback />}>
      <Router>
        <AuthProvider>
          <FallbackProvider>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
              {/* Show database connection alert */}
              <DatabaseConnectionAlert />

              <Routes>
                <Route path="/" element={
                  <ErrorBoundary>
                    <DiagnosticRenderer name="LandingPage">
                      <LandingPage />
                    </DiagnosticRenderer>
                  </ErrorBoundary>
                } />
                <Route path="/pricing" element={
                  <ErrorBoundary>
                    <Pricing />
                  </ErrorBoundary>
                } />
                <Route path="/comments" element={
                  <ErrorBoundary>
                    <CommentsPage />
                  </ErrorBoundary>
                } />
                <Route path="/login" element={
                  <ErrorBoundary>
                    <Login />
                  </ErrorBoundary>
                } />
                <Route path="/register" element={
                  <ErrorBoundary>
                    <Register />
                  </ErrorBoundary>
                } />
                <Route path="/unauthorized" element={
                  <ErrorBoundary>
                    <Unauthorized />
                  </ErrorBoundary>
                } />
                <Route path="/admin-access" element={
                  <ErrorBoundary>
                    <AdminLogin />
                  </ErrorBoundary>
                } />
                
                {/* Setup Wizard Routes */}
                <Route path="/setup" element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <SetupController />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                
                {/* Redirect route based on user type */}
                <Route path="/account" element={
                  <ErrorBoundary>
                    <UserTypeRedirect />
                  </ErrorBoundary>
                } />
                
                {/* Customer Routes */}
                <Route path="/dashboard" element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <CustomerDashboard />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/cards" element={
                  <ErrorBoundary>
                    <CustomerCards />
                  </ErrorBoundary>
                } />
                <Route path="/promotions" element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <CustomerPromotions />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/qr-card" element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <CustomerQrCard />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/qr-code" element={
                  <Navigate to="/qr-card" replace />
                } />
                <Route path="/settings" element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <CustomerSettings />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/nearby" element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <CustomerNearby />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                
                {/* Business Routes */}
                <Route path="/business/dashboard" element={
                  <ErrorBoundary>
                    <ProtectedRoute requiredPermission="business.profile.view">
                      <BusinessDashboard />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/business/programs" element={
                  <ErrorBoundary>
                    <ProtectedRoute requiredPermission="business.programs.view">
                      <BusinessPrograms />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/business/analytics" element={
                  <ErrorBoundary>
                    <ProtectedRoute requiredPermission="business.analytics.view">
                      <BusinessAnalytics />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/business/customers" element={
                  <ErrorBoundary>
                    <ProtectedRoute requiredPermission="business.customers.view">
                      <BusinessCustomers />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/business/promotions" element={
                  <ErrorBoundary>
                    <ProtectedRoute requiredPermission="business.promotions.view">
                      <BusinessPromotions />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/business/qr-scanner" element={
                  <ErrorBoundary>
                    <ProtectedRoute requiredPermission="business.profile.view">
                      <BusinessQrScanner />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/business/test-codes" element={
                  <ErrorBoundary>
                    <ProtectedRoute requiredPermission="business.profile.view">
                      <BusinessTestCodes />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/business/settings" element={
                  <ErrorBoundary>
                    <ProtectedRoute requiredPermission="business.profile.view">
                      <BusinessSettings />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />
                
                {/* Admin Routes */}
                <Route 
                  path="/admin" 
                  element={
                    <ErrorBoundary>
                      <AdminProtectedRoute>
                        <AdminDashboard />
                      </AdminProtectedRoute>
                    </ErrorBoundary>
                  } 
                />
                <Route 
                  path="/admin/dashboard" 
                  element={
                    <Navigate to="/admin" replace />
                  } 
                />
                <Route 
                  path="/admin/users" 
                  element={
                    <ErrorBoundary>
                      <AdminProtectedRoute>
                        <AdminUsers />
                      </AdminProtectedRoute>
                    </ErrorBoundary>
                  } 
                />
                <Route 
                  path="/admin/businesses" 
                  element={
                    <ErrorBoundary>
                      <AdminProtectedRoute>
                        <AdminBusinesses />
                      </AdminProtectedRoute>
                    </ErrorBoundary>
                  } 
                />
                <Route path="/admin/analytics" element={
                  <ErrorBoundary>
                    <AdminProtectedRoute>
                      <AdminAnalytics />
                    </AdminProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/admin/approvals" element={
                  <ErrorBoundary>
                    <AdminProtectedRoute>
                      <AdminApprovals />
                    </AdminProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/admin/global-settings" element={
                  <ErrorBoundary>
                    <AdminProtectedRoute>
                      <AdminGlobalSettings />
                    </AdminProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/admin/settings" element={
                  <ErrorBoundary>
                    <AdminProtectedRoute>
                      <AdminSettings />
                    </AdminProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/admin/system-logs" element={
                  <ErrorBoundary>
                    <AdminProtectedRoute>
                      <AdminSystemLogs />
                    </AdminProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/admin/permissions" element={
                  <ErrorBoundary>
                    <AdminProtectedRoute>
                      <AdminPermissions />
                    </AdminProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/admin/email-templates" element={
                  <ErrorBoundary>
                    <AdminProtectedRoute>
                      <AdminEmailTemplates />
                    </AdminProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/admin/page-manager" element={
                  <ErrorBoundary>
                    <AdminProtectedRoute>
                      <AdminPageManager />
                    </AdminProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/admin/pricing-plans" element={
                  <ErrorBoundary>
                    <AdminProtectedRoute>
                      <AdminPricingPlans />
                    </AdminProtectedRoute>
                  </ErrorBoundary>
                } />
                <Route path="/admin/database-diagnostics" element={
                  <ErrorBoundary>
                    <AdminProtectedRoute>
                      <DatabaseDiagnosticsPage />
                    </AdminProtectedRoute>
                  </ErrorBoundary>
                } />

                {/* Catch-all route */}
                <Route path="*" element={
                  <ErrorBoundary>
                    <div className="flex flex-col items-center justify-center min-h-screen p-4">
                      <h1 className="text-4xl font-bold mb-4">{t('notFound.title', '404: Page Not Found')}</h1>
                      <p className="mb-8">{t('notFound.message', 'The page you are looking for does not exist.')}</p>
                      <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        {t('notFound.goHome', 'Go to Home')}
                      </a>
                    </div>
                  </ErrorBoundary>
                } />
              </Routes>
            </div>
          </FallbackProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;