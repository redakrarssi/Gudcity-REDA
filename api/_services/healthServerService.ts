import sql from '../_lib/db';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
    api: {
      status: 'up' | 'down';
      responseTime?: number;
    };
  };
  version?: string;
  uptime?: number;
}

/**
 * Server-side service for health checks
 * Monitors system health and availability
 */
export class HealthServerService {
  private static startTime = Date.now();

  /**
   * Perform comprehensive health check
   */
  static async checkHealth(): Promise<HealthStatus> {
    const checks = {
      database: await this.checkDatabase(),
      api: { status: 'up' as const, responseTime: 0 }
    };

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (checks.database.status === 'down') {
      status = 'unhealthy';
    } else if (checks.database.responseTime && checks.database.responseTime > 1000) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date(),
      checks,
      version: process.env.npm_package_version || '1.0.0',
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Check database connectivity and performance
   */
  private static async checkDatabase(): Promise<{
    status: 'up' | 'down';
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Simple query to test database connection
      await sql`SELECT 1`;
      
      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get system metrics
   */
  static async getSystemMetrics(): Promise<{
    database: {
      connections?: number;
      queries?: number;
      avgQueryTime?: number;
    };
    api: {
      requestCount?: number;
      errorCount?: number;
      avgResponseTime?: number;
    };
  }> {
    try {
      // Get database metrics if available
      const dbStats = await sql`
        SELECT 
          (SELECT COUNT(*) FROM pg_stat_activity) as connections,
          (SELECT SUM(calls) FROM pg_stat_statements) as queries
      `.catch(() => null);

      return {
        database: {
          connections: dbStats ? parseInt(dbStats[0].connections) : undefined,
          queries: dbStats ? parseInt(dbStats[0].queries) : undefined
        },
        api: {
          // These would be populated from a monitoring service
          requestCount: undefined,
          errorCount: undefined,
          avgResponseTime: undefined
        }
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      return {
        database: {},
        api: {}
      };
    }
  }

  /**
   * Simple ping endpoint
   */
  static async ping(): Promise<{ success: boolean; timestamp: Date }> {
    return {
      success: true,
      timestamp: new Date()
    };
  }

  /**
   * Get service status
   */
  static async getServiceStatus(): Promise<{
    services: {
      name: string;
      status: 'operational' | 'degraded' | 'down';
      lastCheck: Date;
    }[];
  }> {
    const health = await this.checkHealth();

    return {
      services: [
        {
          name: 'Database',
          status: health.checks.database.status === 'up' ? 'operational' : 'down',
          lastCheck: health.timestamp
        },
        {
          name: 'API',
          status: health.checks.api.status === 'up' ? 'operational' : 'down',
          lastCheck: health.timestamp
        }
      ]
    };
  }
}

