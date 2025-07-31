import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Bell, ThumbsUp, ThumbsDown, Award, AlertCircle, Check } from 'lucide-react';
import { CustomerNotificationService } from '../../services/customerNotificationService';
import { NotificationService } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface BusinessNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BusinessNotificationCenter: React.FC<BusinessNotificationCenterProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'approvals' | 'redemptions'>('approvals');
  const [approvals, setApprovals] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const loadData = async () => {
    if (!user?.id) return;

    // Load enrollment approvals (accepted / rejected)
    try {
      const notifications = await CustomerNotificationService.getBusinessNotifications(String(user.id));
      const filtered = notifications.filter((n: any) =>
        n.type === 'ENROLLMENT_ACCEPTED' || n.type === 'ENROLLMENT_REJECTED'
      );
      setApprovals(filtered);
    } catch (error) {
      console.error('Error fetching enrollment approvals:', error);
    }

    // Load redemption notifications
    try {
      const result = await NotificationService.getBusinessRedemptionNotifications(String(user.id));
      if (result.success) {
        setRedemptions(result.notifications);
      }
    } catch (error) {
      console.error('Error fetching redemption notifications:', error);
    }
  };

  // Helper relative time formatter
  const formatRelative = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t('just now');
    if (diffMin < 60) return t('{{count}} minutes ago', { count: diffMin });
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return t('{{count}} hours ago', { count: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    return t('{{count}} days ago', { count: diffDays });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold flex items-center text-gray-900 dark:text-white">
                <Bell className="mr-2" /> {t('Notifications')}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('approvals')}
                className={`flex-1 py-2 text-center font-medium ${
                  activeTab === 'approvals'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                {t('Approvals')} ({approvals.length})
              </button>
              <button
                onClick={() => setActiveTab('redemptions')}
                className={`flex-1 py-2 text-center font-medium ${
                  activeTab === 'redemptions'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                {t('Redemptions')} ({redemptions.length})
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {activeTab === 'approvals' && (
                approvals.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 mt-10">{t('No approvals yet')}</p>
                ) : (
                  approvals.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 flex items-start"
                    >
                      {item.type === 'ENROLLMENT_ACCEPTED' ? (
                        <ThumbsUp className="text-green-600 mr-3" />
                      ) : (
                        <ThumbsDown className="text-red-600 mr-3" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.customerName || t('Customer')} {item.type === 'ENROLLMENT_ACCEPTED' ? t('accepted') : t('declined')} {t('the program')} {item.programName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatRelative(item.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )
              )}

              {activeTab === 'redemptions' && (
                redemptions.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 mt-10">{t('No redemptions yet')}</p>
                ) : (
                  redemptions.map((item: any) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border ${
                        item.status === 'PENDING' 
                          ? 'border-green-200 bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500' 
                          : item.status === 'COMPLETED'
                            ? 'border-gray-200 bg-gray-50 dark:bg-gray-800'
                            : 'border-red-200 bg-red-50 dark:bg-red-900/20'
                      } flex items-start`}
                    >
                      <Gift className={`mr-3 ${
                        item.status === 'PENDING' ? 'text-green-600' : 
                        item.status === 'COMPLETED' ? 'text-gray-600' : 'text-red-600'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          🎉 {item.customerName} {t('redeemed')} {item.points} {t('points')} for <strong>{item.reward}</strong>
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Program: {item.programName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatRelative(item.timestamp)}</p>
                        
                        {item.status === 'PENDING' && (
                          <div className="mt-2 flex space-x-2">
                            <button
                              onClick={async () => {
                                try {
                                  const result = await NotificationService.updateRedemptionStatus(
                                    item.id, 
                                    'COMPLETED',
                                    user?.id?.toString() || ''
                                  );
                                  if (result.success) {
                                    loadData(); // Refresh notifications
                                  }
                                } catch (error) {
                                  console.error('Error completing redemption:', error);
                                }
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                            >
                              <Check size={14} className="mr-1" />
                              {t('Delivered')}
                            </button>
                          </div>
                        )}
                        
                        {item.status === 'COMPLETED' && (
                          <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            <Check size={12} className="mr-1" />
                            {t('Delivered')}
                          </div>
                        )}
                        
                        {item.status === 'REJECTED' && (
                          <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">
                            <X size={12} className="inline-block mr-1" />
                            {t('Rejected')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}; 