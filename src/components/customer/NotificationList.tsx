import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bell, 
  Check, 
  X, 
  AlertCircle, 
  Info, 
  Gift, 
  Award, 
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CustomerNotificationService } from '../../services/customerNotificationService';

// Real types from the notification service
enum CustomerNotificationType {
  ENROLLMENT = 'ENROLLMENT',
  POINTS_ADDED = 'POINTS_ADDED',
  POINTS_DEDUCTED = 'POINTS_DEDUCTED',
  PROMO_CODE = 'PROMO_CODE',
  QR_SCANNED = 'QR_SCANNED'
}

enum ApprovalRequestType {
  ENROLLMENT = 'ENROLLMENT',
  POINTS_DEDUCTION = 'POINTS_DEDUCTION'
}

interface CustomerNotification {
  id: string;
  customerId: string;
  businessId: string;
  type: CustomerNotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  referenceId?: string;
  requiresAction: boolean;
  actionTaken: boolean;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
  businessName?: string;
}

interface ApprovalRequest {
  id: string;
  notificationId: string;
  customerId: string;
  businessId: string;
  requestType: ApprovalRequestType;
  entityId: string;
  status: string;
  data?: Record<string, any>;
  requestedAt: string;
  responseAt?: string;
  expiresAt: string;
  businessName?: string;
}

interface NotificationListProps {
  showApprovalRequests?: boolean;
}

const NotificationList: React.FC<NotificationListProps> = ({ showApprovalRequests = true }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  
  // Fetch real notifications from the service
  const { data: notificationsData, isLoading: notificationsLoading, error: notificationsError } = useQuery({
    queryKey: ['customerNotifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return { notifications: [] };
      
      try {
        const notifications = await CustomerNotificationService.getCustomerNotifications(user.id.toString());
        return { notifications };
      } catch (error) {
        console.error('Error fetching notifications:', error);
        // Return empty array on error instead of failing
        return { notifications: [] };
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  // Fetch real approval requests from the service
  const { data: approvalsData, isLoading: approvalsLoading, error: approvalsError } = useQuery({
    queryKey: ['customerApprovals', user?.id],
    queryFn: async () => {
      if (!user?.id) return { approvals: [] };
      
      try {
        const approvals = await CustomerNotificationService.getPendingApprovals(user.id.toString());
        return { approvals };
      } catch (error) {
        console.error('Error fetching approvals:', error);
        // Return empty array on error instead of failing
        return { approvals: [] };
      }
    },
    enabled: !!user?.id && showApprovalRequests,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
  
  const notifications = notificationsData?.notifications || [];
  const approvals = approvalsData?.approvals || [];
  
  // Handle marking notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const success = await CustomerNotificationService.markAsRead(notificationId);
      
      if (success) {
        // Update local cache
        queryClient.setQueryData(['customerNotifications', user?.id], (oldData: any) => {
          if (!oldData) return { notifications: [] };
          return {
            ...oldData,
            notifications: oldData.notifications.map((n: CustomerNotification) => 
              n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
            )
          };
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Handle approval action
  const handleApproval = async (approvalId: string, approved: boolean) => {
    try {
      const success = await CustomerNotificationService.respondToApproval(approvalId, approved);
      
      if (success) {
        // Update local cache - remove from approvals
        queryClient.setQueryData(['customerApprovals', user?.id], (oldData: any) => {
          if (!oldData) return { approvals: [] };
          return {
            ...oldData,
            approvals: oldData.approvals.filter((a: any) => a.id !== approvalId)
          };
        });

        // Add notification about approval action
        const approval = approvals.find(a => a.id === approvalId);
        if (approval) {
          queryClient.setQueryData(['customerNotifications', user?.id], (oldData: any) => {
            if (!oldData) return { notifications: [] };
            return {
              ...oldData,
              notifications: [
                {
                  id: `approval-response-${Date.now()}`,
                  customerId: user?.id || '',
                  businessId: approval.businessId,
                  type: approved ? CustomerNotificationType.ENROLLMENT : CustomerNotificationType.POINTS_DEDUCTED,
                  title: approved ? 'Request Approved' : 'Request Declined',
                  message: `You ${approved ? 'approved' : 'declined'} the request from ${approval.businessName}`,
                  requiresAction: false,
                  actionTaken: true,
                  isRead: false,
                  createdAt: new Date().toISOString(),
                  businessName: approval.businessName
                },
                ...oldData.notifications
              ]
            };
          });
        }

        // If approved and it's an enrollment, refresh customer cards data
        if (approved && approval.requestType === ApprovalRequestType.ENROLLMENT) {
          queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user?.id] });
          
          // Also trigger enrollment in the loyalty service
          try {
            const { LoyaltyProgramService } = await import('../../services/loyaltyProgramService');
            await LoyaltyProgramService.directEnrollCustomer(user?.id.toString() || '', approval.entityId);
          } catch (enrollmentError) {
            console.error('Error completing enrollment after approval:', enrollmentError);
          }
        }
      }
    } catch (error) {
      console.error('Error responding to approval:', error);
    }
  };
  
  // Get icon for notification
  const getNotificationIcon = (type: CustomerNotificationType | ApprovalRequestType) => {
    switch (type) {
      case CustomerNotificationType.POINTS_ADDED:
        return <Gift className="h-5 w-5 text-green-500" />;
      case CustomerNotificationType.POINTS_DEDUCTED:
        return <Gift className="h-5 w-5 text-orange-500" />;
      case CustomerNotificationType.ENROLLMENT:
        return <Award className="h-5 w-5 text-blue-500" />;
      case CustomerNotificationType.PROMO_CODE:
        return <Tag className="h-5 w-5 text-purple-500" />;
      case CustomerNotificationType.QR_SCANNED:
        return <Bell className="h-5 w-5 text-blue-600" />;
      case ApprovalRequestType.ENROLLMENT:
        return <Award className="h-5 w-5 text-blue-700" />;
      case ApprovalRequestType.POINTS_DEDUCTION:
        return <Gift className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Get notification class based on type
  const getNotificationClass = (type: CustomerNotificationType | ApprovalRequestType) => {
    switch (type) {
      case CustomerNotificationType.POINTS_ADDED:
        return 'bg-green-100 border-l-4 border-green-500';
      case CustomerNotificationType.POINTS_DEDUCTED:
        return 'bg-orange-100 border-l-4 border-orange-500';
      case CustomerNotificationType.ENROLLMENT:
        return 'bg-blue-100 border-l-4 border-blue-500';
      case CustomerNotificationType.PROMO_CODE:
        return 'bg-purple-100 border-l-4 border-purple-500';
      case CustomerNotificationType.QR_SCANNED:
        return 'bg-blue-100 border-l-4 border-blue-600';
      case ApprovalRequestType.ENROLLMENT:
        return 'bg-blue-100 border-l-4 border-blue-700';
      case ApprovalRequestType.POINTS_DEDUCTION:
        return 'bg-red-100 border-l-4 border-red-500';
      default:
        return 'bg-gray-100 border-l-4 border-gray-500';
    }
  };
  
  // Format date
  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleString();
  };
  
  // Show loading state
  if (notificationsLoading || approvalsLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <span className="text-gray-500 mt-2 block">{t('Loading notifications...')}</span>
      </div>
    );
  }
  
  // Show error state
  if (notificationsError || approvalsError) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
          <div>
            <p className="text-sm text-yellow-700">
              {t('Unable to load notifications. Please refresh the page.')}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Don't render if no notifications or approvals
  if (!notifications.length && !approvals.length) {
    return null;
  }
  
  return (
    <div className="space-y-4 mb-6">
      {showApprovalRequests && approvals.length > 0 && (
        <div className="mb-5">
          <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-amber-500" />
            {t('Approval Requests')} ({approvals.length})
          </h3>
          
          <div className="space-y-3">
            {approvals.map((approval: ApprovalRequest) => (
              <div 
                key={approval.id} 
                className={`p-4 rounded-lg shadow-sm ${getNotificationClass(approval.requestType as ApprovalRequestType)}`}
              >
                <div className="flex items-start">
                  <div className="mr-3 mt-0.5">
                    {getNotificationIcon(approval.requestType as ApprovalRequestType)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-800">
                        {approval.requestType === ApprovalRequestType.ENROLLMENT
                          ? t('Program Enrollment Request')
                          : t('Points Deduction Request')}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {formatDate(approval.requestedAt)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {approval.businessName} {approval.requestType === ApprovalRequestType.ENROLLMENT
                        ? t('wants to enroll you in their loyalty program')
                        : t('wants to deduct points from your card')}
                    </p>
                    
                    {/* Details about the request */}
                    {approval.data && (
                      <div className="mt-2 p-2 bg-white bg-opacity-70 rounded text-sm text-gray-700">
                        {approval.requestType === ApprovalRequestType.ENROLLMENT && approval.data.programName && (
                          <p><strong>Program:</strong> {approval.data.programName}</p>
                        )}
                        {approval.requestType === ApprovalRequestType.ENROLLMENT && approval.data.programDescription && (
                          <p><strong>Description:</strong> {approval.data.programDescription}</p>
                        )}
                        {approval.requestType === ApprovalRequestType.POINTS_DEDUCTION && (
                          <>
                            {approval.data.points && <p><strong>Points:</strong> {approval.data.points}</p>}
                            {approval.data.reason && <p><strong>Reason:</strong> {approval.data.reason}</p>}
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    <div className="mt-3 flex space-x-3 justify-end">
                      <button
                        onClick={() => handleApproval(approval.id, false)}
                        className="px-4 py-1 border border-red-300 text-red-700 rounded-md text-sm hover:bg-red-50 transition-colors"
                      >
                        {t('Decline')}
                      </button>
                      <button
                        onClick={() => handleApproval(approval.id, true)}
                        className="px-4 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-sm hover:bg-emerald-200 transition-colors"
                      >
                        {t('Approve')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {notifications.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
            <Bell className="mr-2 h-5 w-5 text-gray-600" />
            {t('Recent Notifications')} ({notifications.filter(n => !n.isRead).length} {t('unread')})
          </h3>
          
          <AnimatePresence>
            {notifications.map((notification: CustomerNotification) => (
              <motion.div 
                key={notification.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-3 rounded-lg shadow-sm ${
                  notification.isRead 
                    ? 'bg-white border border-gray-100' 
                    : getNotificationClass(notification.type)
                }`}
              >
                <div className="flex items-start">
                  <div className="mr-3 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className={`font-medium ${notification.isRead ? 'text-gray-700' : 'text-gray-800'}`}>
                        {notification.title}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    <p className={`text-sm ${notification.isRead ? 'text-gray-500' : 'text-gray-600'} mt-1`}>
                      {notification.message}
                    </p>
                    
                    {/* Expandable details if there's data */}
                    {notification.data && Object.keys(notification.data).length > 0 && (
                      <>
                        <button 
                          onClick={() => setActiveNotification(
                            activeNotification === notification.id ? null : notification.id
                          )}
                          className="text-xs text-blue-500 hover:underline mt-1 focus:outline-none"
                        >
                          {activeNotification === notification.id ? t('Hide details') : t('Show details')}
                        </button>
                        
                        {activeNotification === notification.id && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                            {Object.entries(notification.data).map(([key, value]) => 
                              key !== 'requiresAction' && value && (
                                <div key={key} className="flex justify-between mb-1">
                                  <span className="font-medium">{key}:</span>
                                  <span>{String(value)}</span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Mark as read button */}
                    {!notification.isRead && (
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-1 flex items-center text-xs text-blue-600 hover:text-blue-800"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {t('Mark as read')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default NotificationList;

