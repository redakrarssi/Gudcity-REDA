/**
 * Admin Dashboard Stats API Endpoint
 * GET /api/admin/dashboard-stats
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../_lib/db.js';
import { verifyAuth, cors, rateLimitFactory } from '../_lib/auth.js';

const allow = rateLimitFactory(120, 60_000); // Lower rate limit for admin endpoints

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  cors(res, (req.headers.origin as string) || undefined);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'admin-ip';
  if (!allow(rlKey)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // Authentication
  const user = await verifyAuth(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Admin authorization check
  if (user.role !== 'admin' && user.user_type !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const sql = requireSql();
    
    // Get comprehensive dashboard statistics
    const [
      userStats,
      businessStats, 
      programStats,
      recentTransactions
    ] = await Promise.all([
      // User statistics
      sql`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d,
          COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '7 days') as active_users_7d
        FROM users
        WHERE user_type IN ('customer', 'business', 'staff')
      `,
      
      // Business statistics  
      sql`
        SELECT 
          COUNT(*) as total_businesses,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_businesses,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_businesses
        FROM users 
        WHERE user_type = 'business'
      `,
      
      // Program statistics
      sql`
        SELECT 
          COUNT(*) as total_programs,
          COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_programs,
          COALESCE(SUM(points_issued), 0) as total_points_issued
        FROM loyalty_programs
      `,
      
      // Recent transactions (last 10)
      sql`
        SELECT 
          lt.id,
          lt.transaction_type,
          lt.points,
          lt.description,
          lt.created_at,
          u.name as customer_name,
          u.email as customer_email
        FROM loyalty_transactions lt
        LEFT JOIN users u ON u.id = lt.customer_id
        ORDER BY lt.created_at DESC
        LIMIT 10
      `
    ]);

    // Build response object
    const dashboardStats = {
      totalUsers: Number(userStats[0]?.total_users || 0),
      totalBusinesses: Number(businessStats[0]?.total_businesses || 0),
      totalPrograms: Number(programStats[0]?.total_programs || 0),
      totalPoints: Number(programStats[0]?.total_points_issued || 0),
      activeUsers: Number(userStats[0]?.active_users_7d || 0),
      pendingApprovals: Number(businessStats[0]?.pending_businesses || 0),
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        type: tx.transaction_type,
        points: Number(tx.points),
        description: tx.description || '',
        customerName: tx.customer_name || 'Unknown',
        customerEmail: tx.customer_email || '',
        time: tx.created_at,
        timestamp: tx.created_at
      })),
      systemHealth: {
        status: 'healthy',
        dbConnection: true,
        apiHealth: true,
        lastUpdated: new Date().toISOString()
      },
      pendingBusinessApplications: [] // This could be expanded later
    };

    return res.status(200).json(dashboardStats);

  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    
    // Return fallback data if database fails
    const fallbackStats = {
      totalUsers: 0,
      totalBusinesses: 0, 
      totalPrograms: 0,
      totalPoints: 0,
      activeUsers: 0,
      pendingApprovals: 0,
      recentTransactions: [],
      systemHealth: {
        status: 'error',
        dbConnection: false,
        apiHealth: true,
        lastUpdated: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Database connection failed'
      },
      pendingBusinessApplications: []
    };
    
    return res.status(200).json(fallbackStats); // Return 200 with fallback data instead of 500
  }
}
