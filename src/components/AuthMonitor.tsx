import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ensureAuthToken, getAuthToken } from '../services/authTokenService';

/**
 * AuthMonitor Component
 * 
 * This component monitors the authentication status and ensures that
 * the auth token is always available for API requests when the user is logged in.
 * It runs in the background and doesn't render any visible UI.
 */
export const AuthMonitor: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [lastChecked, setLastChecked] = useState<number>(0);
  
  // Check auth token whenever authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('AuthMonitor: User is authenticated, ensuring token exists');
      const hasToken = ensureAuthToken();
      
      if (hasToken) {
        console.log('AuthMonitor: Auth token is available');
      } else {
        console.warn('AuthMonitor: Failed to ensure auth token availability');
      }
    }
  }, [isAuthenticated, user]);
  
  // Periodically check token status
  useEffect(() => {
    const checkInterval = 60000; // Check every minute
    
    const intervalId = setInterval(() => {
      if (isAuthenticated && user) {
        const now = Date.now();
        
        // Only check if it's been at least checkInterval since last check
        if (now - lastChecked >= checkInterval) {
          console.log('AuthMonitor: Periodic token check');
          const token = getAuthToken();
          
          if (!token) {
            console.warn('AuthMonitor: Token missing, attempting to restore');
            ensureAuthToken();
          }
          
          setLastChecked(now);
        }
      }
    }, 10000); // Run the interval check every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [isAuthenticated, user, lastChecked]);
  
  // Listen for storage events that might indicate auth changes
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'authUserId' || 
          event.key === 'authUserData' || 
          event.key === 'authSessionActive' ||
          event.key === 'token') {
        
        console.log(`AuthMonitor: Auth-related storage change detected (${event.key})`);
        
        if (isAuthenticated && user) {
          ensureAuthToken();
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isAuthenticated, user]);
  
  // Component doesn't render anything visible
  return null;
};

export default AuthMonitor; 