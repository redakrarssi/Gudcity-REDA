import sql from '../_lib/db';

export interface DashboardStats {
  totalUsers?: number;
  totalBusinesses?: number;
  totalCustomers?: number;
  totalTransactions?: number;
  totalPoints?: number;
  activePrograms?: number;
  recentActivity?: any[];
}

export interface CustomerDashboardStats {
  totalPoints: number;
  activeCards: number;
  recentTransactions: number;
  availableRewards: number;
}

export interface BusinessDashboardStats {
  totalCustomers: number;
  activePrograms: number;
  totalPointsAwarded: number;
  totalScans: number;
  recentTransactions: number;
}

/**
 * Server-side service for dashboard data
 * All database operations for dashboard statistics
 */
export class DashboardServerService {
  /**
   * Get admin dashboard statistics
   */
  static async getAdminDashboardStats(): Promise<DashboardStats> {
    try {
      const stats = await sql`
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE user_type = 'business') as total_businesses,
          (SELECT COUNT(*) FROM users WHERE user_type = 'customer') as total_customers,
          (SELECT COUNT(*) FROM point_transactions) as total_transactions,
          (SELECT COALESCE(SUM(points), 0) FROM point_transactions WHERE transaction_type = 'AWARD') as total_points,
          (SELECT COUNT(*) FROM loyalty_programs WHERE is_active = true) as active_programs
      `;

      const recentActivity = await sql`
        SELECT 
          pt.id::text,
          pt.customer_id::text as "customerId",
          pt.business_id::text as "businessId",
          pt.points,
          pt.transaction_type as type,
          pt.created_at as "createdAt",
          u.name as "customerName",
          b.name as "businessName"
        FROM point_transactions pt
        LEFT JOIN users u ON pt.customer_id = u.id
        LEFT JOIN users b ON pt.business_id = b.id
        ORDER BY pt.created_at DESC
        LIMIT 10
      `;

      return {
        totalUsers: parseInt(stats[0].total_users) || 0,
        totalBusinesses: parseInt(stats[0].total_businesses) || 0,
        totalCustomers: parseInt(stats[0].total_customers) || 0,
        totalTransactions: parseInt(stats[0].total_transactions) || 0,
        totalPoints: parseInt(stats[0].total_points) || 0,
        activePrograms: parseInt(stats[0].active_programs) || 0,
        recentActivity
      };
    } catch (error) {
      console.error('Error getting admin dashboard stats:', error);
      return {};
    }
  }

  /**
   * Get customer dashboard statistics
   */
  static async getCustomerDashboardStats(customerId: string): Promise<CustomerDashboardStats> {
    try {
      const customerIdInt = parseInt(customerId);

      const stats = await sql`
        SELECT 
          (SELECT COALESCE(SUM(current_points), 0) FROM customer_programs WHERE customer_id = ${customerIdInt}) as total_points,
          (SELECT COUNT(*) FROM loyalty_cards WHERE customer_id = ${customerIdInt} AND is_active = true) as active_cards,
          (SELECT COUNT(*) FROM point_transactions WHERE customer_id = ${customerIdInt} AND created_at > NOW() - INTERVAL '30 days') as recent_transactions
      `;

      // Count available rewards (rewards that customer has enough points for)
      const rewards = await sql`
        SELECT COUNT(*) as available_rewards
        FROM loyalty_program_rewards r
        INNER JOIN customer_programs cp ON r.program_id = cp.program_id
        WHERE cp.customer_id = ${customerIdInt}
        AND cp.current_points >= r.points_required
        AND r.is_active = true
      `;

      return {
        totalPoints: parseInt(stats[0].total_points) || 0,
        activeCards: parseInt(stats[0].active_cards) || 0,
        recentTransactions: parseInt(stats[0].recent_transactions) || 0,
        availableRewards: parseInt(rewards[0].available_rewards) || 0
      };
    } catch (error) {
      console.error('Error getting customer dashboard stats:', error);
      return {
        totalPoints: 0,
        activeCards: 0,
        recentTransactions: 0,
        availableRewards: 0
      };
    }
  }

  /**
   * Get business dashboard statistics
   */
  static async getBusinessDashboardStats(businessId: string): Promise<BusinessDashboardStats> {
    try {
      const businessIdInt = parseInt(businessId);

      const stats = await sql`
        SELECT 
          (SELECT COUNT(DISTINCT customer_id) FROM loyalty_cards WHERE business_id = ${businessIdInt}) as total_customers,
          (SELECT COUNT(*) FROM loyalty_programs WHERE business_id = ${businessIdInt} AND is_active = true) as active_programs,
          (SELECT COALESCE(SUM(points), 0) FROM point_transactions WHERE business_id = ${businessIdInt} AND transaction_type = 'AWARD') as total_points_awarded,
          (SELECT COUNT(*) FROM qr_scan_logs WHERE scanned_by = ${businessIdInt}) as total_scans,
          (SELECT COUNT(*) FROM point_transactions WHERE business_id = ${businessIdInt} AND created_at > NOW() - INTERVAL '30 days') as recent_transactions
      `;

      return {
        totalCustomers: parseInt(stats[0].total_customers) || 0,
        activePrograms: parseInt(stats[0].active_programs) || 0,
        totalPointsAwarded: parseInt(stats[0].total_points_awarded) || 0,
        totalScans: parseInt(stats[0].total_scans) || 0,
        recentTransactions: parseInt(stats[0].recent_transactions) || 0
      };
    } catch (error) {
      console.error('Error getting business dashboard stats:', error);
      return {
        totalCustomers: 0,
        activePrograms: 0,
        totalPointsAwarded: 0,
        totalScans: 0,
        recentTransactions: 0
      };
    }
  }
}

