import React, { useState, useEffect, FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Settings, X, Check, AlertCircle, Gift, Clock, Star, Users, Award } from 'lucide-react';
import { NotificationService } from '../../services/notificationService';
import type { Notification, NotificationPreferences, NotificationType } from '../../types/notification';

interface NotificationCenterProps {
  userId: string;
}

export const NotificationCenter: FC<NotificationCenterProps> = ({ userId }) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, [userId]);

  const loadNotifications = async () => {
    try {
      const { notifications: userNotifications } = await NotificationService.getUserNotifications(userId);
      const { stats } = await NotificationService.getNotificationStats(userId);
      setNotifications(userNotifications);
      setUnreadCount(stats.totalUnread);
    } catch (error) {
      console.error("Failed to load notifications:", error);
      // Display a user-friendly error message if needed
    }
  };

  const loadPreferences = async () => {
    try {
      const prefs = await NotificationService.getUserPreferences(userId);
      setPreferences(prefs);
    } catch (error) {
      console.error("Failed to load preferences:", error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      setNotifications(prevNotifications =>
        prevNotifications.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleUpdatePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      await NotificationService.updatePreferences(newPreferences);
      setPreferences(newPreferences);
      setShowPreferences(false);
    } catch (error) {
      console.error("Failed to update preferences:", error);
    }
  };

  const getNotificationIcon = (type: NotificationType): React.ReactElement => {
    switch (type) {
      case 'POINTS_EARNED':
        return <Gift className="h-8 w-8 text-yellow-500" />;
      case 'REWARD_AVAILABLE':
        return <Star className="h-8 w-8 text-yellow-400" />;
      case 'CODE_EXPIRING':
        return <Clock className="h-8 w-8 text-red-500" />;
      case 'PROGRAM_ENROLLED':
        return <Award className="h-8 w-8 text-green-500" />;
      case 'NEW_CUSTOMER':
        return <Users className="h-8 w-8 text-blue-500" />;
      case 'MILESTONE_REACHED':
        return <Award className="h-8 w-8 text-purple-500" />;
      case 'SYSTEM_ALERT':
      case 'SUSPICIOUS_ACTIVITY':
      case 'NEW_BUSINESS_APPLICATION':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
      default:
        return <Bell className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell - Larger and more prominent */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-3 text-gray-700 hover:text-blue-600 focus:outline-none rounded-full hover:bg-gray-100 transition-colors duration-150 ease-in-out min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={t('viewNotifications')}
      >
        <Bell className="h-7 w-7" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 transform translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl z-50 border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800">
                {t('yourMessages')}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setShowPreferences(true);
                    setShowNotifications(false); // Close notification panel when opening preferences
                  }}
                  className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                  aria-label={t('notificationSettings')}
                  title={t('notificationSettings') as string}
                >
                  <Settings className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                  aria-label={t('closeNotifications')}
                  title={t('closeNotifications') as string}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-200px)] overflow-y-auto" style={{ maxHeight: '400px' }}>
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="font-medium">{t('allCaughtUp')}</p>
                <p className="text-sm">{t('noNewMessages')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 transition-colors duration-150 ease-in-out ${notification.isRead ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 pt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${notification.isRead ? 'text-gray-700' : 'text-blue-700'}`}>
                          {notification.title}
                        </p>
                        <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="mt-2 text-xs text-gray-400">
                          {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-100 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                          aria-label={t('markAsRead')}
                          title={t('markAsRead') as string}
                        >
                          <Check className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {notifications.length > 0 && (
             <div className="p-3 border-t border-gray-200 text-center">
                <button 
                    onClick={loadNotifications} // Example: Reload or view all
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                    {t('seeAllNotifications')}
                </button>
            </div>
          )}
        </div>
      )}

      {/* Preferences Modal - Enhanced Styling */}
      {showPreferences && preferences && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 m-4 transform transition-all duration-300 ease-out scale-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">
                {t('notificationPreferences')}
              </h3>
              <button
                onClick={() => setShowPreferences(false)}
                className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label={t('closePreferences')}
                 title={t('closePreferences') as string}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
              <div>
                <h4 className="text-md font-semibold text-gray-700 mb-3">
                  {t('howToNotify')}
                </h4>
                <div className="space-y-3">
                  {[ {key: 'email', label: t('emailNotifications')}, {key: 'push', label: t('pushNotifications')}, {key: 'inApp', label: t('inAppNotifications')}].map(channel => (
                     <label key={channel.key} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences[channel.key as keyof Omit<NotificationPreferences, 'userId' | 'types'>]}
                          onChange={e => {
                            const key = channel.key as keyof Omit<NotificationPreferences, 'userId' | 'types'>;
                            setPreferences(prev => prev ? {
                              ...prev,
                              [key]: e.target.checked
                            } : null);
                          }}
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 ring-offset-2"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-800">{channel.label}</span>
                      </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-700 mb-3">
                  {t('whatToNotifyAbout')}
                </h4>
                <div className="space-y-1">
                  {Object.entries(preferences.types).map(([type, enabled]) => (
                    <label key={type} className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={e => setPreferences(prev => prev ? {
                          ...prev,
                          types: {
                            ...prev.types,
                            [type]: e.target.checked
                          }
                        } : null)}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 ring-offset-1"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        {t(type.toLowerCase().replace(/_/g, ' '))}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button
                onClick={() => {
                    loadPreferences(); // Reset changes
                    setShowPreferences(false);
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors min-h-[44px]"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleUpdatePreferences(preferences)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors min-h-[44px]"
              >
                {t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 