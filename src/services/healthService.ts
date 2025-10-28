import sql from '../utils/db';
import env from '../utils/env';
import { withTransaction } from '../utils/errorHandler';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  timestamp: string;
  uptime: number;
  environment: string;
  components: {
    [key: string]: {
      status: 'ok' | 'degraded' | 'down';
      message?: string;
      details?: any;
    };
  };
}

/**
 * Get system health status
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const startTime = Date.now();
  const components: HealthStatus['components'] = {};
  let overallStatus: HealthStatus['status'] = 'ok';
  
  // Check database health
  try {
    const result = await sql`SELECT 1 as test`;
    if (result && result.length > 0 && result[0].test === 1) {
      components.database = { status: 'ok' };
    } else {
      components.database = { 
        status: 'degraded', 
        message: 'Database query returned unexpected result' 
      };
      overallStatus = 'degraded';
    }
  } catch (error) {
    components.database = { 
      status: 'down', 
      message: error instanceof Error ? error.message : 'Unknown database error' 
    };
    overallStatus = 'down';
  }
  
  // Check memory usage
  try {
    const memoryUsage = process.memoryUsage();
    const memoryThresholdMB = 1024; // 1GB
    
    if (memoryUsage.rss / (1024 * 1024) > memoryThresholdMB) {
      components.memory = { 
        status: 'degraded', 
        message: 'High memory usage', 
        details: {
          rss: `${Math.round(memoryUsage.rss / (1024 * 1024))} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / (1024 * 1024))} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / (1024 * 1024))} MB`
        }
      };
      if (overallStatus === 'ok') overallStatus = 'degraded';
    } else {
      components.memory = { 
        status: 'ok',
        details: {
          rss: `${Math.round(memoryUsage.rss / (1024 * 1024))} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / (1024 * 1024))} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / (1024 * 1024))} MB`
        }
      };
    }
  } catch (error) {
    components.memory = { 
      status: 'degraded', 
      message: error instanceof Error ? error.message : 'Failed to check memory usage' 
    };
    if (overallStatus === 'ok') overallStatus = 'degraded';
  }
  
  // Construct the health status response
  const health: HealthStatus = {
    status: overallStatus,
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    components
  };
  
  // Record health check in database if not in test mode
  if (env.NODE_ENV !== 'test') {
    recordHealthCheck(health).catch(error => {
      console.error('Failed to record health check:', error);
    });
  }
  
  // Add response time to the result
  const endTime = Date.now();
  components.response = {
    status: 'ok',
    details: {
      responseTime: `${endTime - startTime}ms`
    }
  };
  
  return health;
}

/**
 * Record health check result in database for monitoring
 */
async function recordHealthCheck(health: HealthStatus): Promise<void> {
  try {
    // Create health_checks table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS health_checks (
        id SERIAL PRIMARY KEY,
        status VARCHAR(20) NOT NULL,
        environment VARCHAR(20) NOT NULL,
        components JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Insert health check record
    await sql`
      INSERT INTO health_checks (
        status,
        environment,
        components
      ) VALUES (
        ${health.status},
        ${health.environment},
        ${JSON.stringify(health.components)}
      )
    `;
    
    // Clean up old health check records (keep 100 most recent)
    await sql`
      DELETE FROM health_checks
      WHERE id NOT IN (
        SELECT id FROM health_checks
        ORDER BY created_at DESC
        LIMIT 100
      )
    `;
  } catch (error) {
    console.error('Failed to record health check:', error);
  }
}

export default {
  getHealthStatus
}; 