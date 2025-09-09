import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Gift, UserPlus } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

interface BusinessRedemptionNotificationsProps {
  onUpdate?: () => void;
}

export const BusinessRedemptionNotifications: React.FC<BusinessRedemptionNotificationsProps> = ({ 
  onUpdate 
}) => {
  const { t } = useTranslation();
  const { 
    businessNotifications: notifications, 
    businessUnreadCount: unreadCount,
    completeBusinessNotification 
  } = useNotifications();
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  const handleCompleteRedemption = async (notificationId: string) => {
    try {
      await completeBusinessNotification(notificationId);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error completing redemption:', error);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      
      if (diffMinutes < 1) return t('notificationMessages.justNow');
      if (diffMinutes < 60) return t('notificationMessages.minutesAgo', { minutes: diffMinutes });
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return t('notificationMessages.hoursAgo', { hours: diffHours });
      const diffDays = Math.floor(diffHours / 24);
      return t('notificationMessages.daysAgo', { days: diffDays });
    } catch {
      return t('notificationMessages.recently');
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Business Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Business Notifications
              </h3>
              <p className="text-sm text-gray-500">
                {unreadCount} pending notifications
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map(notification => {
                  const isEnrollment = notification.points === 0;
                  const isPending = notification.status === 'PENDING';
                  
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`p-4 border-b border-gray-100 transition-colors duration-200 ${
                        isPending 
                          ? 'bg-green-50 border-l-4 border-green-500 hover:bg-green-100' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {isEnrollment ? (
                            <UserPlus className="h-5 w-5 text-green-600" />
                          ) : (
                            <Gift className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {isEnrollment ? '👥' : '🎉'} {notification.customerName} {isEnrollment ? t('notificationMessages.enrolledIn') : t('notificationMessages.redeemedPointsFor', { points: notification.points })} <strong>{notification.reward}</strong>
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {t('notificationMessages.program')}: {notification.programName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {isPending ? (
                            <button
                              onClick={() => handleCompleteRedemption(notification.id)}
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
                    </motion.div>
                  );
                })
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="w-full text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  Close notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};