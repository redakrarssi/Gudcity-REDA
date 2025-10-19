import { sql } from '../_lib/db';

export interface Business {
  id?: number;
  name: string;
  owner: string;
  email: string;
  phone?: string;
  type?: string;
  status: 'active' | 'inactive' | 'suspended';
  registeredAt?: string;
  address?: string;
  logo?: string;
  programCount?: number;
  customerCount?: number;
  revenue?: number;
  rating?: number;
  complianceStatus?: 'compliant' | 'warning' | 'violation';
  lastActivity?: string;
  description?: string;
  notes?: string;
  userId?: number;
}

export interface BusinessAnalytics {
  id?: number;
  businessId: number;
  date: string;
  loginCount: number;
  activeCustomers: number;
  newCustomers: number;
  totalTransactions: number;
  revenue: number;
  averageTransactionValue: number;
  customerRetentionRate: number;
  growthRate: number;
}

/**
 * Get a specific business by ID
 */
export async function getBusinessById(id: number): Promise<Business | null> {
  try {
    const result = await sql`
      SELECT 
        b.*,
        COUNT(DISTINCT bt.id) as total_transactions,
        COALESCE(SUM(bt.amount), 0) as total_revenue,
        COUNT(DISTINCT bt.customer_id) as total_customers,
        MAX(bdl.login_time) as last_login_time
      FROM 
        businesses b
      LEFT JOIN 
        business_transactions bt ON b.id = bt.business_id
      LEFT JOIN 
        business_daily_logins bdl ON b.id = bdl.business_id
      WHERE 
        b.id = ${id}
      GROUP BY 
        b.id
    `;
    
    if (result && result.length > 0) {
      return mapDbBusinessToBusiness(result[0]);
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching business with id ${id}:`, error);
    return null;
  }
}

/**
 * Update a business
 */
export async function updateBusiness(id: number, business: Partial<Business>): Promise<Business | null> {
  try {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (business.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(business.name);
    }
    if (business.owner !== undefined) {
      updateFields.push(`owner = $${paramIndex++}`);
      values.push(business.owner);
    }
    if (business.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(business.email);
    }
    if (business.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      values.push(business.phone);
    }
    if (business.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      values.push(business.type);
    }
    if (business.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(business.status);
    }
    if (business.address !== undefined) {
      updateFields.push(`address = $${paramIndex++}`);
      values.push(business.address);
    }
    if (business.logo !== undefined) {
      updateFields.push(`logo = $${paramIndex++}`);
      values.push(business.logo);
    }
    if (business.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(business.description);
    }
    if (business.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      values.push(business.notes);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await sql`
      UPDATE businesses
      SET ${sql.unsafe(updateFields.join(', '))}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    if (result && result.length > 0) {
      return mapDbBusinessToBusiness(result[0]);
    }
    
    return null;
  } catch (error) {
    console.error(`Error updating business with id ${id}:`, error);
    return null;
  }
}

/**
 * Get business analytics for a specific period
 */
export async function getBusinessAnalytics(
  businessId: number, 
  startDate: string, 
  endDate: string
): Promise<BusinessAnalytics[]> {
  try {
    const results = await sql`
      SELECT * FROM business_analytics
      WHERE business_id = ${businessId}
        AND date >= ${startDate}
        AND date <= ${endDate}
      ORDER BY date
    `;
    
    return results.map(mapDbAnalyticsToAnalytics);
  } catch (error) {
    console.error(`Error fetching analytics for business ${businessId}:`, error);
    return [];
  }
}

/**
 * Get business settings (profile and settings combined)
 */
export async function getBusinessSettings(businessId: number): Promise<any> {
  try {
    // Get business profile
    const profileResult = await sql`
      SELECT * FROM business_profile 
      WHERE business_id = ${businessId}
    `;
    
    // Get business settings
    const settingsResult = await sql`
      SELECT * FROM business_settings
      WHERE business_id = ${businessId}
    `;
    
    return {
      profile: profileResult.length > 0 ? profileResult[0] : null,
      settings: settingsResult.length > 0 ? settingsResult[0] : null
    };
  } catch (error) {
    console.error(`Error fetching settings for business ${businessId}:`, error);
    return { profile: null, settings: null };
  }
}

/**
 * Update business settings
 */
export async function updateBusinessSettings(
  businessId: number, 
  updates: { profile?: any; settings?: any }
): Promise<{ profile: any; settings: any }> {
  try {
    let updatedProfile = null;
    let updatedSettings = null;

    // Update profile if provided
    if (updates.profile) {
      const profileFields: string[] = [];
      const profileValues: any[] = [];
      let paramIndex = 1;

      Object.keys(updates.profile).forEach((key) => {
        profileFields.push(`${key} = $${paramIndex++}`);
        profileValues.push(updates.profile[key]);
      });

      profileFields.push(`updated_at = NOW()`);
      profileValues.push(businessId);

      const profileResult = await sql`
        UPDATE business_profile
        SET ${sql.unsafe(profileFields.join(', '))}
        WHERE business_id = $${paramIndex}
        RETURNING *
      `;
      
      updatedProfile = profileResult.length > 0 ? profileResult[0] : null;
    }

    // Update settings if provided
    if (updates.settings) {
      const settingsFields: string[] = [];
      const settingsValues: any[] = [];
      let paramIndex = 1;

      Object.keys(updates.settings).forEach((key) => {
        settingsFields.push(`${key} = $${paramIndex++}`);
        settingsValues.push(updates.settings[key]);
      });

      settingsFields.push(`updated_at = NOW()`);
      settingsValues.push(businessId);

      const settingsResult = await sql`
        UPDATE business_settings
        SET ${sql.unsafe(settingsFields.join(', '))}
        WHERE business_id = $${paramIndex}
        RETURNING *
      `;
      
      updatedSettings = settingsResult.length > 0 ? settingsResult[0] : null;
    }

    return {
      profile: updatedProfile,
      settings: updatedSettings
    };
  } catch (error) {
    console.error(`Error updating settings for business ${businessId}:`, error);
    throw error;
  }
}

/**
 * Record a business login
 */
export async function recordBusinessLogin(
  businessId: number, 
  userId: number, 
  ipAddress?: string, 
  device?: string
): Promise<boolean> {
  try {
    await sql`
      INSERT INTO business_daily_logins (
        business_id, user_id, ip_address, device
      ) VALUES (
        ${businessId},
        ${userId},
        ${ipAddress || null},
        ${device || null}
      )
    `;
    
    return true;
  } catch (error) {
    console.error(`Error recording login for business ${businessId}:`, error);
    return false;
  }
}

/**
 * Get business activity overview
 */
export async function getBusinessActivityOverview(businessId: number): Promise<any> {
  try {
    // Get total metrics
    const totalsResult = await sql`
      SELECT 
        COUNT(DISTINCT bdl.id) as total_logins,
        COUNT(DISTINCT bdl.user_id) as unique_users,
        COALESCE(AVG(bdl.session_duration), 0) as avg_session_duration,
        COUNT(DISTINCT bt.id) as total_transactions,
        COALESCE(SUM(bt.amount), 0) as total_revenue,
        COUNT(DISTINCT bt.customer_id) as total_customers
      FROM 
        businesses b
      LEFT JOIN 
        business_daily_logins bdl ON b.id = bdl.business_id
      LEFT JOIN 
        business_transactions bt ON b.id = bt.business_id
      WHERE 
        b.id = ${businessId}
    `;
    
    // Get last 30 days metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentResult = await sql`
      SELECT 
        COUNT(DISTINCT bdl.id) as recent_logins,
        COUNT(DISTINCT bdl.user_id) as recent_users,
        COALESCE(AVG(bdl.session_duration), 0) as recent_avg_session,
        COUNT(DISTINCT bt.id) as recent_transactions,
        COALESCE(SUM(bt.amount), 0) as recent_revenue,
        COUNT(DISTINCT bt.customer_id) as recent_customers
      FROM 
        businesses b
      LEFT JOIN 
        business_daily_logins bdl ON b.id = bdl.business_id AND bdl.login_time >= ${thirtyDaysAgo.toISOString()}
      LEFT JOIN 
        business_transactions bt ON b.id = bt.business_id AND bt.transaction_date >= ${thirtyDaysAgo.toISOString()}
      WHERE 
        b.id = ${businessId}
    `;
    
    return {
      allTime: totalsResult[0] || {},
      last30Days: recentResult[0] || {}
    };
  } catch (error) {
    console.error(`Error fetching activity overview for business ${businessId}:`, error);
    return { allTime: {}, last30Days: {} };
  }
}

// Helper functions
function mapDbBusinessToBusiness(dbBusiness: any): Business {
  return {
    id: dbBusiness.id,
    name: dbBusiness.name,
    owner: dbBusiness.owner,
    email: dbBusiness.email,
    phone: dbBusiness.phone,
    type: dbBusiness.type,
    status: dbBusiness.status,
    registeredAt: dbBusiness.registered_at,
    address: dbBusiness.address,
    logo: dbBusiness.logo,
    description: dbBusiness.description,
    notes: dbBusiness.notes,
    userId: dbBusiness.user_id,
    programCount: dbBusiness.program_count || 0,
    customerCount: dbBusiness.total_customers || 0,
    revenue: dbBusiness.total_revenue || 0,
    lastActivity: dbBusiness.last_login_time || dbBusiness.updated_at || dbBusiness.registered_at
  };
}

function mapDbAnalyticsToAnalytics(dbAnalytics: any): BusinessAnalytics {
  return {
    id: dbAnalytics.id,
    businessId: dbAnalytics.business_id,
    date: dbAnalytics.date,
    loginCount: dbAnalytics.login_count,
    activeCustomers: dbAnalytics.active_customers,
    newCustomers: dbAnalytics.new_customers,
    totalTransactions: dbAnalytics.total_transactions,
    revenue: dbAnalytics.revenue,
    averageTransactionValue: dbAnalytics.avg_transaction_value,
    customerRetentionRate: dbAnalytics.customer_retention_rate,
    growthRate: dbAnalytics.growth_rate
  };
}

