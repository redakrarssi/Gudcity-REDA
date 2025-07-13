import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CustomerNotificationService } from '../../services/customerNotificationService';

interface NotificationIndicatorProps {
  className?: string;
}

export const NotificationIndicator: React.FC<NotificationIndicatorProps> = ({ className = '' }) => {
  const [hasNotifications, setHasNotifications] = useState(false);
  const { user } = useAuth();

  // Function to check for notifications
  const checkNotifications = useCallback(async () => {
    try {
      // Check localStorage for notifications
      const pendingNotifications = localStorage.getItem('pendingNotifications');
      if (pendingNotifications) {
        const count = JSON.parse(pendingNotifications)?.length || 0;
        if (count > 0) {
          setHasNotifications(true);
          return;
        }
      }

      // Check for points notifications in localStorage
      let hasPointsNotification = false;
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('points_notification_') || key.startsWith('sync_points_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            const timestamp = new Date(data.timestamp || 0);
            const isRecent = Date.now() - timestamp.getTime() < 30000; // 30 seconds
            
            if (user && data.customerId === user.id?.toString() && isRecent) {
              hasPointsNotification = true;
            }
          } catch (error) {
            console.warn('Error parsing notification from localStorage:', error);
          }
        }
      });

      if (hasPointsNotification) {
        setHasNotifications(true);
        return;
      }

      // Check server for notifications if we have a user
      if (user?.id) {
        try {
          const notifications = await CustomerNotificationService.getCustomerNotifications(user.id.toString());
          const unreadCount = notifications.filter(n => !n.isRead).length;
          setHasNotifications(unreadCount > 0);
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    // Check on mount and periodically
    checkNotifications();
    const intervalId = setInterval(checkNotifications, 10000); // Check every 10 seconds

    // Listen for custom notification events
    const handleNotificationEvent = () => {
      checkNotifications();
    };

    // Listen for storage changes
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.startsWith('points_notification_') || 
          event.key?.startsWith('sync_points_') || 
          event.key === 'pendingNotifications') {
        checkNotifications();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('notification-received', handleNotificationEvent);
    window.addEventListener('points-awarded', handleNotificationEvent);
    window.addEventListener('customer-notification', handleNotificationEvent);
    window.addEventListener('refresh-customer-cards', handleNotificationEvent);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('notification-received', handleNotificationEvent);
      window.removeEventListener('points-awarded', handleNotificationEvent);
      window.removeEventListener('customer-notification', handleNotificationEvent);
      window.removeEventListener('refresh-customer-cards', handleNotificationEvent);
    };
  }, [checkNotifications]);

  // Always render the bell, but add the notification dot when there are notifications
  return (
    <div className="relative">
      <Bell className={`w-5 h-5 ${className}`} />
      {hasNotifications && (
        <span 
          className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"
          aria-label="New notifications"
        ></span>
      )}
    </div>
  );
};

export default NotificationIndicator; 