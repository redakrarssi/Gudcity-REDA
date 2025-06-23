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

// Placeholder types until we have the actual service
enum CustomerNotificationType {
  ENROLLMENT = 'ENROLLMENT',
  POINTS_ADDED = 'POINTS_ADDED',
  POINTS_DEDUCTED = 'POINTS_DEDUCTED',
  PROMO_CODE = 'PROMO_CODE'
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
  
  // Fetch notifications - For now return mock data
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['customerNotifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return { notifications: [] };
      // Mock data for development
      return { 
        notifications: [
          {
            id: '1',
            customerId: user.id,
            businessId: '123',
            type: CustomerNotificationType.POINTS_ADDED,
            title: 'Points Added',
            message: 'You received 50 points from Coffee Shop',
            requiresAction: false,
            actionTaken: false,
            isRead: false,
            createdAt: new Date().toISOString(),
            businessName: 'Coffee Shop'
          },
          {
            id: '2',
            customerId: user.id,
            businessId: '456',
            type: CustomerNotificationType.PROMO_CODE,
            title: 'New Promo Code',
            message: 'You received a new promo code from Fitness Center',
            data: { promoCode: 'FITNESS10' },
            requiresAction: false,
            actionTaken: false,
            isRead: true,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            businessName: 'Fitness Center'
          }
        ]
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Fetch approval requests - For now return mock data
  const { data: approvalsData, isLoading: approvalsLoading } = useQuery({
    queryKey: ['customerApprovals', user?.id],
    queryFn: async () => {
      if (!user?.id) return { approvals: [] };
      // Mock data for development
      return { 
        approvals: [
          {
            id: '1',
            notificationId: '3',
            customerId: user.id,
            businessId: '789',
            requestType: ApprovalRequestType.ENROLLMENT,
            entityId: 'program-123',
            status: 'PENDING',
            data: { 
              programName: 'VIP Membership',
              benefits: ['10% off all purchases', 'Free coffee on Mondays']
            },
            requestedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
            businessName: 'Premium Cafe'
          },
          {
            id: '2',
            notificationId: '4',
            customerId: user.id,
            businessId: '101',
            requestType: ApprovalRequestType.POINTS_DEDUCTION,
            entityId: 'card-456',
            status: 'PENDING',
            data: { 
              points: 25,
              reason: 'Incorrect points awarded during system maintenance'
            },
            requestedAt: new Date(Date.now() - 86400000).toISOString(),
            expiresAt: new Date(Date.now() + 6 * 86400000).toISOString(),
            businessName: 'Tech Store'
          }
        ]
      };
    },
    enabled: !!user?.id && showApprovalRequests,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  const notifications = notificationsData?.notifications || [];
  const approvals = approvalsData?.approvals || [];
  
  // Handle marking notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // In development, just mark as read client-side
      console.log(`Marking notification ${notificationId} as read`);
      queryClient.setQueryData(['customerNotifications', user?.id], (oldData: any) => {
        if (!oldData) return { notifications: [] };
        return {
          ...oldData,
          notifications: oldData.notifications.map((n: CustomerNotification) => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        };
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Handle approval action
  const handleApproval = async (approvalId: string, approved: boolean) => {
    try {
      // In development, just handle client-side
      console.log(`${approved ? 'Approving' : 'Declining'} request ${approvalId}`);
      queryClient.setQueryData(['customerApprovals', user?.id], (oldData: any) => {
        if (!oldData) return { approvals: [] };
        return {
          ...oldData,
          approvals: oldData.approvals.filter((a: ApprovalRequest) => a.id !== approvalId)
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
                id: `approval-${Date.now()}`,
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
  
  if (notificationsLoading || approvalsLoading) {
    return <div className="text-center py-4"><span className="text-gray-500">{t('Loading...')}</span></div>;
  }
  
  if (!notifications.length && !approvals.length) {
    return null; // Don't render anything if no notifications or approvals
  }
  
  return (
    <div className="space-y-4 mb-6">
      {showApprovalRequests && approvals.length > 0 && (
        <div className="mb-5">
          <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-amber-500" />
            {t('Approval Requests')}
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
                      {/* Show data from the approval */}
                      {approval.data && approval.data.message ? approval.data.message : 
                        approval.requestType === ApprovalRequestType.ENROLLMENT
                          ? `${approval.businessName} wants to enroll you in their loyalty program`
                          : `${approval.businessName} wants to deduct points from your card`}
                    </p>
                    
                    {/* Details about the request */}
                    {approval.data && (
                      <div className="mt-2 p-2 bg-white bg-opacity-70 rounded text-sm text-gray-700">
                        {approval.requestType === ApprovalRequestType.ENROLLMENT && approval.data.programName && (
                          <p>Program: {approval.data.programName}</p>
                        )}
                        {approval.requestType === ApprovalRequestType.POINTS_DEDUCTION && (
                          <>
                            {approval.data.points && <p>Points: {approval.data.points}</p>}
                            {approval.data.reason && <p>Reason: {approval.data.reason}</p>}
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
            {t('Recent Notifications')}
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
                    {notification.data && (
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
                              key !== 'requiresAction' && (
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

