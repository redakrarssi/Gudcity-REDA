import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ProductionSafeService } from '../utils/productionApiClient';

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

    const lastResult = { value: null as any, ts: 0 };
    const checkUserStatus = async () => {
      try {
        // Cache for 30s and add retry with backoff; only logout on 404
        const now = Date.now();
        if (lastResult.ts && now - lastResult.ts < 30000) {
          return;
        }
        let attempt = 0;
        const maxAttempts = 3;
        let currentUser: any = null;
        while (attempt < maxAttempts) {
          try {
            currentUser = await ProductionSafeService.getUserById(user.id as number);
            break;
          } catch (err: any) {
            const message = err?.message || '';
            // If 404, user does not exist -> logout
            if (message.includes('404') || message.includes('Not Found')) {
              currentUser = null;
              break;
            }
            // Network/other errors: backoff and retry
            await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt)));
            attempt++;
          }
        }
        lastResult.value = currentUser;
        lastResult.ts = now;
        
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
        // Do not logout on transient errors
      }
    };

    // Initial status check (do not force immediate API call in dev)
    lastKnownStatus.current = user.status;
    const isProd = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    if (isProd) {
      // Warm-up fetch once in production only
      checkUserStatus();
    }

    // Set up periodic checking every 60 seconds to reduce pressure
    intervalRef.current = setInterval(checkUserStatus, 60000);

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
