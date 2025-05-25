import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import BusinessSetupWizard from './BusinessSetupWizard';
import CustomerSetupWizard from './CustomerSetupWizard';
import { Loader2 } from 'lucide-react';

/**
 * SetupController component that directs users to the appropriate setup wizard
 * based on their account type (business or customer)
 */
const SetupController: React.FC = () => {
  const { user, loading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    // In a real application, you would check if the user has already completed setup
    // by making an API call to your backend
    const checkSetupStatus = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For demonstration purposes, we'll assume setup is always needed
        setIsChecking(false);
      } catch (error) {
        console.error('Failed to check setup status:', error);
        setIsChecking(false);
      }
    };
    
    if (user && !loading) {
      checkSetupStatus();
    }
  }, [user, loading]);
  
  // Show loading state while checking user or setup status
  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }
  
  // If no user is logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Render the appropriate setup wizard based on user type
  // Check both role and userType to support different auth implementations
  if (user.role === 'business' || user.userType === 'business') {
    return <BusinessSetupWizard />;
  } else if (user.role === 'customer' || user.userType === 'customer') {
    return <CustomerSetupWizard />;
  }
  
  // If the user has an unrecognized role, redirect to home
  return <Navigate to="/" replace />;
};

export default SetupController; 