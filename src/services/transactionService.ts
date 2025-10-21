import type { Transaction, CustomerProgram, LoyaltyProgram } from '../types/loyalty';
import { NotificationService } from './notificationService';
import { 
  apiAwardPoints, 
  apiGetCustomerTransactions, 
  apiRedeemReward 
} from './apiClient';

// SECURITY: Always use API in production, no direct database access
const USE_API = true;

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
    points: number,
    businessName?: string,
    programName?: string
  ): Promise<{ success: boolean; error?: string; points?: number; warnings?: string[] }> {
    try {
      const description = `Points awarded${businessName ? ` by ${businessName}` : ''}`;
      const result = await apiAwardPoints(customerId, programId, points, description);
      
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
        points: points,
        warnings: []
      };
    } catch (error: any) {
      console.error('API award points failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to award points. Please try again.'
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
      // Note: The API endpoint should handle getting reward details and points required
      // For now, pass a default points value - the API will validate the actual points required
      const result = await apiRedeemReward(customerId, programId, rewardId, 0);
      return { success: true };
    } catch (error: any) {
      console.error('Error redeeming reward:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to redeem reward. Please try again.'
      };
    }
  }

  static async getTransactionHistory(
    customerId: string,
    programId?: string
  ): Promise<{ transactions: Transaction[]; error?: string }> {
    try {
      const result = await apiGetCustomerTransactions(customerId, programId);
      if (result && result.transactions) {
        return { transactions: result.transactions };
      }
      return { transactions: [] };
    } catch (error: any) {
      console.error('Error getting transaction history:', error);
      return { 
        transactions: [],
        error: error.message || 'Failed to load transaction history'
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
  
} 