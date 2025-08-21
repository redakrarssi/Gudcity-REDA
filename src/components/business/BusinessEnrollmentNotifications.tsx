import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, ThumbsUp, ThumbsDown, User, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { CustomerNotificationService } from '../../services/customerNotificationService';
import { motion, AnimatePresence } from 'framer-motion';

interface BusinessEnrollmentNotificationsProps {
  businessId: string;
}

interface EnrollmentNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  customerName?: string;
  programName?: string;
  createdAt: string;
  isRead: boolean;
  data?: Record<string, any>;
}

export const BusinessEnrollmentNotifications: React.FC<BusinessEnrollmentNotificationsProps> = ({ businessId }) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<EnrollmentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Enhanced real-time event handling
  useEffect(() => {
    if (!businessId) return;

    // Listen for enrollment approval events
    const handleEnrollmentApproval = (event: CustomEvent) => {
      const { requestId, approved, cardId } = event.detail;
      
      console.log('Enrollment approval event received in business component:', { requestId, approved, cardId });
      
      // Refresh notifications to show updated status
      loadEnrollmentNotifications();
    };

    // Listen for card creation events
    const handleCardCreated = (event: CustomEvent) => {
      const { cardId, customerId, businessId: eventBusinessId } = event.detail;
      
      // Only refresh if this event is for our business
      if (eventBusinessId === businessId) {
        console.log('Card created event received for business:', { cardId, customerId, businessId: eventBusinessId });
        loadEnrollmentNotifications();
      }
    };

    // Listen for socket connection events
    const handleSocketConnected = (event: CustomEvent) => {
      console.log('Socket connected in business component:', event.detail);
      // Force refresh when connection is restored
      loadEnrollmentNotifications();
    };

    // Listen for storage sync events
    const handleStorageSync = (event: StorageEvent) => {
      if (event.key && event.key.startsWith('enrollment_sync_')) {
        try {
          const syncEvent = JSON.parse(event.newValue || '{}');
          console.log('Enrollment sync event received in business component:', syncEvent);
          
          // Only refresh if this event is for our business
          if (syncEvent.business_id === businessId) {
            loadEnrollmentNotifications();
          }
        } catch (error) {
          console.error('Error parsing enrollment sync event:', error);
        }
      }
    };

    // Add event listeners
    window.addEventListener('enrollmentApprovalProcessed', handleEnrollmentApproval as EventListener);
    window.addEventListener('cardCreated', handleCardCreated as EventListener);
    window.addEventListener('socketConnected', handleSocketConnected as EventListener);
    window.addEventListener('storage', handleStorageSync);

    // Cleanup function
    return () => {
      window.removeEventListener('enrollmentApprovalProcessed', handleEnrollmentApproval as EventListener);
      window.removeEventListener('cardCreated', handleCardCreated as EventListener);
      window.removeEventListener('socketConnected', handleSocketConnected as EventListener);
      window.removeEventListener('storage', handleStorageSync);
    };
  }, [businessId]);

  // Enhanced visibility change detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Business page became visible, refreshing enrollment notifications');
        loadEnrollmentNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [businessId]);
  
  useEffect(() => {
    if (businessId) {
      loadEnrollmentNotifications();
    }
  }, [businessId]);
  
  const loadEnrollmentNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const businessNotifications = await CustomerNotificationService.getBusinessNotifications(businessId);
      
      // Filter for enrollment-related notifications
      const enrollmentNotifications = businessNotifications.filter(notification => 
        notification.type === 'ENROLLMENT_ACCEPTED' || 
        notification.type === 'ENROLLMENT_REJECTED' ||
        notification.type === 'NEW_ENROLLMENT' ||
        notification.type === 'ENROLLMENT_REQUEST'
      );
      
      setNotifications(enrollmentNotifications);
    } catch (err) {
      console.error('Error loading enrollment notifications:', err);
      setError('Failed to load enrollment notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEnrollmentNotifications();
    setRefreshing(false);
  };
  
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await CustomerNotificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };
  
  const formatTimeAgo = (dateString: string) => {
    try {
      if (!dateString) return t('recently');
      
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return t('recently');
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      
      // If time is in future or negative, return recently
      if (diffMs < 0) return t('recently');
      
      const diffMin = Math.floor(diffMs / 60000);
      
      if (diffMin < 1) return t('just now');
      if (diffMin < 60) return t('{{count}} minutes ago', { count: diffMin });
      
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return t('{{count}} hours ago', { count: diffHours });
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return t('{{count}} days ago', { count: diffDays });
      
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting time:', error);
      return t('recently');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ENROLLMENT_ACCEPTED':
        return <ThumbsUp className="w-5 h-5 text-green-600" />;
      case 'ENROLLMENT_REJECTED':
        return <ThumbsDown className="w-5 h-5 text-red-600" />;
      case 'NEW_ENROLLMENT':
        return <User className="w-5 h-5 text-blue-600" />;
      case 'ENROLLMENT_REQUEST':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'ENROLLMENT_ACCEPTED':
        return 'border-l-4 border-l-green-500 bg-green-50';
      case 'ENROLLMENT_REJECTED':
        return 'border-l-4 border-l-red-500 bg-red-50';
      case 'NEW_ENROLLMENT':
        return 'border-l-4 border-l-blue-500 bg-blue-50';
      case 'ENROLLMENT_REQUEST':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-4 border-l-gray-500 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading notifications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center mx-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Try Again
        </button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No enrollment notifications yet</p>
        <p className="text-sm">You'll see notifications here when customers respond to enrollment requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Enrollment Notifications</h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          title="Refresh notifications"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Notifications list */}
      <div className="space-y-3">
        <AnimatePresence>
          {notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`p-4 rounded-lg shadow-sm ${getNotificationStyle(notification.type)} ${
                !notification.isRead ? 'ring-2 ring-blue-200' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </h4>
                      {!notification.isRead && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    {notification.data && (
                      <div className="mt-2 text-xs text-gray-500">
                        {notification.data.programName && (
                          <span className="inline-block mr-3">
                            Program: {notification.data.programName}
                          </span>
                        )}
                        {notification.data.customerName && (
                          <span className="inline-block">
                            Customer: {notification.data.customerName}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </div>
                
                {!notification.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}; 