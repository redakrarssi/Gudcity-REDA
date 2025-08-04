import React, { useState, useEffect, FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Settings, X, Check, AlertCircle, Gift, Clock, Star, Users, Award, ThumbsUp, ThumbsDown, Tag } from 'lucide-react';
import { NotificationService } from '../../services/notificationService';
import type { Notification, NotificationPreferences, NotificationType } from '../../types/notification';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../contexts/NotificationContext';

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
  const { 
    showNotificationCenter, 
    toggleNotificationCenter, 
    approvalRequests,
    markAsRead,
    respondToApproval
  } = useNotifications();

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
      case 'PROMO_CODE_RECEIVED':
        return <Tag className="h-8 w-8 text-green-600" />;
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

  // Format date to relative time (e.g. "2 hours ago")
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return 'just now';
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    } else if (diffDay < 30) {
      return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <AnimatePresence>
      {showNotificationCenter && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={toggleNotificationCenter}
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 30 }}
            className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
              <button
                onClick={toggleNotificationCenter}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowNotifications(true)}
                className={`flex-1 py-2 px-4 text-center ${
                  showNotifications
                    ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setShowNotifications(false)}
                className={`flex-1 py-2 px-4 text-center ${
                  !showNotifications
                    ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Approvals {approvalRequests.length > 0 && `(${approvalRequests.length})`}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-2">
              {showNotifications && (
                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        onClick={() => {
                          if (!notification.isRead) markAsRead(notification.id);
                        }}
                        className={`p-3 rounded-lg cursor-pointer ${
                          notification.isRead
                            ? 'bg-white dark:bg-gray-800'
                            : 'bg-blue-50 dark:bg-blue-900/20'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {notification.message}
                            </p>
                            
                            {/* Special display for promo code notifications */}
                            {notification.type === 'PROMO_CODE_RECEIVED' && notification.data && (
                              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-medium text-green-800 dark:text-green-200">
                                      {notification.data.promoCodeName || 'Promo Code'}
                                    </p>
                                    <p className="text-xs text-green-600 dark:text-green-300">
                                      {notification.data.promoCodeType}: {notification.data.promoCodeValue} {notification.data.promoCodeCurrency || 'points'}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-mono font-bold text-green-800 dark:text-green-200">
                                      {notification.data.promoCode}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center mt-1">
                              {notification.businessName && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                                  {notification.businessName}
                                </span>
                              )}
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatRelativeTime(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                          {!notification.isRead && (
                            <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {!showNotifications && (
                <div className="space-y-3">
                  {approvalRequests.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                      <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No pending approvals</p>
                    </div>
                  ) : (
                    approvalRequests.map(approval => (
                      <div
                        key={approval.id}
                        className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {approval.requestType === 'ENROLLMENT' ? (
                              <Award className="h-5 w-5 text-blue-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-orange-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {approval.requestType === 'ENROLLMENT'
                                ? 'Program Enrollment Request'
                                : 'Points Deduction Request'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {approval.requestType === 'ENROLLMENT'
                                ? `${approval.businessName} wants to enroll you in ${approval.data?.programName || 'a program'}.`
                                : `${approval.businessName} wants to deduct ${approval.data?.points || ''} points.`}
                            </p>
                            
                            {/* Display benefits if available */}
                            {approval.data?.benefits && (
                              <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                                <p className="font-medium">Benefits:</p>
                                <ul className="list-disc list-inside pl-2 mt-1">
                                  {approval.data.benefits.map((benefit: string, i: number) => (
                                    <li key={i}>{benefit}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Display reason if available */}
                            {approval.data?.reason && (
                              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                                <span className="font-medium">Reason: </span>
                                {approval.data.reason}
                              </p>
                            )}
                            
                            <div className="flex items-center space-x-2 mt-2">
                              <Clock className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatRelativeTime(approval.requestedAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex space-x-2">
                          <button
                            onClick={() => respondToApproval(approval.id, true)}
                            className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" /> Approve
                          </button>
                          <button
                            onClick={() => respondToApproval(approval.id, false)}
                            className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white text-sm font-medium rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            <ThumbsDown className="h-4 w-4 mr-1" /> Decline
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}; 