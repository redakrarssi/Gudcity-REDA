import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Check, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationMessageTranslator } from '../../utils/notificationMessageTranslator';

/**
 * Global notification popup that displays the latest notification
 * Shows on any page when a new notification arrives
 */
const NotificationPopup: React.FC = () => {
  const { t } = useTranslation();
  const { 
    showPopup,
    latestNotification,
    dismissPopup 
  } = useNotifications();

  // Auto-dismiss popup after 5 seconds
  useEffect(() => {
    if (showPopup) {
      const timer = setTimeout(() => {
        dismissPopup();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showPopup, dismissPopup]);

  const getNotificationIcon = (type: string) => {
    if (type.includes('POINTS_ADDED')) {
      return <Check className="h-6 w-6 text-green-500" />;
    } else if (type.includes('POINTS_DEDUCTED')) {
      return <AlertCircle className="h-6 w-6 text-orange-500" />;
    } else if (type === 'PROGRAM_DELETED') {
      return <AlertCircle className="h-6 w-6 text-red-500" />;
    } else {
      return <Bell className="h-6 w-6 text-blue-500" />;
    }
  };

  if (!latestNotification) return null;

  return (
    <AnimatePresence>
      {showPopup && (
        <div className="fixed top-4 right-4 z-50 w-full max-w-sm">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getNotificationIcon(latestNotification.type)}
                  {(() => {
                    const translated = NotificationMessageTranslator.translateNotification(
                      latestNotification.title,
                      latestNotification.message,
                      t,
                      latestNotification.data
                    );
                    return (
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {translated.title}
                      </h3>
                    );
                  })()}
                </div>
                <button
                  onClick={dismissPopup}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-2">
                {(() => {
                  const translated = NotificationMessageTranslator.translateNotification(
                    latestNotification.title,
                    latestNotification.message,
                    t,
                    latestNotification.data
                  );
                  return (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {translated.message}
                    </p>
                  );
                })()}
                {latestNotification.businessName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {latestNotification.businessName}
                  </p>
                )}
              </div>
              {latestNotification.requiresAction && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {t('notifications.actionRequired')}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPopup;
