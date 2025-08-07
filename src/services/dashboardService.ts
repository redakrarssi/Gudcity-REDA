import sql from '../utils/db';
import { User } from './userService';
import { Business } from './businessService';
import { BusinessApplication } from './businessService';

export interface DashboardStats {
  users: {
    total: number;
    customers: number;
    businesses: number;
    admins: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    growthRate: number;
  };
  businesses: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    growthRate: number;
  };
  transactions: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    value: number;
    growthRate: number;
  };
  revenue: {
    total: number;
    platform: number;
    business: number;
    fees: number;
    growthRate: number;
  };
  approvals: {
    pending: number;
    pendingBusinesses: BusinessApplication[];
  };
  alerts: {
    total: number;
    critical: number;
    warnings: number;
    list: Array<{
      id: number;
      type: string;
      message: string;
      severity: 'critical' | 'warning' | 'info';
      createdAt: string;
    }>;
  };
  activities: Array<{
    id: number;
    type: string;
    message: string;
    time: string;
    timestamp: string;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get user stats
    const userResults = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN role = 'customer' OR user_type = 'customer' THEN 1 END) as customers,
        COUNT(CASE WHEN role = 'business' OR user_type = 'business' THEN 1 END) as businesses,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as new_today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month
      FROM users
    `;

    // Get business stats
    const businessResults = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended,
        COUNT(CASE WHEN DATE(registered_at) = CURRENT_DATE THEN 1 END) as new_today,
        COUNT(CASE WHEN registered_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week,
        COUNT(CASE WHEN registered_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month
      FROM businesses
    `;

    // Get transaction stats
    const transactionResults = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN DATE(transaction_date) = CURRENT_DATE THEN 1 END) as today,
        COUNT(CASE WHEN transaction_date >= NOW() - INTERVAL '7 days' THEN 1 END) as this_week,
        COUNT(CASE WHEN transaction_date >= NOW() - INTERVAL '30 days' THEN 1 END) as this_month,
        COALESCE(SUM(amount), 0) as total_value
      FROM business_transactions
    `;

    // Get pending business applications
    const pendingApplications = await sql`
      SELECT COUNT(*) as pending
      FROM business_applications
      WHERE status = 'pending'
    `;

    // Get recent pending business applications
    const recentPendingBusinesses = await sql`
      SELECT *
      FROM business_applications
      WHERE status = 'pending'
      ORDER BY submitted_at DESC
      LIMIT 5
    `;

    // Map business applications to the right format
    const mappedPendingBusinesses = recentPendingBusinesses.map((app: any) => ({
      id: app.id,
      name: app.name,
      email: app.email,
      phone: app.phone || '',
      submittedAt: app.submitted_at,
      owner: app.owner,
      type: app.type,
      status: app.status,
      documentsVerified: app.documents_verified,
      documents: {
        businessLicense: app.document_business_license || '',
        identityProof: app.document_identity_proof || '',
        addressProof: app.document_address_proof || '',
        taxDocument: app.document_tax || ''
      },
      description: app.description || '',
      address: app.address || '',
      notes: app.notes
    }));

    // Get system alerts
    const systemAlerts = [
      {
        id: 1,
        type: 'server_load',
        message: 'High server load detected',
        severity: 'critical',
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        type: 'payment_gateway',
        message: 'Payment gateway issues',
        severity: 'warning',
        createdAt: new Date().toISOString()
      }
    ];

    // Get recent activities from logs
    const recentActivities = await sql`
      SELECT id, action as type, description as message, created_at as timestamp
      FROM system_logs
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Format activities
    const mappedActivities = recentActivities.map((activity: any) => {
      const timestamp = new Date(activity.timestamp);
      const now = new Date();
      let timeAgo = '';
      
      const diffMs = now.getTime() - timestamp.getTime();
      const diffMins = Math.round(diffMs / 60000);
      
      if (diffMins < 60) {
        timeAgo = `${diffMins} minutes ago`;
      } else if (diffMins < 1440) {
        timeAgo = `${Math.floor(diffMins / 60)} hours ago`;
      } else {
        timeAgo = `${Math.floor(diffMins / 1440)} days ago`;
      }
      
      return {
        id: activity.id,
        type: activity.type,
        message: activity.message,
        time: timeAgo,
        timestamp: activity.timestamp
      };
    });

    // If no activities from logs, provide some fallback activities
    const defaultActivities = mappedActivities.length > 0 ? mappedActivities : [
      {
        id: 1,
        type: 'user_registration',
        message: 'New user registered: Sarah Johnson',
        time: '10 minutes ago',
        timestamp: new Date(Date.now() - 10 * 60000).toISOString()
      },
      {
        id: 2,
        type: 'business_application',
        message: 'New business application: Green Coffee',
        time: '45 minutes ago',
        timestamp: new Date(Date.now() - 45 * 60000).toISOString()
      }
    ];

    // Calculate growth rates (month-over-month)
    // For real data, you would compare with previous period
    const userGrowthRate = 12.5; // Example - would calculate from real data
    const businessGrowthRate = 6.3;
    const transactionGrowthRate = 15.8;
    const revenueGrowthRate = 18.5;

    return {
      users: {
        total: userResults[0]?.total || 0,
        customers: userResults[0]?.customers || 0,
        businesses: userResults[0]?.businesses || 0,
        admins: userResults[0]?.admins || 0,
        newToday: userResults[0]?.new_today || 0,
        newThisWeek: userResults[0]?.new_this_week || 0,
        newThisMonth: userResults[0]?.new_this_month || 0,
        growthRate: userGrowthRate
      },
      businesses: {
        total: businessResults[0]?.total || 0,
        active: businessResults[0]?.active || 0,
        inactive: businessResults[0]?.inactive || 0,
        suspended: businessResults[0]?.suspended || 0,
        newToday: businessResults[0]?.new_today || 0,
        newThisWeek: businessResults[0]?.new_this_week || 0,
        newThisMonth: businessResults[0]?.new_this_month || 0,
        growthRate: businessGrowthRate
      },
      transactions: {
        total: transactionResults[0]?.total || 0,
        today: transactionResults[0]?.today || 0,
        thisWeek: transactionResults[0]?.this_week || 0,
        thisMonth: transactionResults[0]?.this_month || 0,
        value: transactionResults[0]?.total_value || 0,
        growthRate: transactionGrowthRate
      },
      revenue: {
        total: (transactionResults[0]?.total_value || 0) * 0.1, // Assuming 10% platform fee
        platform: (transactionResults[0]?.total_value || 0) * 0.03, // 3% to platform
        business: (transactionResults[0]?.total_value || 0) * 0.06, // 6% to businesses
        fees: (transactionResults[0]?.total_value || 0) * 0.01, // 1% processing fees
        growthRate: revenueGrowthRate
      },
      approvals: {
        pending: pendingApplications[0]?.pending || 0,
        pendingBusinesses: mappedPendingBusinesses
      },
      alerts: {
        total: systemAlerts.length,
        critical: systemAlerts.filter(alert => alert.severity === 'critical').length,
        warnings: systemAlerts.filter(alert => alert.severity === 'warning').length,
        list: systemAlerts as any[]
      },
      activities: defaultActivities
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    
    // Return fallback data if database query fails
    return {
      users: {
        total: 0,
        customers: 0,
        businesses: 0,
        admins: 0,
        newToday: 0,
        newThisWeek: 0,
        newThisMonth: 0,
        growthRate: 0
      },
      businesses: {
        total: 0,
        active: 0,
        inactive: 0,
        suspended: 0,
        newToday: 0,
        newThisWeek: 0,
        newThisMonth: 0,
        growthRate: 0
      },
      transactions: {
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        value: 0,
        growthRate: 0
      },
      revenue: {
        total: 0,
        platform: 0,
        business: 0,
        fees: 0,
        growthRate: 0
      },
      approvals: {
        pending: 0,
        pendingBusinesses: []
      },
      alerts: {
        total: 0,
        critical: 0,
        warnings: 0,
        list: []
      },
      activities: []
    };
  }
}

// Ensure the system_logs table exists
export async function ensureSystemLogsTableExists(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        actor_id INTEGER,
        actor_type VARCHAR(50),
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('System logs table created or already exists');
  } catch (error) {
    console.error('Error creating system logs table:', error);
  }
}

// Log system activity
export async function logSystemActivity(
  action: string,
  details: string,
  userId?: number,
  userType: 'admin' | 'business' | 'customer' = 'admin',
  businessId?: number,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  try {
    console.log(`Logging system activity: ${action} - ${details}`);
    
    const result = await sql`
      INSERT INTO system_logs (
        action, details, user_id, user_type, business_id, 
        ip_address, user_agent, created_at
      ) VALUES (
        ${action}, ${details}, ${userId}, ${userType}, ${businessId},
        ${ipAddress}, ${userAgent}, CURRENT_TIMESTAMP
      )
    `;
    
    if (result && result.length > 0) {
      console.log('System activity logged successfully');
      return true;
    }
    
    console.error('Failed to log system activity');
    return false;
  } catch (error) {
    console.error('Error logging system activity:', error);
    return false;
  }
}

export async function getSystemLogs(
  filters: {
    action?: string;
    userType?: string;
    businessId?: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
): Promise<any[]> {
  try {
    let query = sql`SELECT * FROM system_logs WHERE 1=1`;
    const params: any[] = [];
    
    if (filters.action) {
      query = sql`${query} AND action = ${filters.action}`;
    }
    
    if (filters.userType) {
      query = sql`${query} AND user_type = ${filters.userType}`;
    }
    
    if (filters.businessId) {
      query = sql`${query} AND business_id = ${filters.businessId}`;
    }
    
    if (filters.startDate) {
      query = sql`${query} AND created_at >= ${filters.startDate}`;
    }
    
    if (filters.endDate) {
      query = sql`${query} AND created_at <= ${filters.endDate}`;
    }
    
    query = sql`${query} ORDER BY created_at DESC`;
    
    if (filters.limit) {
      query = sql`${query} LIMIT ${filters.limit}`;
    }
    
    const result = await query;
    return result;
  } catch (error) {
    console.error('Error fetching system logs:', error);
    return [];
  }
}

export async function logAdminAction(
  action: string,
  details: string,
  targetUserId?: number,
  targetBusinessId?: number,
  adminUserId: number = 1
): Promise<boolean> {
  return logSystemActivity(
    action,
    details,
    adminUserId,
    'admin',
    targetBusinessId
  );
}

export async function getAdminActionLogs(days: number = 30): Promise<any[]> {
  try {
    const result = await sql`
      SELECT 
        sl.id, sl.action, sl.details, sl.created_at, sl.ip_address,
        sl.user_agent, sl.user_id, sl.business_id,
        u.name as admin_name, u.email as admin_email
      FROM system_logs sl
      LEFT JOIN users u ON sl.user_id = u.id
      WHERE sl.user_type = 'admin'
      AND sl.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY sl.created_at DESC
    `;
    
    return result;
  } catch (error) {
    console.error('Error fetching admin action logs:', error);
    return [];
  }
} 