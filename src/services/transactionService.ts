import type { Transaction, CustomerProgram, LoyaltyProgram } from '../types/loyalty';

export class TransactionService {
  // Mock data stores
  private static transactions: Transaction[] = [];
  private static customerPrograms: CustomerProgram[] = [];
  private static loyaltyPrograms: LoyaltyProgram[] = [];

  static async awardPoints(
    customerId: string,
    businessId: string,
    programId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string; points?: number }> {
    try {
      // Find the program
      const program = this.loyaltyPrograms.find(p => p.id === programId);
      if (!program) {
        return { success: false, error: 'Program not found' };
      }

      const pointsToAward = Math.floor(amount * (program.pointValue || 1));

      // Get or create customer program enrollment
      let enrollment = this.customerPrograms.find(
        cp => cp.customerId === customerId && cp.programId === programId
      );

      if (!enrollment) {
        // Create new enrollment
        enrollment = {
          id: Date.now().toString(),
          customerId,
          programId,
          currentPoints: pointsToAward,
          lastActivity: new Date().toISOString(),
          enrolledAt: new Date().toISOString()
        };
        this.customerPrograms.push(enrollment);
      } else {
        // Update existing enrollment
        enrollment.currentPoints += pointsToAward;
        enrollment.lastActivity = new Date().toISOString();
      }

      // Record the transaction
      const transaction: Transaction = {
        id: Date.now().toString(),
        customerId,
        businessId,
        programId,
        type: 'EARN',
        points: pointsToAward,
        amount,
        createdAt: new Date().toISOString()
      };
      this.transactions.push(transaction);

      return { success: true, points: pointsToAward };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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