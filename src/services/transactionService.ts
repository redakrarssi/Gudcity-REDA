import type { Transaction, CustomerProgram, LoyaltyProgram } from '../types/loyalty';
import sql from '../utils/db';
import { NotificationService } from './notificationService';
import { logger } from '../utils/logger';

/**
 * CRITICAL RESTRICTION: NO AUTOMATIC ENROLLMENT ALLOWED
 * 
 * This service STRICTLY enforces that ALL customers (old, new, future) 
 * can ONLY be enrolled when they explicitly accept program invitations.
 * 
 * Sending points to a customer will NEVER automatically enroll them.
 * The old workaround where sending points created enrollments is BLOCKED.
 * 
 * Enrollment flow:
 * 1. Business sends program invitation
 * 2. Customer explicitly accepts invitation
 * 3. Enrollment + card created atomically
 * 4. THEN points can be awarded
 */
export class TransactionService {
  // Mock data stores
  private static transactions: Transaction[] = [];
  private static customerPrograms: CustomerProgram[] = [];
  private static loyaltyPrograms: LoyaltyProgram[] = [];

  /**
   * CRITICAL FIX: Validate enrollment before awarding points
   * This prevents the workaround that was causing issues with Customer ID 4 & 27
   */
  private static async validateEnrollmentForPoints(
    customerId: number,
    programId: string
  ): Promise<{ isEnrolled: boolean; enrollmentStatus: string; error?: string }> {
    try {
      // Use the database function to validate enrollment
      const validationResult = await sql`
        SELECT validate_enrollment_for_points(${customerId}, ${programId}) as result
      `;
      
      if (!validationResult || validationResult.length === 0) {
        logger.error('Failed to call validate_enrollment_for_points function');
        return { 
          isEnrolled: false, 
          enrollmentStatus: 'UNKNOWN',
          error: 'Database validation function failed' 
        };
      }
      
      const result = validationResult[0].result;
      
      return {
        isEnrolled: result.is_enrolled,
        enrollmentStatus: result.enrollment_status,
        error: result.is_enrolled ? undefined : 'Customer not enrolled in program'
      };
    } catch (error) {
      logger.error('Error validating enrollment for points', { customerId, programId, error });
      return { 
        isEnrolled: false, 
        enrollmentStatus: 'ERROR',
        error: 'Validation error occurred' 
      };
    }
  }

  /**
   * Award loyalty points to a customer
   * @param customerId ID of the customer receiving points
   * @param businessId ID of the business awarding points
   * @param programId ID of the loyalty program
   * @param points Number of points to award
   */
  static async awardPoints(
    customerId: string,
    businessId: string,
    programId: string,
    points: number,
    businessName?: string,
    programName?: string
  ): Promise<{ success: boolean; error?: string; points?: number }> {
    try {
      // Validate inputs
      if (!customerId || !businessId || !programId || points <= 0) {
        return {
          success: false,
          error: 'Invalid input parameters'
        };
      }

      // Convert IDs to integers for database
      const customerIdInt = parseInt(customerId);
      const businessIdInt = parseInt(businessId);

      // CRITICAL FIX: STRICT enrollment validation - NO automatic enrollment
      // ALL customers (old, new, future) must explicitly accept program invitations
      const enrollmentValidation = await this.validateEnrollmentForPoints(customerIdInt, programId);
      
      if (!enrollmentValidation.isEnrolled) {
        logger.warn('Point awarding BLOCKED - customer not enrolled', {
          customerId: customerIdInt,
          programId,
          enrollmentStatus: enrollmentValidation.enrollmentStatus,
          error: enrollmentValidation.error
        });
        
        return {
          success: false,
          error: `Cannot award points: Customer must first accept an invitation to join this loyalty program. Current status: ${enrollmentValidation.enrollmentStatus}`
        };
      }

      logger.info('Enrollment validation passed, proceeding with point awarding', {
        customerId: customerIdInt,
        programId,
        enrollmentStatus: enrollmentValidation.enrollmentStatus
      });

      // Double-check enrollment exists (should not happen due to validation above)
      const enrollment = await sql`
        SELECT * FROM program_enrollments
        WHERE customer_id = ${customerIdInt}
        AND program_id = ${programId}
        AND status = 'ACTIVE'
      `;

      if (enrollment.length === 0) {
        logger.error('Enrollment validation passed but enrollment not found - data inconsistency', {
          customerId: customerIdInt,
          programId
        });
        
        return {
          success: false,
          error: 'Data inconsistency detected: Enrollment validation passed but enrollment not found'
        };
      }

      // Get the loyalty card for this customer/program
      const loyaltyCard = await sql`
        SELECT id, points, points_balance, total_points_earned
        FROM loyalty_cards
        WHERE customer_id = ${customerIdInt}
        AND program_id = ${programId}
        AND is_active = true
        LIMIT 1
      `;

      if (loyaltyCard.length === 0) {
        logger.error('Loyalty card not found for enrolled customer', {
          customerId: customerIdInt,
          programId
        });
        
        return {
          success: false,
          error: 'Loyalty card not found for enrolled customer'
        };
      }

      const card = loyaltyCard[0];

      // Update loyalty card points
      await sql`
        UPDATE loyalty_cards
        SET points = points + ${points},
            points_balance = points_balance + ${points},
            total_points_earned = total_points_earned + ${points},
            updated_at = NOW()
        WHERE id = ${card.id}
      `;

      // Update program enrollment points
      await sql`
        UPDATE program_enrollments
        SET current_points = current_points + ${points},
            total_points_earned = total_points_earned + ${points},
            updated_at = NOW()
        WHERE customer_id = ${customerIdInt}
        AND program_id = ${programId}
        AND status = 'ACTIVE'
      `;

      // Record the transaction
      const transaction = await sql`
        INSERT INTO point_transactions (
          customer_id,
          business_id,
          program_id,
          points,
          transaction_type,
          created_at
        )
        VALUES (
          ${customerIdInt},
          ${businessIdInt},
          ${programId},
          ${points},
          'AWARD',
          NOW()
        )
        RETURNING id
      `;

      // Get business and program names if not provided
      const actualBusinessName = businessName || await this.getBusinessName(businessId);
      const actualProgramName = programName || await this.getProgramName(programId);

      // Send notification to customer
      await NotificationService.sendTransactionConfirmation(
        customerId,
        'EARN',
        points,
        actualBusinessName,
        actualProgramName
      );

      // Broadcast a localStorage event so other tabs (e.g., customer dashboard) can refresh loyalty cards
      try {
        const storageKey = `cards_update_${customerId}`;
        localStorage.setItem(storageKey, Date.now().toString());
        // Optionally clean up to avoid quota issues
        setTimeout(() => {
          try {
            localStorage.removeItem(storageKey);
          } catch (_) {
            /* ignore */
          }
        }, 5000);
      } catch (e) {
        // localStorage might be unavailable (SSR), ignore silently
      }

      return {
        success: true,
        points: points
      };
    } catch (error) {
      console.error('Error awarding points:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async redeemReward(
    customerId: string,
    programId: string,
    rewardId: string,
    businessName?: string,
    programName?: string,
    rewardName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Convert IDs to integers for database
      const customerIdInt = parseInt(customerId);
      const programIdInt = parseInt(programId);
      
      // First get the reward details from the database or mock data
      let pointsRequired = 0;
      let businessId = '';

      // Try to get reward details from database
      try {
        const rewardResult = await sql`
          SELECT 
            r.points_required as "pointsRequired",
            p.business_id::text as "businessId"
          FROM loyalty_program_rewards r
          JOIN loyalty_programs p ON r.program_id = p.id
          WHERE r.id = ${parseInt(rewardId)}
          AND p.id = ${programIdInt}
        `;
        
        if (rewardResult && rewardResult.length > 0) {
          pointsRequired = rewardResult[0].pointsRequired;
          businessId = rewardResult[0].businessId;
        } else {
          // Fall back to mock data if no database results
          const program = this.loyaltyPrograms.find(p => p.id === programId);
          if (!program) {
            return { success: false, error: 'Program not found' };
          }
          
          const reward = program.rewardTiers.find(tier => tier.id === rewardId);
          if (!reward) {
            return { success: false, error: 'Reward not found' };
          }
          
          pointsRequired = reward.pointsRequired;
          businessId = program.businessId;
        }
      } catch (err) {
        // Fall back to mock data if database query fails
        const program = this.loyaltyPrograms.find(p => p.id === programId);
        if (!program) {
          return { success: false, error: 'Program not found' };
        }
        
        const reward = program.rewardTiers.find(tier => tier.id === rewardId);
        if (!reward) {
          return { success: false, error: 'Reward not found' };
        }
        
        pointsRequired = reward.pointsRequired;
        businessId = program.businessId;
      }

      // Check if customer has enough points
      let hasEnoughPoints = false;
      let currentPoints = 0;

      try {
        const pointsResult = await sql`
          SELECT current_points as "currentPoints"
          FROM customer_programs
          WHERE customer_id = ${customerIdInt}
          AND program_id = ${programIdInt}
        `;
        
        if (pointsResult && pointsResult.length > 0) {
          currentPoints = pointsResult[0].currentPoints;
          hasEnoughPoints = currentPoints >= pointsRequired;
        } else {
          // Fall back to mock data
          const enrollment = this.customerPrograms.find(
            cp => cp.customerId === customerId && cp.programId === programId
          );
          
          if (!enrollment) {
            return { success: false, error: 'Not enrolled in program' };
          }
          
          currentPoints = enrollment.currentPoints;
          hasEnoughPoints = currentPoints >= pointsRequired;
        }
      } catch (err) {
        // Fall back to mock data
        const enrollment = this.customerPrograms.find(
          cp => cp.customerId === customerId && cp.programId === programId
        );
        
        if (!enrollment) {
          return { success: false, error: 'Not enrolled in program' };
        }
        
        currentPoints = enrollment.currentPoints;
        hasEnoughPoints = currentPoints >= pointsRequired;
      }

      if (!hasEnoughPoints) {
        return { success: false, error: 'Insufficient points' };
      }

      // Update points balance and record the transaction
      try {
        // Update customer's points balance
        await sql`
          UPDATE customer_programs
          SET current_points = current_points - ${pointsRequired},
              updated_at = NOW()
          WHERE customer_id = ${customerIdInt}
          AND program_id = ${programIdInt}
        `;
        
        // Record the transaction
        const businessIdInt = parseInt(businessId);
        await sql`
          INSERT INTO point_transactions (
            customer_id,
            business_id,
            program_id,
            points,
            transaction_type,
            reward_id,
            created_at
          )
          VALUES (
            ${customerIdInt},
            ${businessIdInt},
            ${programIdInt},
            ${pointsRequired},
            'REDEEM',
            ${parseInt(rewardId)},
            NOW()
          )
        `;
      } catch (err) {
        console.error('Error updating database:', err);
        
        // Fall back to in-memory updates
        const enrollment = this.customerPrograms.find(
          cp => cp.customerId === customerId && cp.programId === programId
        );
        
        if (enrollment) {
          enrollment.currentPoints -= pointsRequired;
          enrollment.lastActivity = new Date().toISOString();
        }
        
        // Record the redemption in memory
        const transaction: Transaction = {
          id: Date.now().toString(),
          customerId,
          businessId,
          programId,
          type: 'REDEEM',
          points: pointsRequired,
          rewardId,
          createdAt: new Date().toISOString()
        };
        this.transactions.push(transaction);
      }
      
      // Get business and program names if not provided
      const actualBusinessName = businessName || await this.getBusinessName(businessId);
      const actualProgramName = programName || await this.getProgramName(programId);
      const actualRewardName = rewardName || await this.getRewardName(rewardId);

      // Send notification to customer
      await NotificationService.sendTransactionConfirmation(
        customerId,
        'REDEEM',
        pointsRequired,
        actualBusinessName,
        actualProgramName,
        actualRewardName
      );

      return { success: true };
    } catch (error) {
      console.error('Error redeeming reward:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async getTransactionHistory(
    customerId: string,
    programId?: string
  ): Promise<{ transactions: Transaction[]; error?: string }> {
    try {
      // Convert customerId to integer for database
      const customerIdInt = parseInt(customerId);
      let query;
      
      // Use SQL if database is available
      try {
        if (programId) {
          const programIdInt = parseInt(programId);
          query = await sql`
            SELECT 
              id::text, 
              customer_id::text as "customerId", 
              business_id::text as "businessId", 
              program_id::text as "programId", 
              transaction_type as "type", 
              points, 
              reward_id::text as "rewardId",
              created_at as "createdAt"
            FROM point_transactions
            WHERE customer_id = ${customerIdInt}
            AND program_id = ${programIdInt}
            ORDER BY created_at DESC
          `;
        } else {
          query = await sql`
            SELECT 
              id::text, 
              customer_id::text as "customerId", 
              business_id::text as "businessId", 
              program_id::text as "programId", 
              transaction_type as "type", 
              points, 
              reward_id::text as "rewardId",
              created_at as "createdAt"
            FROM point_transactions
            WHERE customer_id = ${customerIdInt}
            ORDER BY created_at DESC
          `;
        }
        
        // If we got results from the database, return them
        if (query && query.length > 0) {
          return { transactions: query as unknown as Transaction[] };
        }
      } catch (err) {
        console.log("Database query failed, falling back to mock data", err);
        // Fall back to mock data if database query fails
      }
      
      // If no database results or database query failed, use mock data
      // Filter transactions by customer ID and program ID (if provided)
      let filteredTransactions = this.transactions.filter(tx => tx.customerId === customerId);
      
      if (programId) {
        filteredTransactions = filteredTransactions.filter(tx => tx.programId === programId);
      }
      
      // If we have no transactions in memory and no DB results, create mock data
      if (filteredTransactions.length === 0) {
        // Add mock data for testing purposes
        this.initMockTransactions(customerId);
        filteredTransactions = this.transactions.filter(tx => tx.customerId === customerId);
      }
      
      // Sort by creation date (newest first)
      filteredTransactions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return { transactions: filteredTransactions };
    } catch (error) {
      return { 
        transactions: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Method to initialize mock data for testing
  static initMockData(
    loyaltyPrograms: LoyaltyProgram[],
    customerPrograms: CustomerProgram[] = [],
    transactions: Transaction[] = []
  ) {
    this.loyaltyPrograms = [...loyaltyPrograms];
    this.customerPrograms = [...customerPrograms];
    this.transactions = [...transactions];
  }
  
  // Method to initialize mock transaction data for testing
  private static initMockTransactions(customerId: string): void {
    const dayInMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    
    // Create at least 10 mock transactions
    const mockTransactions: Transaction[] = [
      {
        id: '1001',
        customerId,
        businessId: '1',
        programId: '101',
        type: 'EARN',
        points: 10,
        createdAt: new Date(now.getTime() - (1 * dayInMs)).toISOString()
      },
      {
        id: '1002',
        customerId,
        businessId: '1',
        programId: '101',
        type: 'EARN',
        points: 15,
        createdAt: new Date(now.getTime() - (2 * dayInMs)).toISOString()
      },
      {
        id: '1003',
        customerId,
        businessId: '1',
        programId: '101',
        type: 'EARN',
        points: 5,
        createdAt: new Date(now.getTime() - (3 * dayInMs)).toISOString()
      },
      {
        id: '1004',
        customerId,
        businessId: '1',
        programId: '101',
        type: 'REDEEM',
        points: 20,
        rewardId: '201',
        createdAt: new Date(now.getTime() - (4 * dayInMs)).toISOString()
      },
      {
        id: '1005',
        customerId,
        businessId: '2',
        programId: '102',
        type: 'EARN',
        points: 25,
        createdAt: new Date(now.getTime() - (6 * dayInMs)).toISOString()
      },
      {
        id: '1006',
        customerId,
        businessId: '2',
        programId: '102',
        type: 'EARN',
        points: 15,
        createdAt: new Date(now.getTime() - (8 * dayInMs)).toISOString()
      },
      {
        id: '1007',
        customerId,
        businessId: '2',
        programId: '102',
        type: 'REDEEM',
        points: 30,
        rewardId: '202',
        createdAt: new Date(now.getTime() - (10 * dayInMs)).toISOString()
      },
      {
        id: '1008',
        customerId,
        businessId: '3',
        programId: '103',
        type: 'EARN',
        points: 50,
        createdAt: new Date(now.getTime() - (20 * dayInMs)).toISOString()
      },
      {
        id: '1009',
        customerId,
        businessId: '3',
        programId: '103',
        type: 'EARN',
        points: 25,
        createdAt: new Date(now.getTime() - (25 * dayInMs)).toISOString()
      },
      {
        id: '1010',
        customerId,
        businessId: '3',
        programId: '103',
        type: 'REDEEM',
        points: 75,
        rewardId: '203',
        createdAt: new Date(now.getTime() - (30 * dayInMs)).toISOString()
      }
    ];
    
    // Add the mock transactions to the transactions array
    this.transactions.push(...mockTransactions);
  }
  
  // Helper methods for getting business, program and reward names
  private static async getBusinessName(businessId: string): Promise<string> {
    try {
      // Try to get from database
      const result = await sql`
        SELECT name FROM businesses
        WHERE id = ${parseInt(businessId)}
      `;
      
      if (result && result.length > 0) {
        return result[0].name;
      }
      
      // Fallback to mock data
      return "Business #" + businessId;
    } catch (error) {
      return "Business #" + businessId;
    }
  }
  
  private static async getProgramName(programId: string): Promise<string> {
    try {
      // Try to get from database
      const result = await sql`
        SELECT name FROM loyalty_programs
        WHERE id = ${parseInt(programId)}
      `;
      
      if (result && result.length > 0) {
        return result[0].name;
      }
      
      // Fallback to mock data
      const program = this.loyaltyPrograms.find(p => p.id === programId);
      return program?.name || "Loyalty Program #" + programId;
    } catch (error) {
      return "Loyalty Program #" + programId;
    }
  }
  
  private static async getRewardName(rewardId: string): Promise<string> {
    try {
      // Try to get from database
      const result = await sql`
        SELECT reward_name FROM loyalty_program_rewards
        WHERE id = ${parseInt(rewardId)}
      `;
      
      if (result && result.length > 0) {
        return result[0].reward_name;
      }
      
      // Fallback to mock reward name
      return "Reward #" + rewardId;
    } catch (error) {
      return "Reward #" + rewardId;
    }
  }
} 