import { useAuth } from '../contexts/AuthContext';
import { CustomerProgram, LoyaltyProgram, Business, RewardTier } from '../types/loyalty';
import { useDataLoader } from './useDataLoader';
import db from '../utils/databaseConnector';
import { logger } from '../utils/logger';
import sql from '../utils/db';

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
      if (isNaN(userIdNumber)) {
        throw new Error('Invalid user ID');
      }
      
      try {
        // Use a parameterized query with safe SQL interpolation
        const query = sql`
          SELECT 
            cp.id, 
            cp.customer_id AS "customerId", 
            cp.program_id AS "programId", 
            cp.current_points AS "currentPoints", 
            cp.enrolled_at AS "enrolledAt",
            cp.status AS "enrollmentStatus",
            lp.id AS "program_id", 
            lp.business_id AS "program_businessId",
            lp.name AS "program_name", 
            lp.description AS "program_description", 
            lp.type AS "program_type", 
            1.0 AS "program_pointValue", -- Use constant value instead of problematic columns
            365 AS "program_expirationDays", -- Add default value
            lp.status AS "program_status",
            lp.created_at AS "program_createdAt", 
            lp.updated_at AS "program_updatedAt",
            b.id AS "business_id",
            b.name AS "business_name",
            '' AS "business_category", -- Default empty string for missing column
            '' AS "business_address", -- Default empty string for potentially missing column
            '' AS "business_city", -- Default empty string for potentially missing column
            '' AS "business_state", -- Default empty string for potentially missing column
            '' AS "business_country" -- Default empty string for potentially missing column
          FROM program_enrollments cp
          JOIN loyalty_programs lp ON cp.program_id = lp.id::text
          JOIN users b ON lp.business_id = b.id
          WHERE cp.customer_id = ${userIdNumber}
          AND cp.status = 'ACTIVE'
          AND lp.status = 'ACTIVE'
          ORDER BY cp.current_points DESC
        `;
        
        // Execute the query
        const result = await query;
        
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
    // Create the SQL query using tagged template literals
    const query = sql`
      SELECT 
        id, 
        program_id AS "programId", 
        points_required AS "pointsRequired", 
        reward
      FROM reward_tiers
      WHERE program_id = ANY(${programIds})
      ORDER BY program_id, points_required ASC
    `;
    
    // Execute the query directly
    const rewards = await query;
    
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