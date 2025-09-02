import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { queryKeys } from '../utils/queryClient';
import { withCache } from '../utils/cache';
import { batchDatabaseQueries } from '../utils/batchQueries';
import sql from '../utils/db';
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
      
      // Convert user ID to integer for database query
      const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
      
      // Cache key based on user ID
      const cacheKey = `dashboard-stats-${userId}`;
      
      // Wrap the database queries with caching
      return withCache(
        async () => {
          // Use batch queries to reduce connection overhead
          const queryResults = await batchDatabaseQueries<any>([
            {
              id: 'total-points',
              query: `
                SELECT COALESCE(SUM(current_points), 0) AS total_points
                FROM customer_programs
                WHERE customer_id = ${userId}
              `
            },
            {
              id: 'program-count',
              query: `
                SELECT COUNT(*) AS program_count
                FROM customer_programs
                WHERE customer_id = ${userId}
              `
            },
            {
              id: 'upcoming-rewards',
              query: `
                WITH customer_points AS (
                  SELECT cp.program_id, cp.current_points
                  FROM customer_programs cp
                  WHERE cp.customer_id = ${userId}
                )
                SELECT 
                  r.id AS reward_id,
                  r.reward,
                  r.points_required,
                  r.program_id,
                  lp.name AS program_name,
                  b.name AS business_name,
                  cp.current_points
                FROM loyalty_program_rewards r
                JOIN customer_points cp ON r.program_id = cp.program_id
                JOIN loyalty_programs lp ON r.program_id = lp.id
                JOIN businesses b ON lp.business_id = b.id
                WHERE r.points_required > cp.current_points
                ORDER BY (r.points_required - cp.current_points) ASC
                LIMIT 5
              `
            },
            {
              id: 'recent-activity',
              query: `
                SELECT 
                  t.id,
                  t.customer_id AS "customerId",
                  t.business_id AS "businessId",
                  t.program_id AS "programId",
                  t.type,
                  t.points,
                  t.amount,
                  t.reward_id AS "rewardId",
                  t.created_at AS "createdAt",
                  b.name AS "businessName"
                FROM transactions t
                JOIN businesses b ON t.business_id = b.id
                WHERE t.customer_id = ${userId}
                ORDER BY t.created_at DESC
                LIMIT 5
              `
            },
            {
              id: 'last-visited',
              query: `
                SELECT 
                  b.id,
                  b.name,
                  MAX(t.created_at) AS last_visited
                FROM transactions t
                JOIN businesses b ON t.business_id = b.id
                WHERE t.customer_id = ${userId}
                GROUP BY b.id, b.name
                ORDER BY last_visited DESC
                LIMIT 1
              `
            }
          ]);
          
          // Extract results from batch query
          const totalPoints = queryResults['total-points']?.data?.[0]?.total_points || 0;
          const totalPrograms = queryResults['program-count']?.data?.[0]?.program_count || 0;
          const upcomingRewardsData = queryResults['upcoming-rewards']?.data || [];
          const recentActivityData = queryResults['recent-activity']?.data || [];
          const lastVisitedData = queryResults['last-visited']?.data?.[0];
          
          // Process upcoming rewards
          const upcomingRewards = upcomingRewardsData.map((reward: any) => {
            const pointsNeeded = reward.points_required - reward.current_points;
            const progress = (reward.current_points / reward.points_required) * 100;
            
            return {
              programId: String(reward.program_id),
              programName: reward.program_name,
              businessName: reward.business_name,
              rewardId: String(reward.reward_id),
              reward: reward.reward,
              pointsRequired: reward.points_required,
              pointsNeeded,
              progress: Math.min(Math.max(progress, 0), 100)
            };
          });
          
          // Format recent activity
          const recentActivity = recentActivityData.map((activity: any) => ({
            id: String(activity.id),
            customerId: String(activity.customerId),
            businessId: String(activity.businessId),
            programId: String(activity.programId),
            type: activity.type,
            points: activity.points,
            amount: activity.amount,
            rewardId: activity.rewardId ? String(activity.rewardId) : undefined,
            createdAt: activity.createdAt,
            businessName: activity.businessName
          }));
          
          // Format last visited business
          const lastVisitedBusiness = lastVisitedData ? {
            id: String(lastVisitedData.id),
            name: lastVisitedData.name,
            lastVisited: lastVisitedData.last_visited
          } : undefined;
          
          return {
            totalPoints: Number(totalPoints),
            totalPrograms: Number(totalPrograms),
            upcomingRewards,
            recentActivity,
            lastVisitedBusiness
          } as DashboardStats;
        },
        cacheKey,
        { ttl: 5 * 60 * 1000, tags: ['customer', 'dashboard', `customer-${userId}`] }
      );
    },
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 3,
  });
} 