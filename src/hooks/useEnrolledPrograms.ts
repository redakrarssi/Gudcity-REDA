import { useAuth } from '../contexts/AuthContext';
import { CustomerProgram, LoyaltyProgram, Business, RewardTier } from '../types/loyalty';
import { useDataLoader } from './useDataLoader';
import db from '../utils/databaseConnector';
import logger from '../utils/logger';

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
      
      // Convert user ID to integer for database query
      const userIdNumber = parseInt(userId, 10);
      
      try {
        // Fetch enrolled programs with related program and business details using tagged template
        const result = await db.executeQuery(`
          SELECT 
            cp.id, 
            cp.customer_id AS "customerId", 
            cp.program_id AS "programId", 
            cp.current_points AS "currentPoints", 
            cp.last_activity AS "lastActivity", 
            cp.enrolled_at AS "enrolledAt",
            lp.id AS "program_id", 
            lp.business_id AS "program_businessId",
            lp.name AS "program_name", 
            lp.description AS "program_description", 
            lp.type AS "program_type", 
            lp.point_value AS "program_pointValue",
            lp.expiration_days AS "program_expirationDays", 
            lp.status AS "program_status",
            lp.created_at AS "program_createdAt", 
            lp.updated_at AS "program_updatedAt",
            b.id AS "business_id",
            b.name AS "business_name",
            b.category AS "business_category",
            b.address AS "business_address",
            b.city AS "business_city",
            b.state AS "business_state",
            b.country AS "business_country"
          FROM customer_programs cp
          JOIN loyalty_programs lp ON cp.program_id = lp.id
          JOIN businesses b ON lp.business_id = b.id
          WHERE cp.customer_id = ${userIdNumber}
          AND lp.status = 'ACTIVE'
          ORDER BY cp.current_points DESC
        `, [], {
          cache: {
            enabled: true,
            ttl: 5 * 60 * 1000, // 5 minutes
            tags: ['customer', 'programs', `customer-${userIdNumber}`]
          }
        });
        
        if (!result || result.length === 0) {
          return [];
        }
        
        // Get all program IDs to batch fetch reward tiers
        const programIds = result.map(row => Number(row.program_id));
        
        // Batch fetch all reward tiers for all programs at once
        const rewardTiersMap = await batchFetchRewardTiers(programIds);
        
        // Transform the flat query results into nested objects
        const formattedPrograms = result.map(row => ({
          id: String(row.id || ''),
          customerId: String(row.customerId || ''),
          programId: String(row.programId || ''),
          currentPoints: Number(row.currentPoints || 0),
          lastActivity: String(row.lastActivity || new Date().toISOString()),
          enrolledAt: String(row.enrolledAt || new Date().toISOString()),
          program: {
            id: String(row.program_id || ''),
            businessId: String(row.program_businessId || ''),
            name: String(row.program_name || ''),
            description: String(row.program_description || ''),
            type: String(row.program_type || 'POINTS') as 'POINTS' | 'STAMPS' | 'CASHBACK',
            pointValue: Number(row.program_pointValue || 0),
            expirationDays: row.program_expirationDays !== null ? Number(row.program_expirationDays) : null,
            status: String(row.program_status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
            createdAt: String(row.program_createdAt || new Date().toISOString()),
            updatedAt: String(row.program_updatedAt || new Date().toISOString()),
            // Get reward tiers from the batch fetched map
            rewardTiers: rewardTiersMap.get(Number(row.program_id || 0)) || []
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
        throw error;
      }
    },
    {
      fallbackData: [],
      loadingDelay: 400,
      queryOptions: {
        staleTime: 60 * 1000, // Consider data fresh for 1 minute
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      }
    }
  );
}

/**
 * Helper function to batch fetch reward tiers for multiple programs
 * This reduces the number of database queries
 */
async function batchFetchRewardTiers(programIds: number[]): Promise<Map<number, RewardTier[]>> {
  if (!programIds.length) {
    return new Map();
  }
  
  // Create a map to store reward tiers by program ID
  const rewardTiersMap = new Map<number, RewardTier[]>();
  
  try {
    // Use tagged template literals instead of parameterized query
    const rewards = await db.executeQuery(`
      SELECT 
        id, 
        program_id AS "programId", 
        points_required AS "pointsRequired", 
        reward
      FROM loyalty_program_rewards
      WHERE program_id = ANY(${programIds})
      ORDER BY program_id, points_required ASC
    `, [], {
      cache: {
        enabled: true,
        ttl: 10 * 60 * 1000, // 10 minutes
        tags: ['reward-tiers']
      }
    });
    
    // Group rewards by program ID
    rewards.forEach(reward => {
      const programId = Number(reward.programId);
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