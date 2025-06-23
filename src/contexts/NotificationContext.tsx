import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';

import { socket, connectAuthenticatedSocket } from '../utils/socket';

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
  notificationId: string;
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
    
    // For development, we'll use mock data
    // In production, you would fetch from API
    const fetchNotifications = async () => {
      try {
        // Mock data for development
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
          },
          {
            id: '2',
            notificationId: '4',
            customerId: user.id.toString(),
            businessId: '101',
            requestType: 'POINTS_DEDUCTION',
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
        ];
        
        setNotifications(mockNotifications);
        setApprovalRequests(mockApprovals);
        
        const unread = mockNotifications.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };
    
    fetchNotifications();
    
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
        businessName: approval.businessName
      };
      
      handleNewNotification(notification);
    };

    // For development, we'll also include a demo notification
    const mockTimer = setTimeout(() => {
      const mockNotification: CustomerNotification = {
        id: `mock-${Date.now()}`,
        customerId: user.id.toString(),
        businessId: '789',
        type: 'POINTS_ADDED',
        title: 'Live Points Update',
        message: 'You just received 25 points from Premium Cafe',
        requiresAction: false,
        actionTaken: false,
        isRead: false,
        createdAt: new Date().toISOString(),
        businessName: 'Premium Cafe'
      };
      
      handleNewNotification(mockNotification);
    }, 20000); // Show a notification after 20 seconds (for demo purposes)
    
    // Setup socket listeners
    socket.on(`notification:${user.id}`, handleNewNotification);
    socket.on(`approval:${user.id}`, handleNewApproval);
    
    // Connect socket if not already connected
    // In a production environment, you'd pass the auth token
    if (!socket.connected) {
      // For development, we'll just connect without authentication
      socket.connect();
      
      // In production:
      // const token = localStorage.getItem('auth_token');
      // if (token) connectAuthenticatedSocket(token);
    }
    
    return () => {
      clearTimeout(mockTimer);
      socket.off(`notification:${user.id}`, handleNewNotification);
      socket.off(`approval:${user.id}`, handleNewApproval);
    };
  }, [user?.id]);

  const toggleNotificationCenter = () => {
    setShowNotificationCenter(prev => !prev);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      
      // Recalculate unread count
      setUnreadCount(prev => Math.max(prev - 1, 0));
      
      // In production, you'd make an API call
      console.log(`Marking notification ${notificationId} as read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const dismissPopup = () => {
    setShowPopup(false);
    if (latestNotification) {
      markAsRead(latestNotification.id);
    }
  };

  const respondToApproval = async (approvalId: string, approved: boolean) => {
    try {
      // Update local state
      setApprovalRequests(prev => 
        prev.filter(a => a.id !== approvalId)
      );
      
      // In production, you'd make an API call
      console.log(`${approved ? 'Approving' : 'Declining'} request ${approvalId}`);
      
      // Add notification about the action
      const approval = approvalRequests.find(a => a.id === approvalId);
      if (approval) {
        const notification: CustomerNotification = {
          id: `response-${Date.now()}`,
          customerId: user?.id ? user.id.toString() : '',
          businessId: approval.businessId,
          type: approved ? 'ENROLLMENT_APPROVED' : 'ENROLLMENT_REJECTED',
          title: approved ? 'Request Approved' : 'Request Declined',
          message: `You ${approved ? 'approved' : 'declined'} the request from ${approval.businessName}`,
          requiresAction: false,
          actionTaken: true,
          isRead: false,
          createdAt: new Date().toISOString(),
          businessName: approval.businessName
        };
        
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error responding to approval:', error);
    }
  };
  
  const value = {
    notifications,
    approvalRequests,
    unreadCount,
    showNotificationCenter,
    latestNotification,
    showPopup,
    toggleNotificationCenter,
    markAsRead,
    dismissPopup,
    respondToApproval,
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 
