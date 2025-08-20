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

  // Fetch pending approvals
  const { data: approvalsData = { approvals: [], count: 0 }, isLoading: approvalsLoading } = useQuery({
    queryKey: ['customerApprovals', user?.id],
    queryFn: async () => {
      if (!user?.id) return { approvals: [], count: 0 };
      
      console.log('🔄 Fetching pending approvals for customer', { customerId: user.id });
      try {
        const approvals = await CustomerNotificationService.getPendingApprovals(user.id.toString());
        const enrollmentCount = approvals.filter(a => a.requestType === 'ENROLLMENT').length;
        console.log('✅ Fetched pending approvals', { 
          total: approvals.length, 
          enrollmentCount,
          customerId: user.id 
        });
        return { approvals, count: approvals.length };
      } catch (error) {
        console.error('❌ Failed to fetch pending approvals:', error);
        return { approvals: [], count: 0 };
      }
    },
    enabled: !!user?.id,
    refetchInterval: 15000, // Check for new approvals every 15 seconds
  });

  // Fetch notifications
  const { data: notificationsData = { notifications: [], count: 0 }, isLoading: notificationsLoading } = useQuery({
    queryKey: ['customerNotifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return { notifications: [], count: 0 };
      
      console.log('🔄 Fetching notifications for customer', { customerId: user.id });
      try {
        const notifications = await CustomerNotificationService.getNotifications(user.id.toString());
        const unreadCount = notifications.filter(n => !n.isRead).length;
        console.log('✅ Fetched notifications', { 
          total: notifications.length, 
          unreadCount,
          customerId: user.id 
        });
        return { notifications, count: notifications.length };
      } catch (error) {
        console.error('❌ Failed to fetch notifications:', error);
        return { notifications: [], count: 0 };
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Check for new notifications every 30 seconds
  });
  
  const isLoading = approvalsLoading || notificationsLoading;
  const notificationsDataLoaded = notificationsData || { notifications: [] };
  const approvalsDataLoaded = approvalsData || { approvals: [] };
  
  const unreadNotificationCount = notificationsDataLoaded.notifications.filter(
    (n: CustomerNotification) => !n.isRead
  ).length;
  
  const pendingApprovalCount = approvalsDataLoaded.approvals?.filter(
    (a: ApprovalRequest) => a.status === 'PENDING'
  ).length || 0;
  
  const notifications = notificationsDataLoaded.notifications || [];
  
  // Function to handle marking notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    console.log('📖 Marking notification as read', { notificationId });
    try {
      await CustomerNotificationService.markAsRead(notificationId);
      console.log('✅ Notification marked as read successfully');
      
      // Invalidate the notifications query to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['customerNotifications', user.id] });
      console.log('🔄 Invalidated notifications query for UI refresh');
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }
  };
  
  // Toggle error details visibility
  const toggleErrorDetails = () => {
    console.log('🔍 Toggling error details visibility');
    setResponseStatus(prev => prev ? {
      ...prev,
      showDetails: !prev.showDetails
    } : null);
  };

  // Handle approval response
  const handleApproval = async (approvalId: string, approved: boolean) => {
    if (!user?.id) {
      console.error('❌ User not authenticated');
      return;
    }
    
    console.log('🚀 Starting enrollment approval process', { approvalId, approved });
    
    try {
      // Get the approval request details
      const approval = approvalsDataLoaded.approvals?.find(a => a.id === approvalId);
      if (!approval) {
        console.error('❌ Approval request not found', { approvalId });
        reportEnrollmentError(
          EnrollmentErrorCode.REQUEST_NOT_FOUND,
          'Approval request not found',
          createDetailedError(
            { message: 'Approval request not found' }, 
            'NotificationList.handleApproval - Request lookup'
          ),
          approvalId,
          user.id.toString(),
          approval?.entityId || 'unknown'
        );
        return;
      }
      
      console.log('📋 Found approval request', { 
        approvalId, 
        requestType: approval.requestType, 
        businessName: approval.businessName,
        programName: approval.data?.programName 
      });
      
      // Set processing state to show loading
      setProcessingApprovalId(approvalId);
      console.log('⏳ Set processing state for approval', { approvalId });
      
      // If this is an enrollment request, handle it through the wrapper service
      if (approval.requestType === ApprovalRequestType.ENROLLMENT) {
        console.log('🎯 Processing ENROLLMENT request type');
        try {
          // Import the wrapper service with safer response handling
          const { safeRespondToApproval } = await import('../../services/customerNotificationServiceWrapper');
          console.log('📦 Imported safeRespondToApproval wrapper service');
          
          // Call the wrapper service to handle the enrollment 
          console.log('📡 Calling safeRespondToApproval API...');
          const result = await safeRespondToApproval(approvalId, approved);
          console.log('✅ API call completed', { success: result.success, message: result.message });
          
          // If success, show the appropriate message and refresh data
          if (result.success) {
            console.log('🎉 Enrollment processed successfully');
            
            // Create response status based on approval or decline
            const successMessage = result.message || (approved 
              ? `You've joined ${approval.data?.programName || 'the program'}`
              : `You declined to join ${approval.data?.programName || 'the program'}`);
            
            setResponseStatus({
              id: approvalId,
              status: 'success',
              message: successMessage
            });
            
            console.log('📝 Set success response status', { message: successMessage });
            
            // Invalidate ALL related queries to ensure UI updates properly
            console.log('🔄 Invalidating related queries for UI refresh...');
            queryClient.invalidateQueries({ queryKey: ['customerApprovals', user.id] });
            queryClient.invalidateQueries({ queryKey: ['customerNotifications', user.id] });
            
            // Always invalidate these queries when enrollment is approved
            if (approved) {
              console.log('🎯 Enrollment approved - invalidating additional queries...');
              
              // Invalidate enrolled programs query to refresh the programs list
              queryClient.invalidateQueries({ queryKey: ['customers', 'programs', user.id.toString()] });
              
              // Invalidate loyalty cards query
              queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
              queryClient.invalidateQueries({ queryKey: ['loyaltyCards'] });
              
              // Force refresh after a short delay to ensure DB operations complete
              console.log('⏰ Scheduling delayed query refresh...');
              setTimeout(() => {
                console.log('🔄 Executing delayed query refresh...');
                queryClient.invalidateQueries({ queryKey: ['customers', 'programs', user.id.toString()] });
                queryClient.invalidateQueries({ queryKey: ['loyaltyCards'] });
              }, 500);
            }
            
            console.log('✅ Query invalidation completed');
          } else {
            console.error('❌ Enrollment processing failed', { 
              errorCode: result.errorCode, 
              error: result.error,
              details: result.details 
            });
            
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
          console.log('✅ Cleared processing state');
        } catch (error) {
          console.error('💥 Error handling enrollment approval:', error);
          
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
      console.log('🎯 Processing non-enrollment request type', { requestType: approval.requestType });
      try {
        console.log('📡 Calling CustomerNotificationService.respondToApproval...');
        const result = await CustomerNotificationService.respondToApproval(approvalId, approved);
        console.log('✅ Non-enrollment API call completed', { success: result });
        
        if (result) {
          console.log('🎉 Non-enrollment request processed successfully');
          
          // Set a temporary success message
          const successMessage = approved 
            ? `You've approved the request`
            : `You've declined the request`;
          
          setResponseStatus({
            id: approvalId,
            status: 'success',
            message: successMessage
          });
          
          console.log('📝 Set success response status for non-enrollment', { message: successMessage });
          
          // Invalidate related queries to refresh data
          console.log('🔄 Invalidating queries for non-enrollment request...');
          queryClient.invalidateQueries({ queryKey: ['customerApprovals', user.id] });
          queryClient.invalidateQueries({ queryKey: ['customerNotifications', user.id] });
          console.log('✅ Query invalidation completed for non-enrollment');
        } else {
          console.error('❌ Non-enrollment request processing failed - service returned false');
          
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
        console.error('💥 Error calling CustomerNotificationService.respondToApproval:', error);
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
        console.log('✅ Cleared processing state for non-enrollment request');
      }
    } catch (error) {
      console.error('💥 Unexpected error in approval handling:', error);
      setProcessingApprovalId(null);
      console.log('✅ Cleared processing state due to unexpected error');
    }
  };

  // Clear response status after delay
  useEffect(() => {
    if (responseStatus && responseStatus.status === 'success') {
      const timer = setTimeout(() => {
        console.log('🔄 Auto-hiding success notification after 30 seconds');
        setResponseStatus(null);
      }, 30000); // Changed from 5000 to 30000 (30 seconds)
      return () => clearTimeout(timer);
    }
  }, [responseStatus]);

  // Component mount/unmount logging
  useEffect(() => {
    console.log('🚀 NotificationList component mounted', { 
      customerId: user?.id,
      showHeader,
      showApprovals,
      maxHeight 
    });
    
    return () => {
      console.log('🔚 NotificationList component unmounting');
    };
  }, [user?.id, showHeader, showApprovals, maxHeight]);

  // Log when data changes
  useEffect(() => {
    if (approvalsData.approvals && approvalsData.approvals.length > 0) {
      console.log('📊 Approval data updated', { 
        approvalCount: approvalsData.approvals.length,
        enrollmentCount: approvalsData.approvals.filter(a => a.requestType === 'ENROLLMENT').length
      });
    }
  }, [approvalsData.approvals]);

  useEffect(() => {
    if (notificationsData.notifications && notificationsData.notifications.length > 0) {
      console.log('📊 Notification data updated', { 
        notificationCount: notificationsData.notifications.length,
        unreadCount: notificationsData.notifications.filter(n => !n.isRead).length
      });
    }
  }, [notificationsData.notifications]);

  if (isLoading) {
    console.log('⏳ NotificationList is loading data...');
    return (
      <div className="p-4 flex justify-center">
        <Loader className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  // Render notifications
  console.log('🎨 Rendering NotificationList', { 
    approvalCount: approvalsData.approvals?.length || 0,
    notificationCount: notifications.length,
    showHeader,
    showApprovals,
    hasResponseStatus: !!responseStatus
  });
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {showHeader && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          {console.log('📋 Displaying notification header', { 
            unreadCount: unreadNotificationCount,
            pendingCount: pendingApprovalCount 
          })}
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
            {console.log('📢 Displaying response status', { 
              status: responseStatus.status, 
              message: responseStatus.message,
              id: responseStatus.id 
            })}
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
                      {responseStatus.showDetails ? 'Hide details' : 'Show details'}
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
                onClick={() => {
                  console.log('❌ Closing response status notification');
                  setResponseStatus(null);
                }}
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
            {console.log('📋 Displaying pending approvals', { count: approvalsData.approvals.length })}
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
              {t('pendingApprovals')}
            </h4>
            
            <div className="space-y-3">
              {approvalsData.approvals.map(approval => {
                console.log('📋 Rendering approval request', { 
                  id: approval.id, 
                  requestType: approval.requestType,
                  businessName: approval.businessName,
                  programName: approval.data?.programName 
                });
                
                return (
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
                        
                        {/* Approval actions */}
                        <div className="mt-3 flex space-x-2">
                          {processingApprovalId === approval.id ? (
                            <div className="p-2 flex items-center justify-center text-gray-500">
                              {console.log('⏳ Showing processing state for approval', { approvalId: approval.id })}
                              <Loader className="h-5 w-5 animate-spin mr-2" />
                              <span className="text-sm">Processing...</span>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  console.log('👍 Accept button clicked for enrollment', { 
                                    approvalId: approval.id, 
                                    programName: approval.data?.programName,
                                    businessName: approval.businessName 
                                  });
                                  handleApproval(approval.id, true);
                                }}
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
                                onClick={() => {
                                  console.log('👎 Decline button clicked for enrollment', { 
                                    approvalId: approval.id, 
                                    programName: approval.data?.programName,
                                    businessName: approval.businessName 
                                  });
                                  handleApproval(approval.id, false);
                                }}
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
                );
              })}
            </div>
          </div>
        )}
        
        {/* Regular notifications */}
        {notifications.length === 0 ? (
          <div className="text-center p-6 text-gray-500 dark:text-gray-400">
            {console.log('📭 No notifications to display')}
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('noNotifications')}</p>
          </div>
        ) : (
          notifications.map(notification => {
            console.log('📱 Rendering notification', { 
              id: notification.id, 
              type: notification.type,
              isRead: notification.isRead,
              title: notification.title 
            });
            
            return (
              <div 
                key={notification.id}
                className={`p-4 ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                onClick={() => {
                  console.log('📱 Notification clicked', { 
                    notificationId: notification.id, 
                    type: notification.type,
                    title: notification.title 
                  });
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
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Helper function to get the appropriate icon for notification type
function getNotificationIcon(type: string) {
  console.log('🎨 Getting notification icon for type', { type });
  
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
    case 'CARD_CREATED':
      return <Gift className="h-5 w-5 text-green-600" />;
    case 'QR_SCANNED':
      return <Check className="h-5 w-5 text-green-600" />;
    case 'SYSTEM_ALERT':
      return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    default:
      console.log('⚠️ Unknown notification type, using default icon', { type });
      return <Bell className="h-5 w-5 text-gray-600" />;
  }
}

export default NotificationList;

