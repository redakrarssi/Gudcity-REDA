import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Check, X, AlertCircle, Gift } from 'lucide-react';
import { RedemptionNotification } from '../../types/loyalty';
import { NotificationService } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';

interface BusinessRedemptionNotificationsProps {
  onUpdate?: () => void;
}

export const BusinessRedemptionNotifications: React.FC<BusinessRedemptionNotificationsProps> = ({ 
  onUpdate 
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<RedemptionNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user]);

  useEffect(() => {
    // Listen for real-time notifications
    const handleRedemptionEvent = (event: CustomEvent) => {
      loadNotifications();
    };

    window.addEventListener('redemption-notification', handleRedemptionEvent as EventListener);

    return () => {
      window.removeEventListener('redemption-notification', handleRedemptionEvent as EventListener);
    };
  }, []);

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const businessId = user.id.toString();
      const result = await NotificationService.getBusinessRedemptionNotifications(businessId);

      if (result.success) {
        setNotifications(result.notifications);
        setUnreadCount(result.notifications.filter(n => !n.isRead).length);
      } else {
        setError(result.error || 'Failed to load notifications');
      }
    } catch (err) {
      console.error('Error loading redemption notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRedemption = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const result = await NotificationService.updateRedemptionStatus(
        notificationId, 
        'COMPLETED',
        user.id.toString()
      );

      if (result.success) {
        // Update local state
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notification.id === notificationId 
              ? { ...notification, status: 'COMPLETED' } 
              : notification
          )
        );
        
        // Notify parent component
        if (onUpdate) {
          onUpdate();
        }
      } else {
        console.error('Failed to complete redemption:', result.error);
      }
    } catch (err) {
      console.error('Error completing redemption:', err);
    }
  };

  const handleRejectRedemption = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const result = await NotificationService.updateRedemptionStatus(
        notificationId, 
        'REJECTED',
        user.id.toString()
      );

      if (result.success) {
        // Update local state
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notification.id === notificationId 
              ? { ...notification, status: 'REJECTED' } 
              : notification
          )
        );
        
        // Notify parent component
        if (onUpdate) {
          onUpdate();
        }
      } else {
        console.error('Failed to reject redemption:', result.error);
      }
    } catch (err) {
      console.error('Error rejecting redemption:', err);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Simple function to format time relative to now
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      
      // Convert to seconds, minutes, hours, days
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      } else if (diffHours > 0) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      } else if (diffMin > 0) {
        return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
      } else {
        return 'just now';
      }
    } catch (err) {
      return 'Unknown time';
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={toggleNotifications}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
        aria-label="Redemption notifications"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium">{t('Redemption Requests')}</h3>
          </div>
          
          {isLoading ? (
            <div className="p-4 text-center">
              <span className="inline-block animate-spin mr-2">⏳</span>
              {t('Loading...')}
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">
              <AlertCircle size={20} className="inline-block mr-2" />
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              {t('No redemption requests')}
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-3 border-b border-gray-200 dark:border-gray-700 ${
                    notification.status === 'PENDING' 
                      ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500' 
                      : notification.status === 'COMPLETED'
                        ? 'bg-gray-50 dark:bg-gray-800'
                        : 'bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <Gift size={20} className="text-blue-500" />
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        🎉 {notification.customerName}
                      </p>
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        Redeemed {notification.points} points for <strong>{notification.reward}</strong>
                      </p>
                      <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                        Program: {notification.programName}
                      </p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {formatTime(notification.timestamp)}
                      </p>
                      
                      {notification.status === 'PENDING' && (
                        <div className="mt-2 flex space-x-2">
                          <button
                            onClick={() => handleCompleteRedemption(notification.id)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                          >
                            <Check size={16} className="mr-1.5" />
                            {t('Delivered')}
                          </button>
                          <button
                            onClick={() => handleRejectRedemption(notification.id)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <X size={14} className="mr-1" />
                            {t('Reject')}
                          </button>
                        </div>
                      )}
                      
                      {notification.status === 'COMPLETED' && (
                        <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          <Check size={12} className="mr-1" />
                          {t('Delivered')}
                        </div>
                      )}
                      
                      {notification.status === 'REJECTED' && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                          <X size={14} className="inline-block mr-1" />
                          {t('Rejected')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 