/**
 * Loyalty Program Service - API Version
 * 
 * This service replaces direct database connections with secure API calls.
 * All operations now go through the serverless API layer.
 * 
 * Migration Status: ✅ COMPLETE
 * Security Level: 🔒 SECURE - No direct DB access
 */

import { businessApi, pointsApi, customerApi } from '../utils/enhancedApiClient';
import type { LoyaltyProgram, RewardTier, ProgramType } from '../types/loyalty';
import { logger } from '../utils/logger';

/**
 * Service for managing loyalty programs with API integration
 */
export class LoyaltyProgramService {
  /**
   * Get all loyalty programs for a business
   */
  static async getBusinessPrograms(businessId: string): Promise<LoyaltyProgram[]> {
    try {
      const response = await businessApi.getPrograms(businessId);
      
      if (!response.success) {
        logger.error('Failed to fetch business programs', { businessId, error: response.error });
        return [];
      }
      
      return response.data || [];
    } catch (error) {
      logger.error('Error fetching business programs', { businessId, error });
      return [];
    }
  }

  /**
   * Get a specific loyalty program by ID
   */
  static async getProgramById(programId: string): Promise<LoyaltyProgram | null> {
    try {
      const response = await businessApi.get(programId);
      
      if (!response.success) {
        logger.error('Failed to fetch program', { programId, error: response.error });
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      logger.error('Error fetching program', { programId, error });
      return null;
    }
  }

  /**
   * Get reward tiers for a specific program
   */
  static async getProgramRewardTiers(programId: string): Promise<RewardTier[]> {
    try {
      // Reward tiers are included in the program response
      const program = await this.getProgramById(programId);
      return program?.rewardTiers || [];
    } catch (error) {
      logger.error('Error fetching reward tiers', { programId, error });
      return [];
    }
  }

  /**
   * Create a new loyalty program
   */
  static async createProgram(program: Omit<LoyaltyProgram, 'id' | 'createdAt' | 'updatedAt'>): Promise<LoyaltyProgram | null> {
    try {
      logger.info('Creating program', { businessId: program.businessId, name: program.name });
      
      if (!program.businessId || !program.name || !program.type) {
        logger.error('Missing required program fields', { 
          businessId: program.businessId, 
          name: program.name, 
          type: program.type 
        });
        return null;
      }
      
      const response = await businessApi.createProgram(program.businessId, {
        name: program.name,
        description: program.description,
        type: program.type,
        pointValue: program.pointValue,
        expirationDays: program.expirationDays,
        status: program.status || 'ACTIVE',
        rewardTiers: program.rewardTiers
      });
      
      if (!response.success) {
        logger.error('Failed to create program', { error: response.error });
        return null;
      }
      
      logger.info('Program created successfully', { programId: response.data?.id });
      return response.data || null;
    } catch (error) {
      logger.error('Error creating loyalty program', { error, program });
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
      // Get the program first to get businessId
      const existingProgram = await this.getProgramById(programId);
      if (!existingProgram) {
        logger.error('Program not found for update', { programId });
        return null;
      }
      
      const response = await businessApi.updateProgram(
        existingProgram.businessId, 
        programId, 
        programData
      );
      
      if (!response.success) {
        logger.error('Failed to update program', { programId, error: response.error });
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      logger.error('Error updating program', { programId, error });
      return null;
    }
  }

  /**
   * Get all customers enrolled in a specific program
   */
  static async getEnrolledCustomers(programId: string): Promise<{customerId: string, customerName: string}[]> {
    try {
      // This requires a custom endpoint or we can get it from program details
      const program = await this.getProgramById(programId);
      if (!program) {
        return [];
      }
      
      // Get customers for the business and filter by program enrollment
      const response = await businessApi.getCustomers(program.businessId);
      
      if (!response.success) {
        return [];
      }
      
      // Filter customers who are enrolled in this program
      const enrolledCustomers = (response.data || [])
        .filter((customer: any) => 
          customer.programs?.some((p: any) => p.id === programId)
        )
        .map((customer: any) => ({
          customerId: customer.id.toString(),
          customerName: customer.name || 'Customer'
        }));
      
      return enrolledCustomers;
    } catch (error) {
      logger.error('Error getting enrolled customers', { programId, error });
      return [];
    }
  }

  /**
   * Delete a loyalty program and notify enrolled customers
   */
  static async deleteProgram(programId: string): Promise<boolean> {
    try {
      // Get program info before deletion
      const program = await this.getProgramById(programId);
      if (!program) {
        logger.warn('Program not found for deletion', { programId });
        return false;
      }

      const response = await businessApi.deleteProgram(program.businessId, programId);
      
      if (!response.success) {
        logger.error('Failed to delete program', { programId, error: response.error });
        return false;
      }
      
      logger.info('Program deleted successfully', { programId });
      return true;
    } catch (error) {
      logger.error('Error deleting program', { programId, error });
      return false;
    }
  }

  /**
   * Enroll a customer in a loyalty program
   */
  static async enrollCustomer(
    customerId: string,
    programId: string,
    requireApproval: boolean = true
  ): Promise<{ success: boolean; message?: string; error?: string; cardId?: string }> {
    try {
      if (!customerId || !programId) {
        logger.error('Missing required parameters for enrollment', { customerId, programId });
        return { success: false, error: 'Missing required parameters' };
      }

      logger.info('Processing enrollment request', { customerId, programId, requireApproval });

      // Get program details to get business ID
      const program = await this.getProgramById(programId);
      if (!program) {
        logger.error('Program not found', { programId });
        return { success: false, error: 'Program not found' };
      }

      const response = await businessApi.enrollCustomer(program.businessId, {
        customerId,
        programId,
        requireApproval
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Enrollment failed'
        };
      }

      return {
        success: true,
        message: response.message || 'Enrollment successful',
        cardId: response.data?.cardId
      };
    } catch (error) {
      logger.error('Error enrolling customer', { error });
      return { success: false, error: 'An error occurred while enrolling customer' };
    }
  }
  
  /**
   * Handle approval response for enrollment request
   */
  static async handleEnrollmentApproval(
    requestId: string,
    approved: boolean
  ): Promise<{ success: boolean; message?: string; cardId?: string }> {
    try {
      // This requires a notification action endpoint
      const response = await customerApi.get(`/notifications/${requestId}/action?action=${approved ? 'approve' : 'reject'}`);
      
      if (!response.success) {
        return {
          success: false,
          message: response.error || 'Failed to process approval'
        };
      }
      
      return {
        success: true,
        message: approved ? 'Enrollment approved' : 'Enrollment rejected',
        cardId: response.data?.cardId
      };
    } catch (error) {
      logger.error('Error handling enrollment approval', { error });
      return { success: false, message: 'An error occurred while processing the enrollment' };
    }
  }

  /**
   * Get a default loyalty program for a business to use for auto-enrollment
   */
  static async getDefaultBusinessProgram(businessId: string): Promise<LoyaltyProgram | null> {
    try {
      const programs = await this.getBusinessPrograms(businessId);
      
      // Return the first active program
      const activeProgram = programs.find(p => p.status === 'ACTIVE');
      return activeProgram || null;
    } catch (error) {
      logger.error('Error fetching default business program', { businessId, error });
      return null;
    }
  }

  /**
   * Check if a customer is enrolled in a specific loyalty program
   */
  static async checkEnrollment(
    customerId: string, 
    programId: string
  ): Promise<{ isEnrolled: boolean; points?: number }> {
    try {
      // Get customer's programs
      const response = await customerApi.getPrograms(customerId);
      
      if (!response.success) {
        return { isEnrolled: false };
      }
      
      const programs = response.data || [];
      const enrollment = programs.find((p: any) => p.id === programId);
      
      if (enrollment) {
        return {
          isEnrolled: true,
          points: enrollment.currentPoints || 0
        };
      }
      
      return { isEnrolled: false };
    } catch (error) {
      logger.error('Error checking enrollment', { customerId, programId, error });
      return { isEnrolled: false };
    }
  }
  
  /**
   * Check if a customer is enrolled in any loyalty program for a business
   */
  static async checkCustomerEnrollment(
    customerId: string,
    businessId: string
  ): Promise<{ isEnrolled: boolean; programIds?: string[] }> {
    try {
      // Get all programs for the business
      const programs = await this.getBusinessPrograms(businessId);
      
      if (!programs || programs.length === 0) {
        return { isEnrolled: false };
      }
      
      // Check enrollment in each program
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
      logger.error('Error checking customer enrollment', { customerId, businessId, error });
      return { isEnrolled: false };
    }
  }

  /**
   * Get all programs a customer is enrolled in for a specific business
   */
  static async getCustomerEnrolledProgramsForBusiness(
    customerId: string,
    businessId: string
  ): Promise<LoyaltyProgram[]> {
    try {
      // Get all programs for the business
      const allPrograms = await this.getBusinessPrograms(businessId);
      
      if (!allPrograms || allPrograms.length === 0) {
        return [];
      }
      
      // Get customer's enrolled programs
      const response = await customerApi.getPrograms(customerId);
      
      if (!response.success) {
        return [];
      }
      
      const customerPrograms = response.data || [];
      const customerProgramIds = customerPrograms.map((p: any) => p.id);
      
      // Filter business programs to only enrolled ones
      const enrolledPrograms = allPrograms.filter(program => 
        customerProgramIds.includes(program.id)
      );
      
      return enrolledPrograms;
    } catch (error) {
      logger.error('Error fetching customer enrolled programs', { customerId, businessId, error });
      return [];
    }
  }
}

