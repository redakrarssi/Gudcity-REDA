import React, { useState, useEffect } from 'react';

interface NotificationIndicatorProps {
  className?: string;
}

export const NotificationIndicator: React.FC<NotificationIndicatorProps> = ({ className = '' }) => {
  const [hasNotifications, setHasNotifications] = useState(false);

  useEffect(() => {
    // Check localStorage for notifications
    const checkNotifications = () => {
      try {
        const pendingNotifications = localStorage.getItem('pendingNotifications');
        if (pendingNotifications) {
          const count = JSON.parse(pendingNotifications)?.length || 0;
          setHasNotifications(count > 0);
        }
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };

    // Check on mount
    checkNotifications();

    // Set up event listener for storage changes
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'pendingNotifications') {
        checkNotifications();
      }
    };

    // Listen for custom notification events
    const handleNotificationEvent = () => {
      checkNotifications();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('notification-received', handleNotificationEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('notification-received', handleNotificationEvent);
    };
  }, []);

  if (!hasNotifications) {
    return null;
  }

  return (
    <span 
      className={`absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ${className}`}
      aria-label="New notifications"
    ></span>
  );
};

export default NotificationIndicator; 