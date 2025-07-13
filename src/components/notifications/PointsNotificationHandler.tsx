import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { forceRefreshCards } from '../../utils/cardSyncUtil';

interface PointsNotificationHandlerProps {
  addNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

/**
 * Component that listens for points awarded events and triggers notifications
 * This should be included in the customer dashboard and cards pages
 */
export const PointsNotificationHandler: React.FC<PointsNotificationHandlerProps> = ({ 
  addNotification 
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Handler for points awarded events
    const handlePointsAwarded = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail) return;
      
      const { customerId, points, programName } = detail;
      
      // Only process if this is for the current user
      if (customerId === user.id.toString()) {
        console.log('Points awarded event received for current user:', detail);
        
        // Show notification
        if (addNotification) {
          addNotification('success', `You've received ${points} points${programName ? ` in ${programName}` : ''}`);
        }
        
        // Refresh cards data
        queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
        forceRefreshCards(user.id.toString());
      }
    };

    // Handler for customer notifications
    const handleCustomerNotification = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail) return;
      
      // Check if this notification is for the current user
      if (user && detail.customerId === user.id.toString()) {
        if (detail.type === 'POINTS_ADDED') {
          // Show notification
          if (addNotification) {
            addNotification('success', `You've received ${detail.points} points in ${detail.programName || 'your loyalty program'}`);
          }
          
          // Refresh cards data
          queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
          forceRefreshCards(user.id.toString());
        }
      }
    };

    // Check localStorage for recent notifications
    const checkLocalStorage = () => {
      // Look for points notifications
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('points_notification_') || key.startsWith('sync_points_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            
            // Check if this notification is for the current user and is recent (last 30 seconds)
            const timestamp = new Date(data.timestamp || 0);
            const isRecent = Date.now() - timestamp.getTime() < 30000; // 30 seconds
            
            if (user && data.customerId === user.id.toString() && isRecent) {
              // Show notification
              if (addNotification) {
                addNotification('success', `You've received ${data.points} points in your loyalty program`);
              }
              
              // Refresh cards data
              queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
              forceRefreshCards(user.id.toString());
              
              // Remove the notification to prevent showing it again
              localStorage.removeItem(key);
            }
          } catch (error) {
            console.warn('Error parsing notification from localStorage:', error);
          }
        }
      });
    };

    // Register event listeners
    window.addEventListener('points-awarded', handlePointsAwarded);
    window.addEventListener('customer-notification', handleCustomerNotification);
    
    // Check for notifications on mount
    checkLocalStorage();
    
    // Set up periodic checking
    const intervalId = setInterval(checkLocalStorage, 5000);
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('points-awarded', handlePointsAwarded);
      window.removeEventListener('customer-notification', handleCustomerNotification);
      clearInterval(intervalId);
    };
  }, [user, addNotification, queryClient]);

  // This component doesn't render anything
  return null;
};

export default PointsNotificationHandler; 