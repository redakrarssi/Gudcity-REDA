import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { CustomerNotificationService } from '../services/customerNotificationService';

/**
 * Custom hook to handle enrollment notifications and approvals
 * This replaces the automatic popup in Cards.tsx
 */
export function useEnrollmentNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [hasUnhandledRequests, setHasUnhandledRequests] = useState(false);
  
  // Fetch pending approval requests
  const { data: pendingApprovals = [], isLoading, error, refetch } = useQuery({
    queryKey: ['customerApprovals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const approvals = await CustomerNotificationService.getPendingApprovals(user.id.toString());
        return approvals.filter(approval => approval.requestType === 'ENROLLMENT');
      } catch (error) {
        console.error('Error fetching enrollment approvals:', error);
        return [];
      }
    },
    enabled: !!user?.id,
    refetchInterval: 15000, // Check for new approvals every 15 seconds
  });
  
  // Check for pending enrollment requests
  useEffect(() => {
    if (pendingApprovals && pendingApprovals.length > 0) {
      setHasUnhandledRequests(true);
    } else {
      setHasUnhandledRequests(false);
    }
  }, [pendingApprovals]);
  
  // Function to refresh enrollment data
  const refreshEnrollmentData = async () => {
    if (!user?.id) return;
    
    try {
      await queryClient.invalidateQueries({ queryKey: ['customerApprovals', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['customerNotifications', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['enrolledPrograms', user.id] });
    } catch (error) {
      console.error('Error refreshing enrollment data:', error);
    }
  };
  
  return {
    pendingEnrollments: pendingApprovals,
    hasUnhandledRequests,
    isLoading,
    error,
    refreshEnrollmentData
  };
} 