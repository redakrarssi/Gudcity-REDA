import React from 'react';
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
import CustomerQrCode from './pages/customer/QrCode';
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

function App() {
  const { t } = useTranslation();

  return (
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
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/comments" element={<CommentsPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/admin-access" element={<AdminLogin />} />
              
              {/* Setup Wizard Routes */}
              <Route path="/setup" element={
                <ProtectedRoute>
                  <SetupController />
                </ProtectedRoute>
              } />
              
              {/* Redirect route based on user type */}
              <Route path="/account" element={<UserTypeRedirect />} />
              
              {/* Customer Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <CustomerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/cards" element={
                <ProtectedRoute>
                  <CustomerCards />
                </ProtectedRoute>
              } />
              <Route path="/promotions" element={
                <ProtectedRoute>
                  <CustomerPromotions />
                </ProtectedRoute>
              } />
              <Route path="/qr-code" element={
                <ProtectedRoute>
                  <CustomerQrCode />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <CustomerSettings />
                </ProtectedRoute>
              } />
              <Route path="/nearby" element={
                <ProtectedRoute>
                  <CustomerNearby />
                </ProtectedRoute>
              } />
              
              {/* Business Routes */}
              <Route path="/business/dashboard" element={
                <ProtectedRoute requiredPermission="business.profile.view">
                  <BusinessDashboard />
                </ProtectedRoute>
              } />
              <Route path="/business/programs" element={
                <ProtectedRoute requiredPermission="business.programs.view">
                  <BusinessPrograms />
                </ProtectedRoute>
              } />
              <Route path="/business/analytics" element={
                <ProtectedRoute requiredPermission="business.analytics.view">
                  <BusinessAnalytics />
                </ProtectedRoute>
              } />
              <Route path="/business/customers" element={
                <ProtectedRoute requiredPermission="business.customers.view">
                  <BusinessCustomers />
                </ProtectedRoute>
              } />
              <Route path="/business/promotions" element={
                <ProtectedRoute requiredPermission="business.promotions.view">
                  <BusinessPromotions />
                </ProtectedRoute>
              } />
              <Route path="/business/qr-scanner" element={
                <ProtectedRoute requiredPermission="business.profile.view">
                  <BusinessQrScanner />
                </ProtectedRoute>
              } />
              <Route path="/business/test-codes" element={
                <ProtectedRoute requiredPermission="business.profile.view">
                  <BusinessTestCodes />
                </ProtectedRoute>
              } />
              <Route path="/business/settings" element={
                <ProtectedRoute requiredPermission="business.profile.view">
                  <BusinessSettings />
                </ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route 
                path="/admin" 
                element={
                  <AdminProtectedRoute>
                    <AdminDashboard />
                  </AdminProtectedRoute>
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
                  <AdminProtectedRoute>
                    <AdminUsers />
                  </AdminProtectedRoute>
                } 
              />
              <Route 
                path="/admin/businesses" 
                element={
                  <AdminProtectedRoute>
                    <AdminBusinesses />
                  </AdminProtectedRoute>
                } 
              />
              <Route path="/admin/analytics" element={
                <AdminProtectedRoute>
                  <AdminAnalytics />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/approvals" element={
                <AdminProtectedRoute>
                  <AdminApprovals />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/global-settings" element={
                <AdminProtectedRoute>
                  <AdminGlobalSettings />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <AdminProtectedRoute>
                  <AdminSettings />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/system-logs" element={
                <AdminProtectedRoute>
                  <AdminSystemLogs />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/permissions" element={
                <AdminProtectedRoute>
                  <AdminPermissions />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/email-templates" element={
                <AdminProtectedRoute>
                  <AdminEmailTemplates />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/page-manager" element={
                <AdminProtectedRoute>
                  <AdminPageManager />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/pricing-plans" element={
                <AdminProtectedRoute>
                  <AdminPricingPlans />
                </AdminProtectedRoute>
              } />
              <Route path="/admin/database-diagnostics" element={
                <AdminProtectedRoute>
                  <DatabaseDiagnosticsPage />
                </AdminProtectedRoute>
              } />
              
              {/* Catch-all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </FallbackProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;