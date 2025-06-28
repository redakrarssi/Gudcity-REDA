import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';

import { connectUserSocket, listenForUserEvents } from '../utils/socket';
import { WEBSOCKET_EVENTS } from '../utils/constants';
import { CustomerNotificationService } from '../services/customerNotificationService';
import { LoyaltyProgramService } from '../services/loyaltyProgramService';
import { queryClient, queryKeys } from '../utils/queryClient';

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

interface NotificationContextType {
  notifications: CustomerNotification[];
  approvalRequests: ApprovalRequest[];
  unreadCount: number;
  showNotificationCenter: boolean;
  latestNotification: CustomerNotification | null;
  showPopup: boolean;
  toggleNotificationCenter: () => void;
  markAsRead: (notificationId: string) => Promise<void>;
  dismissPopup: () => void;
  respondToApproval: (approvalId: string, approved: boolean) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [latestNotification, setLatestNotification] = useState<CustomerNotification | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  // Fetch initial notifications and approval requests
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchNotifications = async () => {
      try {
        // In production environment, fetch from API
        const notificationsData = await CustomerNotificationService.getCustomerNotifications(user.id.toString());
        const approvalsData = await CustomerNotificationService.getPendingApprovals(user.id.toString());
        
        setNotifications(notificationsData);
        setApprovalRequests(approvalsData);
        
        const unreadCount = notificationsData.filter(n => !n.isRead).length;
        setUnreadCount(unreadCount);
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
    
    return () => {
      notificationCleanup();
      approvalCleanup();
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
    try {
      // Update local state first for a snappy UI response
      setApprovalRequests(prev => 
        prev.map(a => a.id === approvalId ? { ...a, status: approved ? 'APPROVED' : 'REJECTED' } : a)
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
      
      // Call API to update the approval status - this will handle enrollment logic
      const success = await CustomerNotificationService.respondToApproval(approvalId, approved);
      
      if (success) {
        // If successful, invalidate relevant queries to refresh the UI
        const approval = approvalRequests.find(a => a.id === approvalId);
        
        if (approval?.requestType === 'ENROLLMENT') {
          // Invalidate programs list to show the new enrollment
          queryClient.invalidateQueries({ 
            queryKey: ['customers', user!.id.toString(), 'programs'] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['customers', user!.id.toString(), 'cards']
          });
        } else if (approval?.requestType === 'POINTS_DEDUCTION') {
          // Invalidate loyalty cards to show updated points
          queryClient.invalidateQueries({
            queryKey: ['customers', user!.id.toString(), 'cards']
          });
        }
      }
    } catch (error) {
      console.error('Error responding to approval:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      approvalRequests,
      unreadCount,
      showNotificationCenter,
      latestNotification,
      showPopup,
      toggleNotificationCenter,
      markAsRead,
      dismissPopup,
      respondToApproval
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
