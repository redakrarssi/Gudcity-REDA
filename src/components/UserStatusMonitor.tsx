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

    // DEVELOPMENT SAFETY: Disable UserStatusMonitor in development to prevent interference
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    if (isDev) {
      console.log('🔧 UserStatusMonitor: Disabled in development mode to prevent session interference');
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
            const status = err?.status || err?.response?.status;
            
            console.warn(`[UserStatusMonitor] API error (attempt ${attempt + 1}/${maxAttempts}):`, { 
              message, 
              status, 
              userId: user.id 
            });
            
            // Only logout on actual 404 (user not found) - NOT on 500 or other server errors
            if (status === 404 || message.includes('USER_NOT_FOUND') || message.includes('Not Found')) {
              console.error('🚫 USER STATUS MONITOR: User account genuinely not found (404), logging out');
              currentUser = null;
              break;
            }
            
            // For 500 errors, authentication errors, or network issues: retry with backoff
            if (attempt < maxAttempts - 1) {
              const delay = 300 * Math.pow(2, attempt);
              console.log(`[UserStatusMonitor] Retrying in ${delay}ms due to server error (${status || 'unknown'})`);
              await new Promise(r => setTimeout(r, delay));
            } else {
              // After all retries failed, don't logout - just log the issue
              console.warn('🔄 USER STATUS MONITOR: All retries failed, but keeping user logged in (server issues)');
              return; // Skip logout, keep current session
            }
            attempt++;
          }
        }
        lastResult.value = currentUser;
        lastResult.ts = now;
        
        // Only logout if we explicitly got a 404 (user not found)
        // Don't logout on network errors or server issues
        if (!currentUser) {
          console.error('🚫 USER STATUS MONITOR: User account no longer exists, logging out');
          logout();
          navigate('/login?reason=account_not_found');
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
    
    // CRITICAL FIX: Delay initial check to prevent interference with auth initialization
    // The AuthContext timeout is set to 30-45 seconds, so we should wait longer before checking
    setTimeout(() => {
      if (isProd) {
        // Warm-up fetch once in production only
        checkUserStatus();
      }
    }, 60000); // Wait 60 seconds before first check

    // Set up periodic checking every 5 minutes to reduce pressure and prevent false logouts
    intervalRef.current = setInterval(checkUserStatus, 300000); // 5 minutes instead of 60 seconds

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
