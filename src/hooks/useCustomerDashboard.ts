import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { queryKeys } from '../utils/queryClient';
import { ProductionSafeService } from '../utils/productionApiClient';
import { Transaction } from '../types/loyalty';

interface DashboardStats {
  totalPoints: number;
  totalPrograms: number;
  upcomingRewards: {
    programId: string;
    programName: string;
    businessName: string;
    rewardId: string;
    reward: string;
    pointsRequired: number;
    pointsNeeded: number;
    progress: number;
  }[];
  recentActivity: Transaction[];
  lastVisitedBusiness?: {
    id: string;
    name: string;
    lastVisited: string;
  };
}

/**
 * Custom hook for customer dashboard statistics with batched queries
 * and optimized caching for improved performance
 */
export function useCustomerDashboard() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.dashboard.customerSummary(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('Authentication required');
      }
      
      // Use production-safe API in production (and same path works in dev)
      const id = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
      const data = await ProductionSafeService.getDashboardStats('customer', id);

      // Normalize to DashboardStats
      const totalPoints = Number(data.totalPoints || 0);
      const totalPrograms = Array.isArray(data.enrolledPrograms) ? data.enrolledPrograms.length : Number(data.totalPrograms || 0);
      const recentActivity = Array.isArray(data.recentActivity) ? data.recentActivity : [];
      const upcomingRewards: DashboardStats['upcomingRewards'] = [];
      const lastVisitedBusiness: DashboardStats['lastVisitedBusiness'] | undefined = undefined;
            
            return {
        totalPoints,
        totalPrograms,
            upcomingRewards,
            recentActivity,
            lastVisitedBusiness
          } as DashboardStats;
    },
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 3,
  });
} 