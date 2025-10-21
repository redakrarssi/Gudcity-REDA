import sql from '../_lib/db';

export interface AnalyticsData {
  date: string;
  value: number;
  label?: string;
}

export interface BusinessAnalytics {
  totalCustomers: number;
  activeCustomers: number;
  totalTransactions: number;
  totalPointsAwarded: number;
  totalPointsRedeemed: number;
  averagePointsPerCustomer: number;
  topPrograms: Array<{
    programId: string;
    programName: string;
    customerCount: number;
    pointsAwarded: number;
  }>;
  recentActivity: AnalyticsData[];
}

export interface CustomerAnalytics {
  totalPoints: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  programCount: number;
  transactionCount: number;
  recentTransactions: AnalyticsData[];
}

/**
 * Server-side service for handling analytics
 * All database operations for analytics
 */
export class AnalyticsServerService {
  /**
   * Get business analytics
   */
  static async getBusinessAnalytics(
    businessId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<BusinessAnalytics> {
    try {
      const businessIdInt = parseInt(businessId);

      let dateFilter = '';
      if (startDate && endDate) {
        dateFilter = `AND created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'`;
      }

      // Get total and active customers
      const customerStats = await sql.unsafe(`
        SELECT 
          COUNT(DISTINCT cp.customer_id) as total_customers,
          COUNT(DISTINCT CASE WHEN cp.updated_at > NOW() - INTERVAL '30 days' THEN cp.customer_id END) as active_customers
        FROM customer_programs cp
        JOIN loyalty_programs lp ON cp.program_id = lp.id
        WHERE lp.business_id = ${businessIdInt}
      `);

      // Get transaction stats
      const transactionStats = await sql.unsafe(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN transaction_type = 'AWARD' THEN points ELSE 0 END) as total_points_awarded,
          SUM(CASE WHEN transaction_type = 'REDEEM' THEN points ELSE 0 END) as total_points_redeemed
        FROM point_transactions
        WHERE business_id = ${businessIdInt}
        ${dateFilter}
      `);

      // Calculate average points per customer
      const totalCustomers = parseInt(customerStats[0]?.total_customers) || 1;
      const totalPointsAwarded = parseInt(transactionStats[0]?.total_points_awarded) || 0;
      const averagePointsPerCustomer = Math.round(totalPointsAwarded / totalCustomers);

      // Get top programs
      const topPrograms = await sql.unsafe(`
        SELECT 
          lp.id as program_id,
          lp.name as program_name,
          COUNT(DISTINCT cp.customer_id) as customer_count,
          COALESCE(SUM(pt.points), 0) as points_awarded
        FROM loyalty_programs lp
        LEFT JOIN customer_programs cp ON lp.id = cp.program_id
        LEFT JOIN point_transactions pt ON lp.id = pt.program_id AND pt.transaction_type = 'AWARD'
        WHERE lp.business_id = ${businessIdInt}
        GROUP BY lp.id, lp.name
        ORDER BY customer_count DESC
        LIMIT 5
      `);

      // Get recent activity (last 30 days)
      const recentActivity = await sql.unsafe(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as value
        FROM point_transactions
        WHERE business_id = ${businessIdInt}
        AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      return {
        totalCustomers: parseInt(customerStats[0]?.total_customers) || 0,
        activeCustomers: parseInt(customerStats[0]?.active_customers) || 0,
        totalTransactions: parseInt(transactionStats[0]?.total_transactions) || 0,
        totalPointsAwarded: totalPointsAwarded,
        totalPointsRedeemed: parseInt(transactionStats[0]?.total_points_redeemed) || 0,
        averagePointsPerCustomer,
        topPrograms: topPrograms.map(p => ({
          programId: p.program_id.toString(),
          programName: p.program_name,
          customerCount: parseInt(p.customer_count) || 0,
          pointsAwarded: parseInt(p.points_awarded) || 0
        })),
        recentActivity: recentActivity.map(a => ({
          date: a.date.toISOString().split('T')[0],
          value: parseInt(a.value) || 0
        }))
      };
    } catch (error) {
      console.error('Error getting business analytics:', error);
      return {
        totalCustomers: 0,
        activeCustomers: 0,
        totalTransactions: 0,
        totalPointsAwarded: 0,
        totalPointsRedeemed: 0,
        averagePointsPerCustomer: 0,
        topPrograms: [],
        recentActivity: []
      };
    }
  }

  /**
   * Get customer analytics
   */
  static async getCustomerAnalytics(
    customerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CustomerAnalytics> {
    try {
      const customerIdInt = parseInt(customerId);

      let dateFilter = '';
      if (startDate && endDate) {
        dateFilter = `AND created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'`;
      }

      // Get total points across all programs
      const pointsStats = await sql.unsafe(`
        SELECT 
          COALESCE(SUM(current_points), 0) as total_points
        FROM customer_programs
        WHERE customer_id = ${customerIdInt}
      `);

      // Get transaction stats
      const transactionStats = await sql.unsafe(`
        SELECT 
          COUNT(*) as transaction_count,
          SUM(CASE WHEN transaction_type = 'AWARD' THEN points ELSE 0 END) as total_points_earned,
          SUM(CASE WHEN transaction_type = 'REDEEM' THEN points ELSE 0 END) as total_points_redeemed
        FROM point_transactions
        WHERE customer_id = ${customerIdInt}
        ${dateFilter}
      `);

      // Get program count
      const programCount = await sql.unsafe(`
        SELECT COUNT(*) as program_count
        FROM customer_programs
        WHERE customer_id = ${customerIdInt}
      `);

      // Get recent transactions (last 30 days)
      const recentTransactions = await sql.unsafe(`
        SELECT 
          DATE(created_at) as date,
          SUM(points) as value,
          transaction_type as label
        FROM point_transactions
        WHERE customer_id = ${customerIdInt}
        AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at), transaction_type
        ORDER BY date DESC
        LIMIT 30
      `);

      return {
        totalPoints: parseInt(pointsStats[0]?.total_points) || 0,
        totalPointsEarned: parseInt(transactionStats[0]?.total_points_earned) || 0,
        totalPointsRedeemed: parseInt(transactionStats[0]?.total_points_redeemed) || 0,
        programCount: parseInt(programCount[0]?.program_count) || 0,
        transactionCount: parseInt(transactionStats[0]?.transaction_count) || 0,
        recentTransactions: recentTransactions.map(t => ({
          date: t.date.toISOString().split('T')[0],
          value: parseInt(t.value) || 0,
          label: t.label
        }))
      };
    } catch (error) {
      console.error('Error getting customer analytics:', error);
      return {
        totalPoints: 0,
        totalPointsEarned: 0,
        totalPointsRedeemed: 0,
        programCount: 0,
        transactionCount: 0,
        recentTransactions: []
      };
    }
  }

  /**
   * Get program analytics
   */
  static async getProgramAnalytics(
    programId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    totalPointsAwarded: number;
    totalPointsRedeemed: number;
    averagePointsPerCustomer: number;
  }> {
    try {
      const programIdInt = parseInt(programId);

      let dateFilter = '';
      if (startDate && endDate) {
        dateFilter = `AND created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'`;
      }

      // Get customer stats
      const customerStats = await sql.unsafe(`
        SELECT 
          COUNT(*) as total_customers,
          COUNT(CASE WHEN updated_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_customers
        FROM customer_programs
        WHERE program_id = ${programIdInt}
      `);

      // Get transaction stats
      const transactionStats = await sql.unsafe(`
        SELECT 
          SUM(CASE WHEN transaction_type = 'AWARD' THEN points ELSE 0 END) as total_points_awarded,
          SUM(CASE WHEN transaction_type = 'REDEEM' THEN points ELSE 0 END) as total_points_redeemed
        FROM point_transactions
        WHERE program_id = ${programIdInt}
        ${dateFilter}
      `);

      const totalCustomers = parseInt(customerStats[0]?.total_customers) || 1;
      const totalPointsAwarded = parseInt(transactionStats[0]?.total_points_awarded) || 0;

      return {
        totalCustomers,
        activeCustomers: parseInt(customerStats[0]?.active_customers) || 0,
        totalPointsAwarded,
        totalPointsRedeemed: parseInt(transactionStats[0]?.total_points_redeemed) || 0,
        averagePointsPerCustomer: Math.round(totalPointsAwarded / totalCustomers)
      };
    } catch (error) {
      console.error('Error getting program analytics:', error);
      return {
        totalCustomers: 0,
        activeCustomers: 0,
        totalPointsAwarded: 0,
        totalPointsRedeemed: 0,
        averagePointsPerCustomer: 0
      };
    }
  }
}

