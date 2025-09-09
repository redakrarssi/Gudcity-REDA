import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Check, Gift, UserPlus } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

interface BusinessNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BusinessNotificationCenter: React.FC<BusinessNotificationCenterProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { 
    businessNotifications: notifications, 
    businessUnreadCount,
    completeBusinessNotification 
  } = useNotifications();

  // Helper relative time formatter
  const formatRelative = (timestamp: string) => {
    try {
      if (!timestamp) return 'recently';
      
      const date = new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'recently';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      
      // If time is in future or negative, return recently
      if (diffMs < 0) return 'recently';
      
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'just now';
      if (diffMin < 60) return `${diffMin} minutes ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours} hours ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays} days ago`;
      
      // For very old notifications, show actual date
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'recently';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Business Notifications
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors duration-200"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto max-h-96">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map(notification => {
                  const isEnrollment = notification.points === 0;
                  const isPending = notification.status === 'PENDING';
                  
                  return (
                    <div 
                      key={notification.id} 
                      className={`p-4 border-b border-gray-100 transition-colors duration-200 ${
                        isPending 
                          ? 'bg-green-50 border-l-4 border-green-500' 
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {isEnrollment ? (
                          <UserPlus className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <Gift className="h-5 w-5 text-blue-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {isEnrollment ? '👥' : '🎉'} {notification.customerName} {isEnrollment ? t('notificationMessages.enrolledIn') : t('notificationMessages.redeemedPointsFor', { points: notification.points })} <strong>{notification.reward}</strong>
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {t('notificationMessages.program')}: {notification.programName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatRelative(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {isPending ? (
                            <button
                              onClick={() => completeBusinessNotification(notification.id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors duration-200 font-medium"
                            >
                              <Check className="h-3 w-3 inline mr-1" />
                              {t('notificationMessages.delivered')}
                            </button>
                          ) : (
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-md">
                              {t('notificationMessages.delivered')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {businessUnreadCount} pending notifications
                  </span>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};