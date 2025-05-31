import type { Transaction, CustomerProgram, LoyaltyProgram } from '../types/loyalty';
import sql from '../utils/db';

export class TransactionService {
  // Mock data stores
  private static transactions: Transaction[] = [];
  private static customerPrograms: CustomerProgram[] = [];
  private static loyaltyPrograms: LoyaltyProgram[] = [];

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
    points: number
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
      const programIdInt = parseInt(programId);

      // Check if customer is enrolled in program
      const enrollment = await sql`
        SELECT * FROM customer_programs
        WHERE customer_id = ${customerIdInt}
        AND program_id = ${programIdInt}
      `;

      // If not enrolled, enroll them
      if (enrollment.length === 0) {
        await sql`
          INSERT INTO customer_programs (
            customer_id, 
            program_id, 
            current_points,
            enrolled_at
          )
          VALUES (
            ${customerIdInt}, 
            ${programIdInt}, 
            ${points},
            NOW()
          )
        `;
      } else {
        // Update existing points
        await sql`
          UPDATE customer_programs
          SET current_points = current_points + ${points},
              updated_at = NOW()
          WHERE customer_id = ${customerIdInt}
          AND program_id = ${programIdInt}
        `;
      }

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
          ${programIdInt},
          ${points},
          'AWARD',
          NOW()
        )
        RETURNING id
      `;

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
    rewardId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find the program
      const program = this.loyaltyPrograms.find(p => p.id === programId);
      if (!program) {
        return { success: false, error: 'Program not found' };
      }

      // Find the reward
      const reward = program.rewardTiers.find(tier => tier.id === rewardId);
      if (!reward) {
        return { success: false, error: 'Reward not found' };
      }

      // Check if customer has enough points
      const enrollment = this.customerPrograms.find(
        cp => cp.customerId === customerId && cp.programId === programId
      );

      if (!enrollment) {
        return { success: false, error: 'Not enrolled in program' };
      }

      if (enrollment.currentPoints < reward.pointsRequired) {
        return { success: false, error: 'Insufficient points' };
      }

      // Update points balance
      enrollment.currentPoints -= reward.pointsRequired;
      enrollment.lastActivity = new Date().toISOString();

      // Record the redemption
      const transaction: Transaction = {
        id: Date.now().toString(),
        customerId,
        businessId: program.businessId,
        programId,
        type: 'REDEEM',
        points: reward.pointsRequired,
        rewardId,
        createdAt: new Date().toISOString()
      };
      this.transactions.push(transaction);

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async getTransactionHistory(
    customerId: string,
    programId?: string
  ): Promise<{ transactions: Transaction[]; error?: string }> {
    try {
      // Filter transactions by customer ID and program ID (if provided)
      let filteredTransactions = this.transactions.filter(tx => tx.customerId === customerId);
      
      if (programId) {
        filteredTransactions = filteredTransactions.filter(tx => tx.programId === programId);
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
} 