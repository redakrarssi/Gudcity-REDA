/**
 * EnrollmentNotificationHandler - Real-time enrollment notification processing
 * 
 * This component handles real-time enrollment notifications and ensures
 * immediate UI updates when customers accept/decline program invitations.
 */

import React, { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { EnrollmentResponseService } from '../../services/EnrollmentResponseService';
import { logger } from '../../utils/logger';

interface EnrollmentNotificationHandlerProps {
  customerId: string;
  onEnrollmentProcessed?: (result: any) => void;
}

export const EnrollmentNotificationHandler: React.FC<EnrollmentNotificationHandlerProps> = ({
  customerId,
  onEnrollmentProcessed
}) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  /**
   * Handle enrollment response processing
   */
  const handleEnrollmentResponse = useCallback(async (requestId: string, approved: boolean) => {
    try {
      logger.info('Processing enrollment response', { requestId, approved, customerId });
      
      // Process the enrollment response
      const result = await EnrollmentResponseService.processEnrollmentResponse(requestId, approved);
      
      if (result.success) {
        // Invalidate all related queries for immediate UI updates
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['loyaltyCards', customerId] }),
          queryClient.invalidateQueries({ queryKey: ['customerNotifications', customerId] }),
          queryClient.invalidateQueries({ queryKey: ['customerApprovals', customerId] }),
          queryClient.invalidateQueries({ queryKey: ['enrolledPrograms', customerId] }),
          queryClient.invalidateQueries({ queryKey: ['customerBusinessRelationships', customerId] })
        ]);
        
        // Force immediate refetch for critical data
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['loyaltyCards', customerId] }),
          queryClient.refetchQueries({ queryKey: ['enrolledPrograms', customerId] })
        ]);
        
        logger.info('Enrollment response processed successfully', { result });
        
        // Notify parent component
        if (onEnrollmentProcessed) {
          onEnrollmentProcessed(result);
        }
      } else {
        logger.error('Enrollment response processing failed', { result });
        
        // Show error notification
        if (onEnrollmentProcessed) {
          onEnrollmentProcessed({ ...result, success: false });
        }
      }
    } catch (error) {
      logger.error('Error handling enrollment response', { error, requestId, approved });
      
      if (onEnrollmentProcessed) {
        onEnrollmentProcessed({
          success: false,
          message: 'An error occurred while processing the enrollment',
          errorCode: 'PROCESSING_ERROR'
        });
      }
    }
  }, [customerId, queryClient, onEnrollmentProcessed]);

  /**
   * Handle real-time enrollment events
   */
  const handleRealTimeEnrollmentEvent = useCallback((event: CustomEvent) => {
    try {
      const { action, customerId: eventCustomerId, cardId, programName } = event.detail;
      
      // Only process events for this customer
      if (eventCustomerId !== customerId) return;
      
      logger.info('Real-time enrollment event received', { action, customerId, cardId, programName });
      
      if (action === 'APPROVED' && cardId) {
        // Card was created, ensure UI is updated
        queryClient.invalidateQueries({ queryKey: ['loyaltyCards', customerId] });
        queryClient.invalidateQueries({ queryKey: ['enrolledPrograms', customerId] });
        
        // Show success message
        if (onEnrollmentProcessed) {
          onEnrollmentProcessed({
            success: true,
            message: `Successfully joined ${programName}`,
            cardId
          });
        }
      } else if (action === 'REJECTED') {
        // Enrollment was declined, update UI
        queryClient.invalidateQueries({ queryKey: ['customerNotifications', customerId] });
        queryClient.invalidateQueries({ queryKey: ['customerApprovals', customerId] });
        
        if (onEnrollmentProcessed) {
          onEnrollmentProcessed({
            success: true,
            message: `Declined to join ${programName}`
          });
        }
      }
    } catch (error) {
      logger.error('Error handling real-time enrollment event', { error, event });
    }
  }, [customerId, queryClient, onEnrollmentProcessed]);

  /**
   * Set up real-time event listeners
   */
  useEffect(() => {
    // Listen for enrollment response processed events
    const handleEnrollmentEvent = (event: Event) => {
      if (event instanceof CustomEvent && event.type === 'enrollment-response-processed') {
        handleRealTimeEnrollmentEvent(event);
      }
    };

    // Listen for custom enrollment events
    window.addEventListener('enrollment-response-processed', handleEnrollmentEvent);
    
    // Listen for visibility change to refresh data when returning to app
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        logger.info('App became visible, refreshing enrollment data');
        queryClient.invalidateQueries({ queryKey: ['loyaltyCards', customerId] });
        queryClient.invalidateQueries({ queryKey: ['enrolledPrograms', customerId] });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener('enrollment-response-processed', handleEnrollmentEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [customerId, queryClient, handleRealTimeEnrollmentEvent]);

  /**
   * Set up background synchronization
   */
  useEffect(() => {
    // Background sync every 10 seconds to ensure data consistency
    const backgroundSyncInterval = setInterval(async () => {
      try {
        if (!document.hidden) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['loyaltyCards', customerId] }),
            queryClient.invalidateQueries({ queryKey: ['enrolledPrograms', customerId] })
          ]);
        }
      } catch (error) {
        logger.error('Background sync error', { error, customerId });
      }
    }, 10000);

    return () => clearInterval(backgroundSyncInterval);
  }, [customerId, queryClient]);

  // This component doesn't render anything, it just handles events
  return null;
};