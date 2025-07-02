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
  HelpCircle
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
  notificationId?: string;
  customerId: string;
  businessId: string;
  requestType: ApprovalRequestType;
  entityId: string;
  status: string;
  data?: Record<string, any>;
  requestedAt: string;
  responseAt?: string;
  expiresAt?: string;
  businessName?: string;
}

interface NotificationListProps {
  showApprovalRequests?: boolean;
}

// Enhanced response status interface with more detailed error information
interface ResponseStatus {
  id: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  errorCode?: string;
  errorLocation?: string;
  details?: string;
  showDetails?: boolean;
}

const NotificationList: React.FC<NotificationListProps> = ({ showApprovalRequests = true }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  const [processingApprovalId, setProcessingApprovalId] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<ResponseStatus | null>(null);
  
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
  
  // Clear response status after showing it briefly
  useEffect(() => {
    if (responseStatus) {
      const timer = setTimeout(() => {
        setResponseStatus(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [responseStatus]);

  // Function to create detailed error response
  const createErrorResponse = (
    id: string, 
    error: any, 
    location: string, 
    fallbackMessage: string = 'An error occurred'
  ): ResponseStatus => {
    // If it's an enrollment error from our reporter
    if (error && error.code) {
      return {
        id,
        status: 'error',
        message: formatEnrollmentErrorForUser(error),
        errorCode: error.code,
        errorLocation: location,
        details: JSON.stringify(error.details, null, 2),
        showDetails: false
      };
    }
    
    // For other errors
    const errorMessage = error?.message || fallbackMessage;
    return {
      id,
      status: 'error',
      message: errorMessage,
      errorLocation: location,
      details: error ? JSON.stringify(error, null, 2) : undefined,
      showDetails: false
    };
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
      
      // For enrollment requests, attempt the direct service first, then fall back to the safe wrapper
      if (approval.requestType === ApprovalRequestType.ENROLLMENT) {
        try {
          const directResult = await CustomerNotificationService.respondToApproval(approvalId, approved);
          if (directResult) {
            setResponseStatus({
              id: approvalId,
              status: 'success',
              message: approved
                ? `You've joined ${approval.data?.programName || 'the program'}`
                : `You declined to join ${approval.data?.programName || 'the program'}`
            });
            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['customerApprovals', user.id] });
            queryClient.invalidateQueries({ queryKey: ['customerNotifications', user.id] });
            if (approved) {
              queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
            }
            setProcessingApprovalId(null);
            return;
          }
        } catch (directError) {
          console.warn('Direct enrollment approval failed, falling back', directError);
        }

        // Fallback to wrapper with enhanced handling
        try {
          const { safeRespondToApproval } = await import('../../services/customerNotificationServiceWrapper');
          const result = await safeRespondToApproval(approvalId, approved);

          if (result.success) {
            setResponseStatus({
              id: approvalId,
              status: 'success',
              message: result.message || (approved
                ? `You've joined ${approval.data?.programName || 'the program'}`
                : `You declined to join ${approval.data?.programName || 'the program'}`)
            });
            queryClient.invalidateQueries({ queryKey: ['customerApprovals', user.id] });
            queryClient.invalidateQueries({ queryKey: ['customerNotifications', user.id] });
            if (approved && result.cardId) {
              queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
            }
          } else {
            // As a fallback, check if enrollment actually exists—may have been processed by another handler
            try {
              const { LoyaltyProgramService } = await import('../../services/loyaltyProgramService');
              const enrollmentCheck = await LoyaltyProgramService.checkEnrollment(user.id.toString(), approval.entityId);
              if (enrollmentCheck?.isEnrolled) {
                setResponseStatus({
                  id: approvalId,
                  status: 'success',
                  message: `You're already enrolled in ${approval.data?.programName || 'the program'}`
                });
                // Invalidate caches because enrollment exists
                queryClient.invalidateQueries({ queryKey: ['customerApprovals', user.id] });
                queryClient.invalidateQueries({ queryKey: ['customerNotifications', user.id] });
                queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
              } else {
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
            } catch (verifyError) {
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
          }
        } catch (error) {
          console.error('Error handling enrollment approval (fallback):', error);
          const reportedError = reportEnrollmentError(
            EnrollmentErrorCode.UNKNOWN_ERROR,
            'Unhandled error in enrollment approval fallback',
            createDetailedError(error, 'NotificationList.handleApproval - fallback', { approvalId, approved }),
            approvalId,
            user.id.toString(),
            approval.entityId
          );
          setResponseStatus(createErrorResponse(approvalId, reportedError, 'Enrollment approval fallback'));
        } finally {
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
        console.error('Error in CustomerNotificationService.respondToApproval:', error);
        
        // Report service error with location
        const reportedError = reportEnrollmentError(
          EnrollmentErrorCode.TRANSACTION_FAILED,
          'Exception thrown by CustomerNotificationService.respondToApproval',
          createDetailedError(
            error, 
            'CustomerNotificationService.respondToApproval - Exception',
            { approvalId, approved }
          ),
          approvalId,
          user.id.toString(),
          approval.entityId
        );
        
        setResponseStatus(createErrorResponse(
          approvalId,
          reportedError,
          'Notification service exception'
        ));
      }
    } catch (error) {
      console.error('Error handling approval response:', error);
      
      // Report unknown error with location
      const reportedError = reportEnrollmentError(
        EnrollmentErrorCode.UNKNOWN_ERROR,
        'Unhandled error in handleApproval',
        createDetailedError(
          error, 
          'NotificationList.handleApproval - Outer try/catch',
          { 
            approvalId, 
            customerId: user?.id?.toString(),
            entityId: approvalsData?.approvals?.find(a => a.id === approvalId)?.entityId
          }
        ),
        approvalId,
        user?.id?.toString(),
        approvalsData?.approvals?.find(a => a.id === approvalId)?.entityId
      );
      
      setResponseStatus(createErrorResponse(
        approvalId,
        reportedError,
        'Approval handling process'
      ));
    } finally {
      setProcessingApprovalId(null);
    }
  };
  
  // Get icon for notification
  const getNotificationIcon = (type: CustomerNotificationType | ApprovalRequestType | string) => {
    switch (type) {
      case CustomerNotificationType.POINTS_ADDED:
        return <Gift className="h-5 w-5 text-green-500" />;
      case CustomerNotificationType.POINTS_DEDUCTED:
        return <Gift className="h-5 w-5 text-orange-500" />;
      case CustomerNotificationType.ENROLLMENT:
        return <Award className="h-5 w-5 text-blue-500" />;
      case CustomerNotificationType.ENROLLMENT_REQUEST:
        return <Award className="h-5 w-5 text-blue-700" />;
      case CustomerNotificationType.PROMO_CODE:
        return <Tag className="h-5 w-5 text-purple-500" />;
      case CustomerNotificationType.QR_SCANNED:
        return <Bell className="h-5 w-5 text-blue-600" />;
      case ApprovalRequestType.POINTS_DEDUCTION:
        return <Gift className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Format relative time (e.g. "2 hours ago")
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
      return `${diffMin} min ago`;
    } else if (diffHour < 24) {
      return `${diffHour}h ago`;
    } else if (diffDay < 30) {
      return `${diffDay}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // If loading show a loading indicator
  if (notificationsLoading && approvalsLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading notifications...</span>
      </div>
    );
  }
  
  // If error show error message
  if (notificationsError || approvalsError) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md flex items-start">
        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
        <span>Failed to load notifications. Please try again later.</span>
      </div>
    );
  }
  
  // Get data from queries
  const notifications = notificationsData?.notifications || [];
  const approvals = approvalsData?.approvals || [];
  
  // If empty show a message
  if (notifications.length === 0 && approvals.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 border border-gray-200 rounded-md bg-gray-50">
        <Bell className="h-6 w-6 mx-auto mb-2 text-gray-400" />
        <p>No notifications yet</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3 mt-4">
      {/* Approvals Section */}
      {showApprovalRequests && approvals.length > 0 && (
        <div className="border border-blue-100 bg-blue-50 rounded-md overflow-hidden">
          <div className="bg-blue-100 p-2 flex items-center">
            <Info className="h-4 w-4 text-blue-700 mr-2" />
            <span className="text-sm font-medium text-blue-800">Actions Required</span>
          </div>
          
          <div className="divide-y divide-blue-100">
            {approvals.map(approval => (
              <div
                key={approval.id}
                className="p-3 hover:bg-blue-100/50 transition-colors"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(approval.requestType)}
                  </div>
                  
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-gray-900">
                      {approval.requestType === ApprovalRequestType.ENROLLMENT
                        ? `${approval.businessName} invites you to join ${approval.data?.programName || 'their program'}`
                        : `${approval.businessName} requests to deduct points`}
                    </p>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {approval.requestType === ApprovalRequestType.ENROLLMENT
                        ? `Join ${approval.businessName}'s loyalty program to earn rewards and benefits`
                        : `${approval.businessName} wants to deduct ${approval.data?.points || ''} points from your account`}
                    </p>
                    
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-gray-500 mr-2">
                        {formatRelativeTime(approval.requestedAt)}
                      </span>
                      
                      {/* Expires indication if it's going to expire soon */}
                      {approval.expiresAt && new Date(approval.expiresAt).getTime() - Date.now() < 86400000 * 2 && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                          Expires soon
                        </span>
                      )}
                    </div>
                    
                    {/* Show response status message */}
                    {responseStatus && responseStatus.id === approval.id && (
                      <EnrollmentErrorDisplay
                        id={responseStatus.id}
                        status={responseStatus.status}
                        message={responseStatus.message}
                        errorCode={responseStatus.errorCode}
                        errorLocation={responseStatus.errorLocation}
                        details={responseStatus.details}
                        onRetry={responseStatus.status === 'error' ? () => handleApproval(approval.id, true) : undefined}
                        onDismiss={() => setResponseStatus(null)}
                      />
                    )}
                    
                    {/* Action buttons */}
                    {!responseStatus || responseStatus.id !== approval.id ? (
                      <div className="flex space-x-2 mt-3">
                        {/* Decline button */}
                        <button
                          onClick={() => handleApproval(approval.id, false)}
                          disabled={processingApprovalId === approval.id}
                          className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 text-sm hover:bg-gray-100 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingApprovalId === approval.id ? (
                            <>
                              <Loader className="h-3 w-3 mr-1 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Decline
                            </>
                          )}
                        </button>
                        
                        {/* Accept button */}
                        <button
                          onClick={() => handleApproval(approval.id, true)}
                          disabled={processingApprovalId === approval.id}
                          className="px-3 py-1 bg-blue-600 rounded-md text-white text-sm hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingApprovalId === approval.id ? (
                            <>
                              <Loader className="h-3 w-3 mr-1 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Accept
                            </>
                          )}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Regular Notifications */}
      <div className="divide-y divide-gray-100">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-3 hover:bg-gray-50 transition-colors rounded-md ${
              notification.isRead ? 'opacity-80' : 'bg-gray-50 border-l-2 border-blue-500'
            }`}
            onClick={() => {
              if (!notification.isRead) {
                CustomerNotificationService.markAsRead(notification.id);
                queryClient.invalidateQueries({ queryKey: ['customerNotifications'] });
              }
              setActiveNotification(activeNotification === notification.id ? null : notification.id);
            }}
          >
            <div className="flex">
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notification.type as CustomerNotificationType)}
              </div>
              
              <div className="ml-3 flex-1">
                <div className="flex justify-between items-start">
                  <p className={`font-medium ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                    {notification.title}
                  </p>
                  
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                    
                    {!notification.isRead && (
                      <span className="ml-2 h-2 w-2 rounded-full bg-blue-600"></span>
                    )}
                  </div>
                </div>
                
                <p className={`text-sm mt-1 ${notification.isRead ? 'text-gray-500' : 'text-gray-600'}`}>
                  {notification.message}
                </p>
                
                {notification.businessName && (
                  <p className="text-xs text-gray-500 mt-1">
                    From: {notification.businessName}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationList;

