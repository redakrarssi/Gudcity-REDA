import { Pool } from 'pg';
import sql from './db';
import { withRetryableQuery } from './dbRetry';

/**
 * Audit Log Entry Type
 */
export interface AuditLogEntry {
  actionType: string;
  resourceId: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  details?: any;
}

/**
 * Creates an audit log entry in the database
 * 
 * @param logEntry The audit log entry to create
 * @returns Promise that resolves when the log is created
 */
export const createAuditLog = async (logEntry: AuditLogEntry): Promise<void> => {
  try {
    await sql`
      INSERT INTO security_audit_logs 
      (action_type, resource_id, user_id, ip_address, user_agent, details, timestamp) 
      VALUES (
        ${logEntry.actionType},
        ${logEntry.resourceId},
        ${logEntry.userId},
        ${logEntry.ipAddress},
        ${logEntry.userAgent},
        ${JSON.stringify(logEntry.details || {})},
        NOW()
      )
    `;
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw error;
  }
};

/**
 * Retrieves audit logs based on search criteria
 * 
 * @param searchParams Search parameters for filtering logs
 * @returns Promise that resolves to the audit logs
 */
export const getAuditLogs = async (
  searchParams: {
    actionType?: string;
    resourceId?: string;
    userId?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
): Promise<any[]> => {
  try {
    let query = 'SELECT * FROM security_audit_logs WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    // Build query conditionally based on search parameters
    if (searchParams.actionType) {
      query += ` AND action_type = $${paramIndex}`;
      params.push(searchParams.actionType);
      paramIndex++;
    }
    
    if (searchParams.resourceId) {
      query += ` AND resource_id = $${paramIndex}`;
      params.push(searchParams.resourceId);
      paramIndex++;
    }
    
    if (searchParams.userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(searchParams.userId);
      paramIndex++;
    }
    
    if (searchParams.ipAddress) {
      query += ` AND ip_address = $${paramIndex}`;
      params.push(searchParams.ipAddress);
      paramIndex++;
    }
    
    if (searchParams.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      params.push(searchParams.startDate);
      paramIndex++;
    }
    
    if (searchParams.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      params.push(searchParams.endDate);
      paramIndex++;
    }
    
    // Add ordering
    query += ' ORDER BY timestamp DESC';
    
    // Add pagination
    if (searchParams.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(searchParams.limit);
      paramIndex++;
      
      if (searchParams.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(searchParams.offset);
        paramIndex++;
      }
    }
    
    const result = await sql.query(query, params);
    return result;
  } catch (error) {
    console.error('Error retrieving audit logs:', error);
    throw error;
  }
};

/**
 * Gets a summary of audit logs for a specific time period
 * 
 * @param timeframe The timeframe to analyze ('daily', 'weekly', 'monthly')
 * @returns Promise that resolves to the audit log summary
 */
export const getAuditLogSummary = async (
  timeframe: 'daily' | 'weekly' | 'monthly'
): Promise<any[]> => {
  try {
    let intervalSql;
    
    switch (timeframe) {
      case 'daily':
        intervalSql = "date_trunc('day', timestamp)";
        break;
      case 'weekly':
        intervalSql = "date_trunc('week', timestamp)";
        break;
      case 'monthly':
        intervalSql = "date_trunc('month', timestamp)";
        break;
      default:
        intervalSql = "date_trunc('day', timestamp)";
    }
    
    const result = await sql`
      SELECT 
        ${intervalSql} as period,
        action_type,
        COUNT(*) as count
      FROM security_audit_logs
      GROUP BY period, action_type
      ORDER BY period DESC, count DESC
    `;
    
    return result;
  } catch (error) {
    console.error('Error getting audit log summary:', error);
    throw error;
  }
};

export default {
  createAuditLog,
  getAuditLogs,
  getAuditLogSummary
}; 