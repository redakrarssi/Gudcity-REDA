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
  Tag,
  Loader,
  AlertTriangle,
  HelpCircle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CustomerNotificationService } from '../../services/customerNotificationService';
import sql from '../../utils/db';
import { 
  reportEnrollmentError, 
  EnrollmentErrorCode, 
  formatEnrollmentErrorForUser,
  createDetailedError
} from '../../utils/enrollmentErrorReporter';
import EnrollmentErrorDisplay from './EnrollmentErrorDisplay';

// Real types from the notification service
enum CustomerNotificationType {
  ENROLLMENT = 'ENROLLMENT',
  ENROLLMENT_REQUEST = 'ENROLLMENT_REQUEST',
  POINTS_ADDED = 'POINTS_ADDED',
  POINTS_DEDUCTED = 'POINTS_DEDUCTED',
  PROMO_CODE = 'PROMO_CODE',
  PROGRAM_DELETED = 'PROGRAM_DELETED',
  REWARD_DELIVERED = 'REWARD_DELIVERED',
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
  customerId: string;
  businessId: string;
  businessName: string;
  entityId: string;
  requestType: ApprovalRequestType;
  status: string;
  createdAt: string;
  expiresAt?: string;
  data?: Record<string, any>;
}

interface ResponseStatus {
  id: string;
  status: 'success' | 'error';
  message: string;
  details?: string;
  errorCode?: string;
  errorLocation?: string;
  showDetails?: boolean;
}

interface NotificationListProps {
  maxHeight?: string;
  showHeader?: boolean;
  showApprovals?: boolean;
  onNotificationClick?: (notification: CustomerNotification) => void;
}

const createErrorResponse = (
  id: string, 
  error: any, 
  location: string
): ResponseStatus => {
  return {
    id,
    status: 'error',
    message: error.message || 'An unexpected error occurred',
    details: error.details || JSON.stringify(error),
    errorCode: error.code || EnrollmentErrorCode.UNKNOWN_ERROR,
    errorLocation: location,
    showDetails: false
  };
};

const NotificationList: React.FC<NotificationListProps> = ({
  maxHeight = '400px',
  showHeader = true,
  showApprovals = true,
  onNotificationClick
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [processingApprovalId, setProcessingApprovalId] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<ResponseStatus | null>(null);

  // Fetch notifications
  const notificationsQuery = useQuery({
    queryKey: ['customerNotifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return { notifications: [] };
      const notifications = await CustomerNotificationService.getCustomerNotifications(user.id.toString());
      return { notifications };
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch approval requests
  const approvalsQuery = useQuery({
    queryKey: ['customerApprovals', user?.id],
    queryFn: async () => {
      if (!user?.id) return { approvals: [] };
      const approvals = await CustomerNotificationService.getCustomerApprovalRequests(user.id.toString());
      return { approvals };
    },
    enabled: !!user?.id && showApprovals,
    staleTime: 60 * 1000, // 1 minute
  });
  
  const isLoading = notificationsQuery.isLoading || approvalsQuery.isLoading;
  const notificationsData = notificationsQuery.data || { notifications: [] };
  const approvalsData = approvalsQuery.data || { approvals: [] };
  
  const unreadNotificationCount = notificationsData.notifications.filter(
    (n: CustomerNotification) => !n.isRead
  ).length;
  
  const pendingApprovalCount = approvalsData.approvals?.filter(
    (a: ApprovalRequest) => a.status === 'PENDING'
  ).length || 0;
  
  const notifications = notificationsData.notifications || [];
  
  // Function to handle marking notification as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await CustomerNotificationService.markAsRead(id);
      queryClient.invalidateQueries({ queryKey: ['customerNotifications', user?.id] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Toggle error details visibility
  const toggleErrorDetails = () => {
    if (responseStatus) {
      setResponseStatus({
        ...responseStatus,
        showDetails: !responseStatus.showDetails
      });
    }
  };

  const handleApproval = async (approvalId: string, approved: boolean) => {
    if (!user?.id) return;
    
    try {
      // Find the approval request to get details
      const approval = approvalsData?.approvals?.find(a => a.id === approvalId);
      if (!approval) {
        console.error('Approval request not found:', approvalId);
        const error = reportEnrollmentError(
          EnrollmentErrorCode.APPROVAL_REQUEST_NOT_FOUND,
          'Approval request not found in client data',
          { approvalId },
          approvalId
        );
        
        setResponseStatus(createErrorResponse(
          approvalId,
          error,
          'NotificationList.handleApproval - Request lookup'
        ));
        return;
      }
      
      // Set processing state to show loading
      setProcessingApprovalId(approvalId);
      
      // If this is an enrollment request, handle it through the wrapper service
      if (approval.requestType === ApprovalRequestType.ENROLLMENT) {
        try {
          // Import the wrapper service with safer response handling
          const { safeRespondToApproval } = await import('../../services/customerNotificationServiceWrapper');
          
          // Call the wrapper service to handle the enrollment 
          const result = await safeRespondToApproval(approvalId, approved);
          
          // If success, show the appropriate message and refresh data
          if (result.success) {
            // Create response status based on approval or decline
            setResponseStatus({
              id: approvalId,
              status: 'success',
              message: result.message || (approved 
                ? `You've joined ${approval.data?.programName || 'the program'}`
                : `You declined to join ${approval.data?.programName || 'the program'}`)
            });
            
            // Invalidate ALL related queries to ensure UI updates properly
            queryClient.invalidateQueries({ queryKey: ['customerApprovals', user.id] });
            queryClient.invalidateQueries({ queryKey: ['customerNotifications', user.id] });
            
            // Always invalidate these queries when enrollment is approved
            if (approved) {
              // Invalidate enrolled programs query to refresh the programs list
              queryClient.invalidateQueries({ queryKey: ['customers', 'programs', user.id.toString()] });
              
              // Invalidate loyalty cards query
              queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
              queryClient.invalidateQueries({ queryKey: ['loyaltyCards'] });
              
              // Force refresh after a short delay to ensure DB operations complete
              setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['customers', 'programs', user.id.toString()] });
                queryClient.invalidateQueries({ queryKey: ['loyaltyCards'] });
              }, 500);
            }
          } else {
            // Handle error case
            setResponseStatus(createErrorResponse(
              approvalId,
              {
                code: result.errorCode || EnrollmentErrorCode.UNKNOWN_ERROR,
                message: result.message || 'An error occurred while processing the enrollment',
                details: result.details
              },
              result.errorLocation || 'Enrollment processing'
            ));
          }
          
          // Clear processing state
          setProcessingApprovalId(null);
        } catch (error) {
          console.error('Error handling enrollment approval:', error);
          
          // Report the error with detailed location information
          const reportedError = reportEnrollmentError(
            EnrollmentErrorCode.UNKNOWN_ERROR,
            'Unhandled error in enrollment approval process',
            createDetailedError(
              error, 
              'NotificationList.handleApproval - Try/catch for safeRespondToApproval',
              { approvalId, approved }
            ),
            approvalId,
            user.id.toString(),
            approval.entityId
          );
          
          // Set the error in UI
          setResponseStatus(createErrorResponse(
            approvalId,
            reportedError,
            'Enrollment approval process'
          ));
          
          // Clear processing state
          setProcessingApprovalId(null);
        }
        return;
      }
      
      // For non-enrollment requests, use the original service
      try {
        const result = await CustomerNotificationService.respondToApproval(approvalId, approved);
        
        if (result) {
          // Set a temporary success message
          setResponseStatus({
            id: approvalId,
            status: 'success',
            message: approved 
              ? `You've approved the request`
              : `You've declined the request`
          });
          
          // Invalidate related queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['customerApprovals', user.id] });
          queryClient.invalidateQueries({ queryKey: ['customerNotifications', user.id] });
        } else {
          // Report service error with location
          const error = reportEnrollmentError(
            EnrollmentErrorCode.TRANSACTION_FAILED,
            'CustomerNotificationService.respondToApproval returned false',
            createDetailedError(
              { message: 'Service returned false' }, 
              'CustomerNotificationService.respondToApproval',
              { approvalId, approved }
            ),
            approvalId,
            user.id.toString(),
            approval.entityId
          );
          
          setResponseStatus(createErrorResponse(
            approvalId,
            error,
            'Notification service'
          ));
        }
      } catch (error) {
        // Handle error from service
        console.error('Error responding to approval:', error);
        const reportedError = reportEnrollmentError(
          EnrollmentErrorCode.SERVICE_ERROR,
          'Error calling CustomerNotificationService.respondToApproval',
          error,
          approvalId,
          user.id.toString(),
          approval.entityId
        );
        
        setResponseStatus(createErrorResponse(
          approvalId,
          reportedError,
          'CustomerNotificationService.respondToApproval'
        ));
      } finally {
        setProcessingApprovalId(null);
      }
    } catch (error) {
      console.error('Error in approval handling:', error);
      setProcessingApprovalId(null);
    }
  };

  // Clear response status after delay
  useEffect(() => {
    if (responseStatus && responseStatus.status === 'success') {
      const timer = setTimeout(() => {
        setResponseStatus(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [responseStatus]);

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <Loader className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  // Render notifications
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {showHeader && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Bell className="h-5 w-5 mr-2 text-blue-600" />
            {t('notifications')}
            {unreadNotificationCount > 0 && (
              <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                {unreadNotificationCount} new
              </span>
            )}
          </h3>
          {pendingApprovalCount > 0 && showApprovals && (
            <span className="text-sm text-blue-600">
              {pendingApprovalCount} {t('pendingApprovals')}
            </span>
          )}
        </div>
      )}
      
      {/* Response status message */}
      <AnimatePresence>
        {responseStatus && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-4 border-b ${
              responseStatus.status === 'success' 
                ? 'bg-green-50 border-green-100 text-green-800' 
                : 'bg-red-50 border-red-100 text-red-800'
            }`}
          >
            <div className="flex items-start">
              {responseStatus.status === 'success' ? (
                <Check className="h-5 w-5 mr-2 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-medium">{responseStatus.message}</p>
                
                {responseStatus.status === 'error' && (
                  <div className="mt-2">
                    <button
                      onClick={toggleErrorDetails}
                      className="text-sm flex items-center text-red-700 hover:text-red-900"
                    >
                      <Info className="h-4 w-4 mr-1" />
                      {responseStatus.showDetails ? t('hideDetails') : t('showDetails')}
                    </button>
                    
                    {responseStatus.showDetails && (
                      <div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono overflow-auto max-h-40">
                        <EnrollmentErrorDisplay
                          error={{
                            code: responseStatus.errorCode || EnrollmentErrorCode.UNKNOWN_ERROR,
                            message: responseStatus.message,
                            details: responseStatus.details || '',
                            location: responseStatus.errorLocation || ''
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setResponseStatus(null)}
                className="ml-3 flex-shrink-0 text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Notification list */}
      <div 
        className="divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto"
        style={{ maxHeight }}
      >
        {/* Show pending approvals first if available */}
        {showApprovals && approvalsData.approvals && approvalsData.approvals.length > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
              {t('pendingApprovals')}
            </h4>
            
            <div className="space-y-3">
              {approvalsData.approvals.map(approval => (
                <div
                  key={approval.id}
                  className={`p-4 rounded-lg border shadow-sm ${
                    approval.requestType === 'ENROLLMENT' 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 border-blue-200 dark:border-blue-800 animate-pulse-slow'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
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
                      <p className={`text-sm font-medium ${
                        approval.requestType === 'ENROLLMENT' 
                          ? 'text-blue-900 dark:text-blue-300' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {approval.requestType === 'ENROLLMENT'
                          ? t('programEnrollmentRequest')
                          : t('pointsDeductionRequest')}
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
                      
                      {/* Approval actions */}
                      <div className="mt-3 flex space-x-2">
                        {processingApprovalId === approval.id ? (
                          <div className="p-2 flex items-center justify-center text-gray-500">
                            <Loader className="h-5 w-5 animate-spin mr-2" />
                            <span className="text-sm">Processing...</span>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleApproval(approval.id, true)}
                              className={`px-3 py-1.5 text-sm rounded-md flex items-center transition ${
                                approval.requestType === 'ENROLLMENT'
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              {approval.requestType === 'ENROLLMENT' ? t('join') : t('approve')}
                            </button>
                            <button
                              onClick={() => handleApproval(approval.id, false)}
                              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm rounded-md flex items-center transition"
                            >
                              <ThumbsDown className="h-4 w-4 mr-1" />
                              {t('decline')}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Regular notifications */}
        {notifications.length === 0 ? (
          <div className="text-center p-6 text-gray-500 dark:text-gray-400">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('noNotifications')}</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id}
              className={`p-4 ${getNotificationBackgroundClass(notification.type, notification.isRead)}`}
              onClick={() => {
                handleMarkAsRead(notification.id);
                if (onNotificationClick) {
                  onNotificationClick(notification);
                }
              }}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className={`text-sm font-medium ${!notification.isRead ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                      {notification.title}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {notification.message}
                    {notification.type === 'REWARD_DELIVERED' && notification.data?.deliveredByName ? (
                      <span className="ml-1 text-gray-500">— Delivered by {notification.data.deliveredByName}</span>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Helper function to get the appropriate icon for notification type
function getNotificationIcon(type: string) {
  switch (type) {
    case 'ENROLLMENT':
    case 'ENROLLMENT_REQUEST':
    case 'ENROLLMENT_ACCEPTED':
    case 'ENROLLMENT_REJECTED':
      return <Award className="h-5 w-5 text-blue-600" />;
    case 'POINTS_ADDED':
      return <Check className="h-5 w-5 text-green-600" />;
    case 'POINTS_DEDUCTED':
      return <Tag className="h-5 w-5 text-orange-600" />;
    case 'PROMO_CODE':
      return <Gift className="h-5 w-5 text-purple-600" />;
    case 'PROGRAM_DELETED':
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    case 'REWARD_DELIVERED':
      return <ThumbsUp className="h-5 w-5 text-green-600" />;
    case 'CARD_CREATED':
      return <Gift className="h-5 w-5 text-green-600" />;
    case 'QR_SCANNED':
      return <Check className="h-5 w-5 text-green-600" />;
    case 'SYSTEM_ALERT':
      return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    default:
      return <Bell className="h-5 w-5 text-gray-600" />;
  }
}

// Helper function to get notification background styling based on type and read status
function getNotificationBackgroundClass(type: string, isRead: boolean): string {
  if (type === 'PROGRAM_DELETED') {
    // Red background for program deletion notifications
    return isRead ? 'bg-red-50 dark:bg-red-900/20' : 'bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500';
  }
  
  // Default styling for other notifications
  return isRead ? '' : 'bg-blue-50 dark:bg-blue-900/10';
}

export default NotificationList;

