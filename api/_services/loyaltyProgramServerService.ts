import { sql } from '../_lib/db';

export interface RewardTier {
  id?: string;
  programId: string;
  pointsRequired: number;
  reward: string;
}

export interface LoyaltyProgram {
  id: string;
  businessId: string;
  name: string;
  description: string;
  type: string;
  pointValue: number;
  rewardTiers: RewardTier[];
  expirationDays: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all loyalty programs for a business
 */
export async function getBusinessPrograms(businessId: number): Promise<LoyaltyProgram[]> {
  try {
    const result = await sql`
      SELECT * FROM loyalty_programs
      WHERE business_id = ${businessId}
      ORDER BY created_at DESC
    `;
    
    const programsWithRewards = await Promise.all(result.map(async (program: any) => {
      const rewardTiers = await getProgramRewardTiers(program.id.toString());
      
      return {
        id: program.id.toString(),
        businessId: program.business_id.toString(),
        name: program.name,
        description: program.description || '',
        type: program.type || 'POINTS',
        pointValue: parseFloat(program.points_per_dollar || 1),
        rewardTiers: rewardTiers,
        expirationDays: program.points_expiry_days,
        status: program.status || 'ACTIVE',
        createdAt: program.created_at,
        updatedAt: program.updated_at
      };
    }));
    
    return programsWithRewards;
  } catch (error) {
    console.error('Error fetching business programs:', error);
    return [];
  }
}

/**
 * Get a specific loyalty program by ID
 */
export async function getProgramById(programId: string): Promise<LoyaltyProgram | null> {
  try {
    const programs = await sql`
      SELECT * FROM loyalty_programs
      WHERE id = ${programId}
    `;
    
    if (!programs.length) {
      return null;
    }
    
    const program = programs[0];
    const rewardTiers = await getProgramRewardTiers(programId);
    
    return {
      id: program.id.toString(),
      businessId: program.business_id.toString(),
      name: program.name,
      description: program.description || '',
      type: program.type || 'POINTS',
      pointValue: parseFloat(program.points_per_dollar || 1),
      expirationDays: program.points_expiry_days,
      status: program.status || 'ACTIVE',
      createdAt: program.created_at,
      updatedAt: program.updated_at,
      rewardTiers
    };
  } catch (error) {
    console.error(`Error fetching program ${programId}:`, error);
    return null;
  }
}

/**
 * Get reward tiers for a specific program
 */
export async function getProgramRewardTiers(programId: string): Promise<RewardTier[]> {
  try {
    const tiers = await sql`
      SELECT * FROM reward_tiers
      WHERE program_id = ${programId}
      ORDER BY points_required ASC
    `;
    
    return tiers.map((tier: any) => ({
      id: tier.id?.toString(),
      programId: tier.program_id?.toString(),
      pointsRequired: tier.points_required,
      reward: tier.reward
    }));
  } catch (error) {
    console.error(`Error fetching reward tiers for program ${programId}:`, error);
    return [];
  }
}

/**
 * Create a new loyalty program
 */
export async function createProgram(program: Omit<LoyaltyProgram, 'id' | 'createdAt' | 'updatedAt'>): Promise<LoyaltyProgram | null> {
  try {
    const businessId = parseInt(program.businessId);
    
    if (isNaN(businessId)) {
      throw new Error(`Invalid business ID: ${program.businessId}`);
    }
    
    const result = await sql`
      INSERT INTO loyalty_programs (
        business_id,
        name,
        description,
        type,
        points_per_dollar,
        points_expiry_days,
        status
      )
      VALUES (
        ${businessId},
        ${program.name},
        ${program.description || ''},
        ${program.type},
        ${program.pointValue || 1},
        ${program.expirationDays === null ? null : program.expirationDays || 0},
        ${program.status || 'ACTIVE'}
      )
      RETURNING id
    `;
    
    if (!result.length) {
      return null;
    }
    
    const programId = result[0].id;
    
    // Insert reward tiers if provided
    if (program.rewardTiers && program.rewardTiers.length > 0) {
      for (const tier of program.rewardTiers) {
        if (!tier.reward || tier.pointsRequired === undefined) {
          continue;
        }
        
        await sql`
          INSERT INTO reward_tiers (
            program_id,
            points_required,
            reward
          )
          VALUES (
            ${programId},
            ${tier.pointsRequired},
            ${tier.reward}
          )
        `;
      }
    }
    
    return await getProgramById(String(programId));
  } catch (error) {
    console.error('Error creating loyalty program:', error);
    throw error;
  }
}

/**
 * Update an existing loyalty program
 */
export async function updateProgram(
  programId: string, 
  programData: Partial<Omit<LoyaltyProgram, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>>
): Promise<LoyaltyProgram | null> {
  try {
    if (programData.name !== undefined) {
      await sql`UPDATE loyalty_programs SET name = ${programData.name} WHERE id = ${programId}`;
    }
    
    if (programData.description !== undefined) {
      await sql`UPDATE loyalty_programs SET description = ${programData.description} WHERE id = ${programId}`;
    }
    
    if (programData.type !== undefined) {
      await sql`UPDATE loyalty_programs SET type = ${programData.type} WHERE id = ${programId}`;
    }
    
    if (programData.pointValue !== undefined) {
      await sql`UPDATE loyalty_programs SET points_per_dollar = ${programData.pointValue} WHERE id = ${programId}`;
    }
    
    if (programData.expirationDays !== undefined) {
      await sql`UPDATE loyalty_programs SET points_expiry_days = ${programData.expirationDays} WHERE id = ${programId}`;
    }
    
    if (programData.status !== undefined) {
      await sql`UPDATE loyalty_programs SET status = ${programData.status} WHERE id = ${programId}`;
    }
    
    await sql`UPDATE loyalty_programs SET updated_at = NOW() WHERE id = ${programId}`;
    
    // Update reward tiers if provided
    if (programData.rewardTiers) {
      await sql`DELETE FROM reward_tiers WHERE program_id = ${programId}`;
      
      if (programData.rewardTiers.length > 0) {
        await Promise.all(programData.rewardTiers.map((tier: RewardTier) =>
          sql`
            INSERT INTO reward_tiers (
              program_id,
              points_required,
              reward
            )
            VALUES (
              ${programId},
              ${tier.pointsRequired},
              ${tier.reward}
            )
          `
        ));
      }
    }
    
    return await getProgramById(programId);
  } catch (error) {
    console.error(`Error updating program ${programId}:`, error);
    return null;
  }
}

/**
 * Delete a loyalty program
 */
export async function deleteProgram(programId: string): Promise<boolean> {
  try {
    // Delete associated reward tiers first
    await sql`DELETE FROM reward_tiers WHERE program_id = ${programId}`;
    
    // Delete customer enrollments
    await sql`DELETE FROM customer_programs WHERE program_id = ${programId}`;
    
    // Delete the program
    const result = await sql`
      DELETE FROM loyalty_programs
      WHERE id = ${programId}
      RETURNING id
    `;
    
    return result.length > 0;
  } catch (error) {
    console.error(`Error deleting program ${programId}:`, error);
    return false;
  }
}

/**
 * Get all customers enrolled in a specific program
 */
export async function getEnrolledCustomers(programId: string): Promise<{customerId: string, customerName: string}[]> {
  try {
    const result = await sql`
      SELECT DISTINCT 
        cp.customer_id,
        c.name as customer_name
      FROM customer_programs cp
      LEFT JOIN customers c ON cp.customer_id = c.id
      WHERE cp.program_id = ${parseInt(programId)}
    `;
    
    return result.map((row: any) => ({
      customerId: row.customer_id.toString(),
      customerName: row.customer_name || 'Customer'
    }));
  } catch (error) {
    console.error(`Error getting enrolled customers for program ${programId}:`, error);
    return [];
  }
}

/**
 * Get customers for a program (alias for backward compatibility)
 */
export async function getProgramCustomers(programId: string): Promise<any[]> {
  return getEnrolledCustomers(programId);
}

