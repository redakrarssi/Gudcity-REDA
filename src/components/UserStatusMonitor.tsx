import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserById } from '../services/userService';

/**
 * UserStatusMonitor - Monitors user status changes in real-time
 * Automatically redirects banned users and logs warnings for restricted users
 */
const UserStatusMonitor: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastKnownStatus = useRef<string | undefined>(user?.status);

  useEffect(() => {
    // Only monitor authenticated users
    if (!user || !user.id) {
      return;
    }

    const checkUserStatus = async () => {
      try {
        const currentUser = await getUserById(user.id);
        
        if (!currentUser) {
          console.error('🚫 USER STATUS MONITOR: User account no longer exists, logging out');
          logout();
          navigate('/login');
          return;
        }

        const currentStatus = currentUser.status || 'active';
        const previousStatus = lastKnownStatus.current || 'active';

        // Check if status has changed
        if (currentStatus !== previousStatus) {
          console.log(`🔄 USER STATUS CHANGE: ${user.email} status changed from '${previousStatus}' to '${currentStatus}'`);
          
          // Handle banned status - immediate logout and redirect
          if (currentStatus === 'banned') {
            console.error(`🚫 USER BANNED: ${user.email} has been banned, logging out immediately`);
            logout();
            navigate('/banned?message=Your account has been suspended by an administrator.');
            return;
          }
          
          // Handle restricted status - redirect to restriction page
          if (currentStatus === 'restricted') {
            console.warn(`⚠️ USER RESTRICTED: ${user.email} has been restricted`);
            navigate('/restricted?message=Your account access is currently limited.');
          }
          
          // Handle reactivation
          if (currentStatus === 'active' && (previousStatus === 'banned' || previousStatus === 'restricted')) {
            console.log(`✅ USER REACTIVATED: ${user.email} has been reactivated`);
          }
          
          lastKnownStatus.current = currentStatus;
        }
      } catch (error) {
        console.error('USER STATUS MONITOR ERROR:', error);
        // Don't take any action on errors to avoid disrupting user experience
      }
    };

    // Initial status check
    lastKnownStatus.current = user.status;

    // Set up periodic checking every 30 seconds
    intervalRef.current = setInterval(checkUserStatus, 30000);

    // Also check on window focus (when user returns to tab)
    const handleFocus = () => {
      checkUserStatus();
    };

    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, logout, navigate]);

  // This component doesn't render anything
  return null;
};

export default UserStatusMonitor;
