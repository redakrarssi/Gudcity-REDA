import { useAuth } from '../contexts/AuthContext';
import { CustomerProgram, LoyaltyProgram, Business, RewardTier } from '../types/loyalty';
import { useDataLoader } from './useDataLoader';
import { logger } from '../utils/logger';

// Combined data structure for enrolled programs
export interface EnrolledProgramData extends CustomerProgram {
  program: LoyaltyProgram;
  business: Business;
}

/**
 * Custom hook for fetching enrolled programs with 
 * optimized caching and batch query support
 */
export function useEnrolledPrograms() {
  const { user } = useAuth();
  // Ensure userId is a string for the query key
  const userId = user?.id ? String(user.id) : '';
  
  return useDataLoader<EnrolledProgramData[]>(
    ['customers', 'programs', userId],
    async () => {
      if (!userId) {
        throw new Error('Authentication required');
      }
      
      try {
        // Use API call instead of direct database access
        const response = await fetch(`/api/customers/${userId}/programs`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API call failed: ${response.status}`);
        }
        
        const data = await response.json();
        const result = data.programs || [];
        
        if (!result || result.length === 0) {
          return [];
        }
        
        // Get all program IDs to batch fetch reward tiers
        const programIds = result.map(row => row.program_id);
        
        // Batch fetch all reward tiers for all programs at once
        const rewardTiersMap = await batchFetchRewardTiers(programIds);
        
        // Transform the flat query results into nested objects
        const formattedPrograms = result.map(row => ({
          id: String(row.id || ''),
          customerId: String(row.customerId || ''),
          programId: String(row.programId || ''),
          currentPoints: Number(row.currentPoints || 0),
          lastActivity: new Date().toISOString(), // Use current time as fallback
          enrolledAt: String(row.enrolledAt || new Date().toISOString()),
          status: String(row.enrollmentStatus || 'ACTIVE'),
          program: {
            id: String(row.program_id || ''),
            businessId: String(row.program_businessId || ''),
            name: String(row.program_name || ''),
            description: String(row.program_description || ''),
            type: String(row.program_type || 'POINTS') as 'POINTS' | 'STAMPS' | 'CASHBACK',
            pointValue: Number(row.program_pointValue || 1.0), // Use 1.0 as fallback value
            expirationDays: row.program_expirationDays !== null ? Number(row.program_expirationDays) : null,
            status: String(row.program_status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
            createdAt: String(row.program_createdAt || new Date().toISOString()),
            updatedAt: String(row.program_updatedAt || new Date().toISOString()),
            // Get reward tiers from the batch fetched map
            rewardTiers: rewardTiersMap.get(row.program_id) || []
          },
          business: {
            id: String(row.business_id || ''),
            name: String(row.business_name || ''),
            category: String(row.business_category || ''),
            location: {
              address: String(row.business_address || ''),
              city: String(row.business_city || ''),
              state: String(row.business_state || ''),
              country: String(row.business_country || '')
            }
          }
        }));
        
        return formattedPrograms;
      } catch (error) {
        logger.error('Failed to fetch enrolled programs:', error);
        
        // Return empty array instead of failing completely
        return [];
      }
    },
    {
      fallbackData: [],
      loadingDelay: 400,
      queryOptions: {
        staleTime: 10 * 1000, // Consider data fresh for 10 seconds for more frequent updates
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
        retry: 3, // Retry failed requests up to 3 times
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000) // Exponential backoff
      }
    }
  );
}

/**
 * Helper function to batch fetch reward tiers for multiple programs
 * This reduces the number of database queries
 */
async function batchFetchRewardTiers(programIds: any[]): Promise<Map<string | number, RewardTier[]>> {
  if (!programIds.length) {
    return new Map();
  }
  
  // Create a map to store reward tiers by program ID
  const rewardTiersMap = new Map<string | number, RewardTier[]>();
  
  try {
    // Use API call instead of direct database access
    const response = await fetch('/api/customers/reward-tiers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ programIds })
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const data = await response.json();
    const rewards = data.rewardTiers || [];
    
    // Group rewards by program ID
    rewards.forEach(reward => {
      const programId = reward.programId;
      if (!rewardTiersMap.has(programId)) {
        rewardTiersMap.set(programId, []);
      }
      
      rewardTiersMap.get(programId)?.push({
        id: String(reward.id),
        programId: String(reward.programId),
        pointsRequired: Number(reward.pointsRequired),
        reward: String(reward.reward)
      });
    });
  } catch (error) {
    logger.error('Failed to fetch reward tiers:', error);
    // Return empty map if query fails, allowing partial data display
  }
  
  return rewardTiersMap;
} 