import sql from '../utils/db';
import type { LoyaltyProgram, RewardTier, ProgramType } from '../types/loyalty';
import { CustomerService } from './customerService';

/**
 * Service for managing loyalty programs with database integration
 */
export class LoyaltyProgramService {
  /**
   * Get all loyalty programs for a business
   */
  static async getBusinessPrograms(businessId: string): Promise<LoyaltyProgram[]> {
    try {
      const result = await sql`
        SELECT * FROM loyalty_programs
        WHERE business_id = ${parseInt(businessId)}
        ORDER BY created_at DESC
      `;
      
      return result.map((program: any) => ({
        id: program.id.toString(),
        businessId: program.business_id.toString(),
        name: program.name,
        description: program.description || '',
        type: program.type || 'POINTS',
        pointValue: parseFloat(program.points_per_dollar || 1),
        rewardTiers: program.reward_tiers || [],
        expirationDays: program.points_expiry_days,
        status: program.status || 'ACTIVE',
        createdAt: program.created_at,
        updatedAt: program.updated_at
      }));
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
        type: program.type as ProgramType || 'POINTS',
        pointValue: program.points_per_dollar || 1,
        expirationDays: program.points_expiry_days,
        status: program.status || 'ACTIVE',
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
      console.log('Creating program with data:', JSON.stringify(program, null, 2));
      
      // Ensure we have valid data
      if (!program.businessId || !program.name || !program.type) {
        console.error('Missing required program fields:', { 
          businessId: program.businessId, 
          name: program.name, 
          type: program.type 
        });
        return null;
      }
      
      // Parse businessId to ensure it's a number
      const businessId = parseInt(program.businessId);
      
      if (isNaN(businessId)) {
        console.error(`Invalid business ID: ${program.businessId}`);
        return null;
      }
      
      console.log('Parsed business ID:', businessId);
      
      try {
        // Insert the program with explicit type checking
        console.log('Executing program insert query...');
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
            ${String(program.name)},
            ${program.description ? String(program.description) : ''},
            ${String(program.type)},
            ${Number(program.pointValue || 1)},
            ${program.expirationDays === null ? null : Number(program.expirationDays || 0)},
            ${program.status ? String(program.status) : 'ACTIVE'}
        )
          RETURNING id
      `;
        
        console.log('Program insert query result:', result);
      
      if (!result.length) {
          console.error('No result returned from program insertion');
        return null;
      }
      
        const programId = result[0].id;
        console.log('Created new program with ID:', programId);
      
      // Insert reward tiers if provided
      if (program.rewardTiers && program.rewardTiers.length > 0) {
          try {
            console.log(`Adding ${program.rewardTiers.length} reward tiers`);
            for (const tier of program.rewardTiers) {
              if (!tier.reward || tier.pointsRequired === undefined) {
                console.warn('Skipping invalid reward tier:', tier);
                continue;
              }
              
              console.log('Adding reward tier:', { 
                programId: programId, 
                pointsRequired: Number(tier.pointsRequired), 
                reward: String(tier.reward)
              });
              
              await sql`
            INSERT INTO reward_tiers (
              program_id,
              points_required,
              reward
            )
            VALUES (
                  ${programId},
                  ${Number(tier.pointsRequired)},
                  ${String(tier.reward)}
            )
              `;
            }
            console.log('All reward tiers created successfully');
          } catch (tierError) {
            console.error('Error inserting reward tiers:', tierError);
            // Continue execution to return the program even if tiers failed
          }
      }
      
      // Return the created program with reward tiers
        console.log('Fetching complete program data...');
        const completeProgram = await this.getProgramById(String(programId));
        console.log('Complete program data:', completeProgram);
        return completeProgram;
      } catch (queryError: any) {
        console.error('Database query error during program creation:', queryError);
        throw new Error(`Database query failed: ${queryError.message || JSON.stringify(queryError)}`);
      }
    } catch (error) {
      console.error('Error creating loyalty program:', error);
      // Log more details about the program data for debugging
      console.error('Program data:', JSON.stringify(program, null, 2));
      throw error; // Re-throw the error to be handled by the caller
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
        updateFields.push(sql`points_per_dollar = ${programData.pointValue}`);
      }
      
      if (programData.expirationDays !== undefined) {
        updateFields.push(sql`points_expiry_days = ${programData.expirationDays}`);
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
          await sql`UPDATE loyalty_programs SET points_per_dollar = ${programData.pointValue} WHERE id = ${programId}`;
        }
        
        if (programData.expirationDays !== undefined) {
          await sql`UPDATE loyalty_programs SET points_expiry_days = ${programData.expirationDays} WHERE id = ${programId}`;
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

  /**
   * Enroll a customer in a loyalty program
   */
  static async enrollCustomer(
    customerId: string,
    programId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate customer and program first
      const customer = await CustomerService.getCustomerById(customerId);
      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }
      
      const program = await this.getProgramById(programId);
      if (!program) {
        return { success: false, error: 'Loyalty program not found' };
      }
      
      // Check if the customer is already enrolled in this program
      const existingEnrollment = await sql`
        SELECT * FROM program_enrollments
        WHERE customer_id = ${customerId}
        AND program_id = ${programId}
      `;
      
      if (existingEnrollment.length > 0) {
        return { success: false, error: 'Customer is already enrolled in this program' };
      }
      
      // Get the business owner
      const business = await sql`
        SELECT * FROM users
        WHERE id = ${program.businessId}
      `;
      
      // Instead of directly enrolling, create an approval request
      try {
        // Import CustomerNotificationService in a way that prevents circular dependencies
        const { CustomerNotificationService, ApprovalRequestType } = await import('./customerNotificationService');
        
        // Create an approval request for the customer
        await CustomerNotificationService.createApprovalRequest(
          customerId,
          program.businessId,
          ApprovalRequestType.ENROLLMENT,
          programId,
          'Program Enrollment Request',
          `${business[0]?.name || 'A business'} wants to enroll you in their ${program.name} program`,
          {
            programId: program.id,
            programName: program.name,
            businessId: program.businessId,
            businessName: business[0]?.name || 'Business',
            programType: program.type,
            programDescription: program.description
          }
        );
        
        return { success: true };
      } catch (error) {
        console.error('Failed to create approval request:', error);
        
        // Fallback to traditional enrollment if the notification system fails
        // This is a temporary solution until the notification system is fully integrated
        return await this.directEnrollCustomer(customerId, programId);
      }
    } catch (error) {
      console.error('Error enrolling customer in loyalty program:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Direct enrollment without approval process (used as fallback or after approval)
   */
  static async directEnrollCustomer(
    customerId: string,
    programId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Enroll the customer in the program
      await sql`
        INSERT INTO program_enrollments (
          customer_id,
          program_id,
          current_points,
          last_activity,
          enrolled_at
        )
        VALUES (
          ${customerId},
          ${programId},
          0,
          NOW(),
          NOW()
        )
      `;
      
      // Get program details for event emission
      const program = await this.getProgramById(programId);
      const business = program ? await sql`SELECT * FROM users WHERE id = ${program.businessId}` : [];
      
      // Emit enrollment event if telemetry utilities are available
      try {
        const { emitEnrollmentEvent } = await import('../utils/loyaltyEvents');
        
        // Create or fetch a card for the customer if needed
        const { LoyaltyCardService } = await import('./loyaltyCardService');
        const card = await LoyaltyCardService.getCustomerCard(customerId, program?.businessId || '');
        
        if (program && card) {
          emitEnrollmentEvent(
            customerId,
            program.businessId,
            business[0]?.name || 'Business',
            programId,
            program.name,
            card.id
          );
        }
      } catch (error) {
        console.error('Failed to emit enrollment event:', error);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error directly enrolling customer:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get a default loyalty program for a business to use for auto-enrollment
   * @param businessId ID of the business
   * @returns The first active loyalty program or null if none exists
   */
  static async getDefaultBusinessProgram(businessId: string): Promise<LoyaltyProgram | null> {
    try {
      const result = await sql`
        SELECT * FROM loyalty_programs
        WHERE business_id = ${businessId}
        AND status = 'ACTIVE'
        ORDER BY created_at ASC
        LIMIT 1
      `;
      
      if (!result.length) {
        return null;
      }
      
      const program = result[0];
      const rewardTiers = await this.getProgramRewardTiers(program.id);
      
      return {
        id: program.id.toString(),
        businessId: program.business_id.toString(),
        name: program.name,
        description: program.description || '',
        type: program.type,
        pointValue: parseFloat(program.point_value || 0),
        rewardTiers: rewardTiers,
        expirationDays: program.expiration_days,
        status: program.status,
        createdAt: program.created_at,
        updatedAt: program.updated_at
      };
    } catch (error) {
      console.error('Error fetching default business program:', error);
      return null;
    }
  }

  /**
   * Check if a customer is enrolled in a specific loyalty program
   * @param customerId ID of the customer
   * @param programId ID of the program
   * @returns Object indicating enrollment status
   */
  static async checkEnrollment(
    customerId: string, 
    programId: string
  ): Promise<{ isEnrolled: boolean; points?: number }> {
    try {
      const result = await sql`
        SELECT current_points FROM customer_programs
        WHERE customer_id = ${parseInt(customerId)}
        AND program_id = ${parseInt(programId)}
        AND status = 'ACTIVE'
      `;

      if (result.length > 0) {
        return { 
          isEnrolled: true, 
          points: result[0].current_points || 0
        };
      }
      
      return { isEnrolled: false };
    } catch (error) {
      console.error('Error checking enrollment:', error);
      return { isEnrolled: false };
    }
  }
  
  /**
   * Check if a customer is enrolled in any loyalty program for a business
   * @param customerId ID of the customer
   * @param businessId ID of the business
   * @returns Object indicating enrollment status
   */
  static async checkCustomerEnrollment(
    customerId: string,
    businessId: string
  ): Promise<{ isEnrolled: boolean; programIds?: string[] }> {
    try {
      // Get all programs for this business
      const programs = await this.getBusinessPrograms(businessId);
      
      if (!programs || programs.length === 0) {
        return { isEnrolled: false };
      }
      
      // Check if customer is enrolled in any of these programs
      const enrolledPrograms = [];
      
      for (const program of programs) {
        const enrollment = await this.checkEnrollment(customerId, program.id);
        if (enrollment.isEnrolled) {
          enrolledPrograms.push(program.id);
        }
      }
      
      return {
        isEnrolled: enrolledPrograms.length > 0,
        programIds: enrolledPrograms.length > 0 ? enrolledPrograms : undefined
      };
    } catch (error) {
      console.error('Error checking customer enrollment:', error);
      return { isEnrolled: false };
    }
  }
} 