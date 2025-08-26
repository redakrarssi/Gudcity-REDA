import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';

import { connectUserSocket, listenForUserEvents } from '../utils/socket';
import { WEBSOCKET_EVENTS } from '../utils/constants';
import { CustomerNotificationService } from '../services/customerNotificationService';
import { NotificationService } from '../services/notificationService';
import { LoyaltyProgramService } from '../services/loyaltyProgramService';
import { queryClient, queryKeys } from '../utils/queryClient';
import { deleteCustomerNotification, deleteAllNotifications } from '../services/customerNotificationDelete';
import { safeRespondToApproval } from '../services/customerNotificationServiceWrapper';

interface CustomerNotification {
  id: string;
  customerId: string;
  businessId: string;
  type: string;
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
  requestType: string;
  entityId: string;
  status: string;
  data?: Record<string, any>;
  requestedAt: string;
  responseAt?: string;
  expiresAt: string;
  businessName?: string;
}

interface BusinessNotification {
  id: string;
  customerId: string;
  customerName: string;
  businessId: string;
  programId: string;
  programName: string;
  points: number;
  reward: string;
  rewardId: string;
  timestamp: string;
  status: 'PENDING' | 'COMPLETED';
  isRead: boolean;
}

interface NotificationContextType {
  notifications: CustomerNotification[];
  approvalRequests: ApprovalRequest[];
  businessNotifications: BusinessNotification[];
  unreadCount: number;
  businessUnreadCount: number;
  showNotificationCenter: boolean;
  latestNotification: CustomerNotification | null;
  latestBusinessNotification: BusinessNotification | null;
  showPopup: boolean;
  showBusinessPopup: boolean;
  toggleNotificationCenter: () => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markBusinessAsRead: (notificationId: string) => Promise<void>;
  dismissPopup: () => void;
  dismissBusinessPopup: () => void;
  respondToApproval: (approvalId: string, approved: boolean) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  completeBusinessNotification: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [businessNotifications, setBusinessNotifications] = useState<BusinessNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [businessUnreadCount, setBusinessUnreadCount] = useState(0);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [latestNotification, setLatestNotification] = useState<CustomerNotification | null>(null);
  const [latestBusinessNotification, setLatestBusinessNotification] = useState<BusinessNotification | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showBusinessPopup, setShowBusinessPopup] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Fetch initial notifications and approval requests
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchNotifications = async () => {
      try {
        // Fetch customer notifications
        const notificationsData = await CustomerNotificationService.getCustomerNotifications(user.id.toString());
        const approvalsData = await CustomerNotificationService.getPendingApprovals(user.id.toString());
        
        setNotifications(notificationsData);
        setApprovalRequests(approvalsData);
        
        const unreadCount = notificationsData.filter(n => !n.isRead).length;
        setUnreadCount(unreadCount);
        
        // Fetch business notifications if user is business
        if (user.role === 'business') {
          console.log('🔔 Fetching business notifications for:', user.id.toString());
          const businessNotificationsResult = await NotificationService.getBusinessRedemptionNotifications(user.id.toString());
          if (businessNotificationsResult.success) {
            console.log('✅ Business notifications loaded:', businessNotificationsResult.notifications.length);
            setBusinessNotifications(businessNotificationsResult.notifications);
            const businessUnread = businessNotificationsResult.notifications.filter(n => n.status === 'PENDING').length;
            setBusinessUnreadCount(businessUnread);
          } else {
            console.error('❌ Failed to load business notifications:', businessNotificationsResult.error);
          }
        }
        
      } catch (error) {
        console.error('Error fetching notifications:', error);
        
        // Fallback to mock data if API call fails
        const mockNotifications: CustomerNotification[] = [
          {
            id: '1',
            customerId: user.id.toString(),
            businessId: '123',
            type: 'POINTS_ADDED',
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
            customerId: user.id.toString(),
            businessId: '456',
            type: 'PROMO_CODE',
            title: 'New Promo Code',
            message: 'You received a new promo code from Fitness Center',
            data: { promoCode: 'FITNESS10' },
            requiresAction: false,
            actionTaken: false,
            isRead: true,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            businessName: 'Fitness Center'
          }
        ];
        
        const mockApprovals: ApprovalRequest[] = [
          {
            id: '1',
            notificationId: '3',
            customerId: user.id.toString(),
            businessId: '789',
            requestType: 'ENROLLMENT',
            entityId: 'program-123',
            status: 'PENDING',
            data: { 
              programName: 'VIP Membership',
              benefits: ['10% off all purchases', 'Free coffee on Mondays']
            },
            requestedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
            businessName: 'Premium Cafe'
          }
        ];
        
        setNotifications(mockNotifications);
        setApprovalRequests(mockApprovals);
        setUnreadCount(mockNotifications.filter(n => !n.isRead).length);
      }
    };
    
    fetchNotifications();
    
    // Connect socket for real-time updates
    connectUserSocket(user.id.toString());
    
    // Refetch every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);
  
  // Setup real-time notifications with sockets
  useEffect(() => {
    if (!user?.id) return;

    const handleNewNotification = (notification: CustomerNotification) => {
      // Update notifications list
      setNotifications(prev => [notification, ...prev]);
      
      // Increase unread count
      setUnreadCount(prev => prev + 1);
      
      // Show popup
      setLatestNotification(notification);
      setShowPopup(true);
      
      // Auto-hide popup after 5 seconds
      setTimeout(() => {
        setShowPopup(false);
      }, 5000);
      
      // Invalidate related queries based on notification type
      if (notification.type === 'POINTS_ADDED' || notification.type === 'POINTS_DEDUCTED') {
        // Invalidate loyalty card data
        queryClient.invalidateQueries({ 
          queryKey: ['customers', user.id.toString(), 'cards']
        });
      } else if (notification.type === 'ENROLLED' || notification.type === 'ENROLLMENT_REQUEST') {
        // Invalidate loyalty programs data
        queryClient.invalidateQueries({ 
          queryKey: ['customers', user.id.toString(), 'programs']
        });
      }
    };
    
    const handleNewApproval = (approval: ApprovalRequest) => {
      // Update approval requests list
      setApprovalRequests(prev => [approval, ...prev]);
      
      // Also create a notification for this approval
      const notification: CustomerNotification = {
        id: `auto-${approval.id}`,
        customerId: approval.customerId,
        businessId: approval.businessId,
        type: approval.requestType,
        title: approval.requestType === 'ENROLLMENT' ? 'Program Enrollment Request' : 'Points Deduction Request',
        message: `${approval.businessName} requires your approval`,
        requiresAction: true,
        actionTaken: false,
        isRead: false,
        createdAt: new Date().toISOString(),
        businessName: approval.businessName,
        referenceId: approval.id
      };
      
      handleNewNotification(notification);
    };
    
    // Setup socket event listeners using our utility functions
    const notificationCleanup = listenForUserEvents(
      user.id.toString(),
      'notification',
      handleNewNotification
    );
    
    const approvalCleanup = listenForUserEvents(
      user.id.toString(),
      'approval',
      handleNewApproval
    );
    
    // Handle business redemption notifications (real-time)
    const handleBusinessNotification = (event: CustomEvent) => {
      console.log('🔔 Real-time business notification received:', event.detail);
      
      if (user.role === 'business' && event.detail.businessId === user.id.toString()) {
        const businessNotif = {
          id: event.detail.notificationId || Date.now().toString(),
          customerId: event.detail.customerId,
          customerName: event.detail.customerName || 'Customer',
          businessId: event.detail.businessId,
          programId: event.detail.programId,
          programName: event.detail.programName || 'Loyalty Program',
          points: event.detail.points || 0,
          reward: event.detail.reward,
          rewardId: event.detail.rewardId,
          timestamp: event.detail.timestamp || new Date().toISOString(),
          status: 'PENDING',
          isRead: false
        };
        
        // Add to business notifications
        setBusinessNotifications(prev => [businessNotif, ...prev]);
        setBusinessUnreadCount(prev => prev + 1);
        
        // Show business popup
        setLatestBusinessNotification(businessNotif);
        setShowBusinessPopup(true);
        
        console.log('✅ Business notification added to state:', businessNotif);
      }
    };
    
    // Listen for custom redemption events
    window.addEventListener('redemption-notification', handleBusinessNotification as EventListener);
    
    return () => {
      notificationCleanup();
      approvalCleanup();
      window.removeEventListener('redemption-notification', handleBusinessNotification as EventListener);
    };
  }, [user?.id, queryClient]);

  const toggleNotificationCenter = () => {
    setShowNotificationCenter(prev => !prev);
    
    // When opening notification center, mark all as seen (not read yet)
    if (!showNotificationCenter) {
      // We might want to update the UI to show some indication that notifications were seen
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      
      // Decrease unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Call API to mark as read
      await CustomerNotificationService.markAsRead(notificationId);
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const dismissPopup = () => {
    setShowPopup(false);
  };

  const respondToApproval = async (approvalId: string, approved: boolean): Promise<void> => {
    // Prevent duplicate processing of the same request
    if (processingRequestId === approvalId) {
      console.log('Request already being processed:', approvalId);
      return;
    }
    
    // Mark this request as being processed
    setProcessingRequestId(approvalId);
    
    // Reference to cleanup timeouts
    const timeouts: number[] = [];
    
    try {
      // Show loading state in UI
      const loadingNotificationId = `loading-${approvalId}`;
      setNotifications(prev => [
        {
          id: loadingNotificationId,
          customerId: user?.id?.toString() || '',
          businessId: '',
          type: 'SYSTEM',
          title: 'Processing your request...',
          message: `Please wait while we ${approved ? 'enroll you in' : 'decline'} the program.`,
          requiresAction: false,
          actionTaken: false,
          isRead: true,
          createdAt: new Date().toISOString(),
        },
        ...prev
      ]);

      // Find the approval request for program info before updating state
      const approvalRequest = approvalRequests.find(a => a.id === approvalId);
      const programName = approvalRequest?.data?.programName || 'the program';

      // Update local state first for a snappy UI response but DON'T remove the request yet
      // Instead, just update its status to prevent duplicate processing
      setApprovalRequests(prev => 
        prev.map(a => a.id === approvalId ? { ...a, status: approved ? 'PROCESSING' : 'PROCESSING' } : a)
      );
      
      // Mark any related notifications as actioned
      const relatedNotification = notifications.find(n => n.referenceId === approvalId);
      if (relatedNotification) {
        await markAsRead(relatedNotification.id);
        
        // Update local state for action taken
        setNotifications(prev => 
          prev.map(n => n.referenceId === approvalId ? { ...n, actionTaken: true } : n)
        );
      }
      
      // Call server API to process approval; server uses safe wrapper and stored proc
      const apiResponse = await fetch(`/api/notifications/approval-requests/${approvalId}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approved })
      });

      let response: any = null;
      try {
        // Only attempt to parse JSON if Content-Type hints JSON
        const contentType = apiResponse.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          response = await apiResponse.json();
        } else {
          // Fallback: attempt to read text and parse, otherwise synthesize an error response
          const text = await apiResponse.text();
          try {
            response = text ? JSON.parse(text) : null;
          } catch (_) {
            response = null;
          }
        }
      } catch (parseErr) {
        console.warn('JSON parse failed for approval response, synthesizing error payload', parseErr);
        response = null;
      }

      if (!response) {
        // Synthesize a normalized payload to avoid UI crashes
        response = {
          success: apiResponse.ok,
          cardId: undefined,
          errorCode: apiResponse.ok ? undefined : 'NETWORK_ERROR',
          message: apiResponse.ok ? undefined : 'Empty or malformed server response'
        };
      }
      
      // Remove loading notification
      setNotifications(prev => prev.filter(n => n.id !== loadingNotificationId));
      
      const success = response.success;
      const cardId = response.cardId as (string | undefined);
      
      // If there was an error, show it as a notification and throw it to be caught by the UI
      if (!success && response.message) {
        const errorNotificationId = `error-${approvalId}-${Date.now()}`;
        setNotifications(prev => [
          {
            id: errorNotificationId,
            customerId: user?.id?.toString() || '',
            businessId: '',
            type: 'ERROR',
            title: 'Error Processing Request',
            message: response.message || 'An error occurred while processing your request.',
            data: {
              errorCode: response.errorCode,
              errorLocation: response.errorLocation
            },
            requiresAction: false,
            actionTaken: false,
            isRead: false,
            createdAt: new Date().toISOString(),
          },
          ...prev
        ]);
        
        // Increase unread count for the error notification
        setUnreadCount(prev => prev + 1);
        
        // Throw the error to be caught by the UI component
        const error = new Error(response.message);
        (error as any).code = response.errorCode;
        (error as any).location = response.errorLocation;
        throw error;
      }
      
      if (success) {
        // Add a success notification
        const successNotificationId = `success-${approvalId}-${Date.now()}`;
        setNotifications(prev => [
          {
            id: successNotificationId,
            customerId: user?.id?.toString() || '',
            businessId: '',
            type: 'SUCCESS',
            title: approved ? 'Enrollment Successful' : 'Enrollment Declined',
            message: approved ? 
              `You have been successfully enrolled in ${programName}. Your card is being prepared.` :
              `You have declined enrollment in ${programName}.`,
            requiresAction: false,
            actionTaken: false,
            isRead: false,
            createdAt: new Date().toISOString(),
          },
          ...prev
        ]);
        setUnreadCount(prev => prev + 1);

        // If successful, invalidate relevant queries to refresh the UI
        const approval = approvalRequests.find(a => a.id === approvalId);
        
        if (approval?.requestType === 'ENROLLMENT') {
          // Invalidate all relevant queries to show updated data
          queryClient.invalidateQueries({ queryKey: ['customers', user!.id.toString(), 'programs'] });
          queryClient.invalidateQueries({ queryKey: ['customers', user!.id.toString(), 'cards'] });
          queryClient.invalidateQueries({ queryKey: ['loyaltyCards'] });
          queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user!.id.toString()] });
          queryClient.invalidateQueries({ queryKey: ['customerApprovals', user!.id.toString()] });
          queryClient.invalidateQueries({ queryKey: ['customerNotifications', user!.id.toString()] });
          
          // If a card was created return to /cards or refresh cards
          if (cardId) {
            queryClient.invalidateQueries({ queryKey: ['customers', user!.id.toString(), 'cards'] });
            queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user!.id.toString()] });
          }

          // Short delay before removing the request to ensure sync between UI and backend
          const timeout1 = window.setTimeout(() => {
            // Remove the approval request from the list after successful processing
            setApprovalRequests(prev => prev.filter(a => a.id !== approvalId));
            
            // Additional invalidation after a delay to ensure data is updated
            queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user!.id.toString()] });
            queryClient.invalidateQueries({ queryKey: ['customers', user!.id.toString(), 'cards'] });
            queryClient.invalidateQueries({ queryKey: ['customerApprovals', user!.id.toString()] });
          }, 500);
          timeouts.push(timeout1);
          
          // Schedule additional refreshes to ensure data is fully updated
          const timeout2 = window.setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user!.id.toString()] });
            queryClient.invalidateQueries({ queryKey: ['customers', user!.id.toString(), 'cards'] });
          }, 2000);
          timeouts.push(timeout2);
        } else if (approval?.requestType === 'POINTS_DEDUCTION') {
          // Invalidate loyalty cards to show updated points
          queryClient.invalidateQueries({ queryKey: ['customers', user!.id.toString(), 'cards'] });
          queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user!.id.toString()] });
          
          // Remove the approval request from the list after successful processing
          setApprovalRequests(prev => prev.filter(a => a.id !== approvalId));
        }
      }
    } catch (error) {
      console.error('Error responding to approval:', error);
      
      // Show error notification
      const errorNotificationId = `error-${approvalId}-${Date.now()}`;
      setNotifications(prev => [
        {
          id: errorNotificationId,
          customerId: user?.id?.toString() || '',
          businessId: '',
          type: 'ERROR',
          title: 'Unexpected Error',
          message: 'An unexpected error occurred while processing your request. Please try again.',
          requiresAction: false,
          actionTaken: false,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        ...prev
      ]);
      
      // Increase unread count for the error notification
      setUnreadCount(prev => prev + 1);
      
      // Re-throw the error to be caught by the UI component
      throw error;
    } finally {
      // Reset processing flag
      setProcessingRequestId(null);
      
      // Clear any pending timeouts to prevent memory leaks if component unmounts
      timeouts.forEach(window.clearTimeout);
    }
  };

  const deleteNotification = async (notificationId: string): Promise<void> => {
    try {
      // Persist deletion in database (soft delete)
      await deleteCustomerNotification(notificationId, user?.id?.toString());
      // Update local state
      setNotifications(prev => {
        const toDelete = prev.find(n => n.id === notificationId);
        if (toDelete && !toDelete.isRead) {
          setUnreadCount(prevCount => Math.max(0, prevCount - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAllNotifications = async (): Promise<void> => {
    if (!user?.id) return;
    
    try {
      // Delete all notifications from database
      await deleteAllNotifications(user.id.toString());
      
      // Update local state
      const previousUnreadCount = unreadCount;
      setNotifications([]);
      setUnreadCount(0);
      
      // Invalidate queries
      queryClient.invalidateQueries({ 
        queryKey: ['customerNotifications', user.id.toString()]
      });
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const markBusinessAsRead = async (notificationId: string): Promise<void> => {
    try {
      await NotificationService.markBusinessNotificationAsRead(notificationId);
      setBusinessNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setBusinessUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking business notification as read:', error);
    }
  };

  const dismissBusinessPopup = (): void => {
    setShowBusinessPopup(false);
    setLatestBusinessNotification(null);
  };

  const completeBusinessNotification = async (notificationId: string): Promise<void> => {
    try {
      console.log('🔔 Completing business notification:', notificationId);
      const result = await NotificationService.completeRedemptionNotification(notificationId);
      if (result.success) {
        setBusinessNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, status: 'COMPLETED' } : n)
        );
        setBusinessUnreadCount(prev => Math.max(0, prev - 1));
        console.log('✅ Business notification completed successfully');
      } else {
        console.error('❌ Failed to complete business notification:', result.error);
      }
    } catch (error) {
      console.error('Error completing business notification:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      approvalRequests,
      businessNotifications,
      unreadCount,
      businessUnreadCount,
      showNotificationCenter,
      latestNotification,
      latestBusinessNotification,
      showPopup,
      showBusinessPopup,
      toggleNotificationCenter,
      markAsRead,
      markBusinessAsRead,
      dismissPopup,
      dismissBusinessPopup,
      respondToApproval,
      deleteNotification,
      deleteAllNotifications: clearAllNotifications,
      completeBusinessNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to access the notification context
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 
