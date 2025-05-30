import sql from '../utils/db';
import type { LoyaltyProgram, RewardTier, ProgramType } from '../types/loyalty';

/**
 * Service for managing loyalty programs with database integration
 */
export class LoyaltyProgramService {
  /**
   * Get all loyalty programs for a business
   */
  static async getBusinessPrograms(businessId: string): Promise<LoyaltyProgram[]> {
    try {
      const programs = await sql`
        SELECT * FROM loyalty_programs
        WHERE business_id = ${businessId}
        ORDER BY created_at DESC
      `;
      
      if (!programs.length) {
        return [];
      }
      
      // For each program, fetch its reward tiers
      const programsWithRewardTiers = await Promise.all(
        programs.map(async (program: any) => {
          const rewardTiers = await this.getProgramRewardTiers(program.id);
          return {
            id: program.id,
            businessId: program.business_id,
            name: program.name,
            description: program.description,
            type: program.type as ProgramType,
            pointValue: program.point_value,
            expirationDays: program.expiration_days,
            status: program.status,
            createdAt: program.created_at,
            updatedAt: program.updated_at,
            rewardTiers
          } as LoyaltyProgram;
        })
      );
      
      return programsWithRewardTiers;
    } catch (error) {
      console.error('Error fetching business programs:', error);
      return [];
    }
  }

  /**
   * Get a specific loyalty program by ID
   */
  static async getProgramById(programId: string): Promise<LoyaltyProgram | null> {
    try {
      const programs = await sql`
        SELECT * FROM loyalty_programs
        WHERE id = ${programId}
      `;
      
      if (!programs.length) {
        return null;
      }
      
      const program = programs[0];
      const rewardTiers = await this.getProgramRewardTiers(programId);
      
      return {
        id: program.id,
        businessId: program.business_id,
        name: program.name,
        description: program.description,
        type: program.type as ProgramType,
        pointValue: program.point_value,
        expirationDays: program.expiration_days,
        status: program.status,
        createdAt: program.created_at,
        updatedAt: program.updated_at,
        rewardTiers
      } as LoyaltyProgram;
    } catch (error) {
      console.error(`Error fetching program ${programId}:`, error);
      return null;
    }
  }

  /**
   * Get reward tiers for a specific program
   */
  static async getProgramRewardTiers(programId: string): Promise<RewardTier[]> {
    try {
      const tiers = await sql`
        SELECT * FROM reward_tiers
        WHERE program_id = ${programId}
        ORDER BY points_required ASC
      `;
      
      return tiers.map((tier: any) => ({
        id: tier.id,
        programId: tier.program_id,
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
  static async createProgram(program: Omit<LoyaltyProgram, 'id' | 'createdAt' | 'updatedAt'>): Promise<LoyaltyProgram | null> {
    try {
      // Insert the program
      const result = await sql`
        INSERT INTO loyalty_programs (
          business_id,
          name,
          description,
          type,
          point_value,
          expiration_days,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${program.businessId},
          ${program.name},
          ${program.description || ''},
          ${program.type},
          ${program.pointValue},
          ${program.expirationDays || null},
          ${program.status || 'ACTIVE'},
          NOW(),
          NOW()
        )
        RETURNING *
      `;
      
      if (!result.length) {
        return null;
      }
      
      const newProgram = result[0];
      
      // Insert reward tiers if provided
      if (program.rewardTiers && program.rewardTiers.length > 0) {
        await Promise.all(program.rewardTiers.map((tier: RewardTier) =>
          sql`
            INSERT INTO reward_tiers (
              program_id,
              points_required,
              reward
            )
            VALUES (
              ${newProgram.id},
              ${tier.pointsRequired},
              ${tier.reward}
            )
          `
        ));
      }
      
      // Return the created program with reward tiers
      return await this.getProgramById(newProgram.id);
    } catch (error) {
      console.error('Error creating loyalty program:', error);
      return null;
    }
  }

  /**
   * Update an existing loyalty program
   */
  static async updateProgram(
    programId: string, 
    programData: Partial<Omit<LoyaltyProgram, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>>
  ): Promise<LoyaltyProgram | null> {
    try {
      // Start building the update query
      const updateFields: any[] = [];
      
      if (programData.name !== undefined) {
        updateFields.push(sql`name = ${programData.name}`);
      }
      
      if (programData.description !== undefined) {
        updateFields.push(sql`description = ${programData.description}`);
      }
      
      if (programData.type !== undefined) {
        updateFields.push(sql`type = ${programData.type}`);
      }
      
      if (programData.pointValue !== undefined) {
        updateFields.push(sql`point_value = ${programData.pointValue}`);
      }
      
      if (programData.expirationDays !== undefined) {
        updateFields.push(sql`expiration_days = ${programData.expirationDays}`);
      }
      
      if (programData.status !== undefined) {
        updateFields.push(sql`status = ${programData.status}`);
      }
      
      // Always update the updated_at timestamp
      updateFields.push(sql`updated_at = NOW()`);
      
      // Only run the update if there are fields to update
      if (updateFields.length > 0) {
        // Handle each field separately since we can't dynamically build the query
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
          await sql`UPDATE loyalty_programs SET point_value = ${programData.pointValue} WHERE id = ${programId}`;
        }
        
        if (programData.expirationDays !== undefined) {
          await sql`UPDATE loyalty_programs SET expiration_days = ${programData.expirationDays} WHERE id = ${programId}`;
        }
        
        if (programData.status !== undefined) {
          await sql`UPDATE loyalty_programs SET status = ${programData.status} WHERE id = ${programId}`;
        }
        
        // Always update the timestamp
        await sql`UPDATE loyalty_programs SET updated_at = NOW() WHERE id = ${programId}`;
      }
      
      // Update reward tiers if provided
      if (programData.rewardTiers) {
        // First delete existing reward tiers
        await sql`DELETE FROM reward_tiers WHERE program_id = ${programId}`;
        
        // Then insert new ones
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
      
      // Return the updated program
      return await this.getProgramById(programId);
    } catch (error) {
      console.error(`Error updating program ${programId}:`, error);
      return null;
    }
  }

  /**
   * Delete a loyalty program
   */
  static async deleteProgram(programId: string): Promise<boolean> {
    try {
      // Delete associated reward tiers first (due to foreign key constraints)
      await sql`DELETE FROM reward_tiers WHERE program_id = ${programId}`;
      
      // Then delete the program
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
} 