import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../../src/utils/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { period = 'month' } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Missing business ID' });
    }

    const businessId = parseInt(id as string);

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const startDateStr = startDate.toISOString();
    const endDateStr = now.toISOString();

    // Execute all queries in parallel for better performance
    const [
      totalPointsResult,
      totalRedemptionsResult,
      activeCustomersResult,
      retentionRateResult,
      redemptionRateResult,
      popularRewardsResult,
      customerEngagementResult,
      pointsDistributionResult,
      totalProgramsResult,
      totalPromoCodesResult,
      averagePointsPerCustomerResult,
      topPerformingProgramsResult
    ] = await Promise.all([
      // Total points
      sql`
        SELECT COALESCE(SUM(pe.current_points), 0) as total_points
        FROM program_enrollments pe
        JOIN loyalty_programs lp ON pe.program_id = lp.id
        WHERE lp.business_id = ${businessId}
          AND pe.status = 'ACTIVE'
          AND pe.enrolled_at BETWEEN ${startDateStr} AND ${endDateStr}
      `,
      
      // Total redemptions
      sql`
        SELECT COUNT(*) as total_redemptions
        FROM redemptions r
        JOIN loyalty_cards lc ON r.card_id = lc.id
        WHERE lc.business_id = ${businessId}
          AND r.created_at BETWEEN ${startDateStr} AND ${endDateStr}
      `,
      
      // Active customers
      sql`
        SELECT COUNT(DISTINCT pe.customer_id) as active_customers
        FROM program_enrollments pe
        JOIN loyalty_programs lp ON pe.program_id = lp.id
        WHERE lp.business_id = ${businessId}
          AND pe.status = 'ACTIVE'
          AND pe.enrolled_at BETWEEN ${startDateStr} AND ${endDateStr}
      `,
      
      // Retention rate (simplified calculation)
      sql`
        SELECT 
          COUNT(DISTINCT CASE WHEN pe.enrolled_at BETWEEN ${startDateStr} AND ${endDateStr} THEN pe.customer_id END) as new_customers,
          COUNT(DISTINCT pe.customer_id) as total_customers
        FROM program_enrollments pe
        JOIN loyalty_programs lp ON pe.program_id = lp.id
        WHERE lp.business_id = ${businessId}
      `,
      
      // Redemption rate
      sql`
        SELECT 
          COUNT(DISTINCT r.customer_id) as customers_with_redemptions,
          COUNT(DISTINCT pe.customer_id) as total_customers
        FROM program_enrollments pe
        JOIN loyalty_programs lp ON pe.program_id = lp.id
        LEFT JOIN loyalty_cards lc ON pe.customer_id = lc.customer_id AND lc.business_id = ${businessId}
        LEFT JOIN redemptions r ON lc.id = r.card_id
        WHERE lp.business_id = ${businessId}
          AND pe.status = 'ACTIVE'
      `,
      
      // Popular rewards (mock data for now)
      Promise.resolve([{ reward: 'Free Coffee', count: 25 }, { reward: '10% Discount', count: 15 }]),
      
      // Customer engagement (mock data for now)
      Promise.resolve([
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 15 },
        { date: '2024-01-03', value: 12 }
      ]),
      
      // Points distribution (mock data for now)
      Promise.resolve([
        { category: 'Purchases', value: 500 },
        { category: 'Referrals', value: 200 },
        { category: 'Social Media', value: 100 }
      ]),
      
      // Total programs
      sql`
        SELECT COUNT(*) as total_programs
        FROM loyalty_programs
        WHERE business_id = ${businessId}
      `,
      
      // Total promo codes
      sql`
        SELECT COUNT(*) as total_promo_codes
        FROM promo_codes
        WHERE business_id = ${businessId}
      `,
      
      // Average points per customer
      sql`
        SELECT COALESCE(AVG(pe.current_points), 0) as avg_points
        FROM program_enrollments pe
        JOIN loyalty_programs lp ON pe.program_id = lp.id
        WHERE lp.business_id = ${businessId}
          AND pe.status = 'ACTIVE'
      `,
      
      // Top performing programs (mock data for now)
      Promise.resolve([
        { name: 'Coffee Loyalty', customers: 50, points: 1000 },
        { name: 'Restaurant Rewards', customers: 30, points: 750 }
      ])
    ]);

    const totalPoints = parseInt(totalPointsResult[0]?.total_points || '0');
    const totalRedemptions = parseInt(totalRedemptionsResult[0]?.total_redemptions || '0');
    const activeCustomers = parseInt(activeCustomersResult[0]?.active_customers || '0');
    
    const retentionData = retentionRateResult[0];
    const retentionRate = retentionData?.total_customers > 0 
      ? (retentionData.new_customers / retentionData.total_customers) * 100 
      : 0;
    
    const redemptionData = redemptionRateResult[0];
    const redemptionRate = redemptionData?.total_customers > 0 
      ? (redemptionData.customers_with_redemptions / redemptionData.total_customers) * 100 
      : 0;
    
    const popularRewards = popularRewardsResult;
    const customerEngagement = customerEngagementResult;
    const pointsDistribution = pointsDistributionResult;
    const totalPrograms = parseInt(totalProgramsResult[0]?.total_programs || '0');
    const totalPromoCodes = parseInt(totalPromoCodesResult[0]?.total_promo_codes || '0');
    const averagePointsPerCustomer = parseFloat(averagePointsPerCustomerResult[0]?.avg_points || '0');
    const topPerformingPrograms = topPerformingProgramsResult;

    const analyticsData = {
      totalPoints,
      totalRedemptions,
      activeCustomers,
      retentionRate,
      redemptionRate,
      popularRewards,
      customerEngagement,
      pointsDistribution,
      totalPrograms,
      totalPromoCodes,
      averagePointsPerCustomer,
      topPerformingPrograms
    };

    res.status(200).json(analyticsData);
  } catch (error) {
    console.error('Error fetching business analytics:', error);
    res.status(500).json({ error: 'Failed to fetch business analytics' });
  }
}
