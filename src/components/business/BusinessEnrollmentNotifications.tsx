import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, ThumbsUp, ThumbsDown, User, Clock, AlertCircle } from 'lucide-react';
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
  
  useEffect(() => {
    if (businessId) {
      loadEnrollmentNotifications();
    }
  }, [businessId]);
  
  const loadEnrollmentNotifications = async () => {
    try {
      setLoading(true);
      const businessNotifications = await CustomerNotificationService.getBusinessNotifications(businessId);
      
      // Filter for enrollment-related notifications
      const enrollmentNotifications = businessNotifications.filter(notification => 
        notification.type === 'ENROLLMENT_ACCEPTED' || 
        notification.type === 'ENROLLMENT_REJECTED' ||
        notification.type === 'NEW_ENROLLMENT' ||
        notification.type === 'ENROLLMENT_REQUEST'
      );
      
      setNotifications(enrollmentNotifications);
      setLoading(false);
    } catch (err) {
      console.error('Error loading enrollment notifications:', err);
      setError('Failed to load enrollment notifications');
      setLoading(false);
    }
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
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return t('just now');
    if (diffMin < 60) return t('{{count}} minutes ago', { count: diffMin });
    
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return t('{{count}} hours ago', { count: diffHours });
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return t('{{count}} days ago', { count: diffDays });
    
    return date.toLocaleDateString();
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ENROLLMENT_ACCEPTED':
        return <ThumbsUp className="h-5 w-5 text-green-500" />;
      case 'ENROLLMENT_REJECTED':
        return <ThumbsDown className="h-5 w-5 text-red-500" />;
      case 'NEW_ENROLLMENT':
        return <Award className="h-5 w-5 text-blue-500" />;
      case 'ENROLLMENT_REQUEST':
        return <Clock className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };
  
  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex items-center text-red-500">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">{t('Enrollment Notifications')}</h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        <AnimatePresence>
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('No enrollment notifications yet')}</p>
            </div>
          ) : (
            notifications.map(notification => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''}`}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-3">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center mt-1">
                      {notification.customerName && (
                        <span className="text-xs font-medium text-gray-500 mr-2">
                          {notification.customerName}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <div className="flex-shrink-0 ml-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-600"></span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
      
      {notifications.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <button 
            onClick={loadEnrollmentNotifications}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {t('Refresh')}
          </button>
        </div>
      )}
    </div>
  );
}; 