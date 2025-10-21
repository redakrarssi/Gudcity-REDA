import sql from '../_lib/db';
import { NotificationService } from './notificationServerService';

export interface Transaction {
  id: string;
  customerId: string;
  businessId: string;
  programId: string;
  type: 'AWARD' | 'REDEEM';
  points: number;
  rewardId?: string;
  createdAt: Date;
}

export interface TransactionFilter {
  customerId?: string;
  businessId?: string;
  programId?: string;
  startDate?: Date;
  endDate?: Date;
  type?: 'AWARD' | 'REDEEM';
}

export interface Redemption {
  id: string;
  customerId: string;
  programId: string;
  rewardId: string;
  pointsUsed: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
}

/**
 * Server-side service for handling transactions
 * All database operations for transactions
 */
export class TransactionServerService {
  /**
   * Award points to a customer
   */
  static async awardPoints(
    customerId: string,
    businessId: string,
    programId: string,
    points: number,
    source: string,
    description?: string
  ): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
    try {
      // Validate inputs
      const customerIdInt = parseInt(customerId);
      const businessIdInt = parseInt(businessId);
      const programIdInt = parseInt(programId);

      if (isNaN(customerIdInt) || isNaN(businessIdInt) || isNaN(programIdInt)) {
        return { success: false, error: 'Invalid ID format' };
      }

      if (points <= 0) {
        return { success: false, error: 'Points must be greater than 0' };
      }

      if (points > 10000) {
        return { success: false, error: 'Cannot award more than 10,000 points at once' };
      }

      // Check if customer is enrolled in the program
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
      const transactionResult = await sql`
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
        RETURNING id, customer_id, business_id, program_id, points, transaction_type as type, created_at
      `;

      const transaction: Transaction = {
        id: transactionResult[0].id.toString(),
        customerId: transactionResult[0].customer_id.toString(),
        businessId: transactionResult[0].business_id.toString(),
        programId: transactionResult[0].program_id.toString(),
        type: 'AWARD',
        points: transactionResult[0].points,
        createdAt: transactionResult[0].created_at
      };

      // Send notification to customer
      try {
        await NotificationService.createNotification({
          userId: customerId,
          type: 'points_earned',
          title: 'Points Earned',
          message: `You earned ${points} points! ${description || ''}`,
          metadata: {
            points,
            businessId,
            programId,
            source
          }
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
        // Don't fail the transaction if notification fails
      }

      return { success: true, transaction };
    } catch (error) {
      console.error('Error awarding points:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all transactions with optional filters
   */
  static async getTransactions(filters: TransactionFilter): Promise<Transaction[]> {
    try {
      let conditions = [];
      let params: any[] = [];

      if (filters.customerId) {
        conditions.push(`customer_id = ${parseInt(filters.customerId)}`);
      }

      if (filters.businessId) {
        conditions.push(`business_id = ${parseInt(filters.businessId)}`);
      }

      if (filters.programId) {
        conditions.push(`program_id = ${parseInt(filters.programId)}`);
      }

      if (filters.type) {
        conditions.push(`transaction_type = '${filters.type}'`);
      }

      if (filters.startDate) {
        conditions.push(`created_at >= '${filters.startDate.toISOString()}'`);
      }

      if (filters.endDate) {
        conditions.push(`created_at <= '${filters.endDate.toISOString()}'`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await sql.unsafe(`
        SELECT 
          id::text, 
          customer_id::text as "customerId", 
          business_id::text as "businessId", 
          program_id::text as "programId", 
          transaction_type as type, 
          points, 
          reward_id::text as "rewardId",
          created_at as "createdAt"
        FROM point_transactions
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT 1000
      `);

      return result as unknown as Transaction[];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  /**
   * Get customer transactions
   */
  static async getCustomerTransactions(
    customerId: string,
    programId?: string
  ): Promise<Transaction[]> {
    try {
      const customerIdInt = parseInt(customerId);

      if (programId) {
        const programIdInt = parseInt(programId);
        const result = await sql`
          SELECT 
            id::text, 
            customer_id::text as "customerId", 
            business_id::text as "businessId", 
            program_id::text as "programId", 
            transaction_type as type, 
            points, 
            reward_id::text as "rewardId",
            created_at as "createdAt"
          FROM point_transactions
          WHERE customer_id = ${customerIdInt}
          AND program_id = ${programIdInt}
          ORDER BY created_at DESC
        `;
        return result as unknown as Transaction[];
      } else {
        const result = await sql`
          SELECT 
            id::text, 
            customer_id::text as "customerId", 
            business_id::text as "businessId", 
            program_id::text as "programId", 
            transaction_type as type, 
            points, 
            reward_id::text as "rewardId",
            created_at as "createdAt"
          FROM point_transactions
          WHERE customer_id = ${customerIdInt}
          ORDER BY created_at DESC
        `;
        return result as unknown as Transaction[];
      }
    } catch (error) {
      console.error('Error getting customer transactions:', error);
      return [];
    }
  }

  /**
   * Redeem a reward
   */
  static async redeemReward(
    customerId: string,
    programId: string,
    rewardId: string,
    pointsRequired: number
  ): Promise<{ success: boolean; redemption?: Redemption; error?: string }> {
    try {
      const customerIdInt = parseInt(customerId);
      const programIdInt = parseInt(programId);
      const rewardIdInt = parseInt(rewardId);

      // Check if customer has enough points
      const enrollment = await sql`
        SELECT current_points FROM customer_programs
        WHERE customer_id = ${customerIdInt}
        AND program_id = ${programIdInt}
      `;

      if (enrollment.length === 0) {
        return { success: false, error: 'Customer not enrolled in program' };
      }

      const currentPoints = enrollment[0].current_points || 0;

      if (currentPoints < pointsRequired) {
        return { success: false, error: 'Insufficient points' };
      }

      // Deduct points
      await sql`
        UPDATE customer_programs
        SET current_points = current_points - ${pointsRequired},
            updated_at = NOW()
        WHERE customer_id = ${customerIdInt}
        AND program_id = ${programIdInt}
      `;

      // Get business_id from the program
      const program = await sql`
        SELECT business_id FROM loyalty_programs WHERE id = ${programIdInt}
      `;

      const businessId = program[0]?.business_id;

      // Record the redemption transaction
      const transactionResult = await sql`
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
          ${businessId},
          ${programIdInt},
          ${pointsRequired},
          'REDEEM',
          ${rewardIdInt},
          NOW()
        )
        RETURNING id, customer_id, program_id, reward_id, points, created_at
      `;

      const redemption: Redemption = {
        id: transactionResult[0].id.toString(),
        customerId: transactionResult[0].customer_id.toString(),
        programId: transactionResult[0].program_id.toString(),
        rewardId: transactionResult[0].reward_id.toString(),
        pointsUsed: transactionResult[0].points,
        status: 'COMPLETED',
        createdAt: transactionResult[0].created_at
      };

      // Send notification
      try {
        await NotificationService.createNotification({
          userId: customerId,
          type: 'reward_redeemed',
          title: 'Reward Redeemed',
          message: `You've redeemed a reward for ${pointsRequired} points!`,
          metadata: {
            pointsUsed: pointsRequired,
            programId,
            rewardId
          }
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }

      return { success: true, redemption };
    } catch (error) {
      console.error('Error redeeming reward:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get transaction statistics for a business
   */
  static async getBusinessTransactionStats(
    businessId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalTransactions: number;
    totalPointsAwarded: number;
    totalPointsRedeemed: number;
    uniqueCustomers: number;
  }> {
    try {
      const businessIdInt = parseInt(businessId);
      
      let dateFilter = '';
      if (startDate && endDate) {
        dateFilter = `AND created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'`;
      }

      const stats = await sql.unsafe(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN transaction_type = 'AWARD' THEN points ELSE 0 END) as total_points_awarded,
          SUM(CASE WHEN transaction_type = 'REDEEM' THEN points ELSE 0 END) as total_points_redeemed,
          COUNT(DISTINCT customer_id) as unique_customers
        FROM point_transactions
        WHERE business_id = ${businessIdInt}
        ${dateFilter}
      `);

      return {
        totalTransactions: parseInt(stats[0].total_transactions) || 0,
        totalPointsAwarded: parseInt(stats[0].total_points_awarded) || 0,
        totalPointsRedeemed: parseInt(stats[0].total_points_redeemed) || 0,
        uniqueCustomers: parseInt(stats[0].unique_customers) || 0
      };
    } catch (error) {
      console.error('Error getting business transaction stats:', error);
      return {
        totalTransactions: 0,
        totalPointsAwarded: 0,
        totalPointsRedeemed: 0,
        uniqueCustomers: 0
      };
    }
  }
}

