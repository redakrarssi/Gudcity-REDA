import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

interface NotificationIndicatorProps {
  className?: string;
}

/**
 * Notification bell indicator component with unread count badge
 */
const NotificationIndicator: React.FC<NotificationIndicatorProps> = ({ className = '' }) => {
  const { 
    unreadCount, 
    toggleNotificationCenter 
  } = useNotifications();

  return (
    <button
      onClick={toggleNotificationCenter}
      className={`relative p-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white focus:outline-none ${className}`}
      aria-label="Notifications"
    >
      <Bell className="w-6 h-6" />
      
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationIndicator; 