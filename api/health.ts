import { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  withCors, 
  withErrorHandler,
  sendSuccess, 
  sendError,
  sql,
  testConnection
} from './_middleware/index';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  try {
    const startTime = Date.now();
    
    // Test database connection
    const dbHealthy = await testConnection();
    const dbResponseTime = Date.now() - startTime;
    
    // Get basic system stats
    const systemStats = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform
    };
    
    // Test basic database queries if connection is healthy
    let dbStats = null;
    if (dbHealthy) {
      try {
        const [userCount, businessCount, customerCount] = await Promise.all([
          sql`SELECT COUNT(*) as count FROM users`,
          sql`SELECT COUNT(*) as count FROM businesses WHERE status = 'ACTIVE'`,
          sql`SELECT COUNT(*) as count FROM customers`
        ]);
        
        dbStats = {
          users: parseInt(userCount[0].count),
          businesses: parseInt(businessCount[0].count),
          customers: parseInt(customerCount[0].count),
          responseTime: dbResponseTime
        };
      } catch (error) {
        console.error('Error getting database stats:', error);
      }
    }
    
    // Determine overall health status
    const overallHealthy = dbHealthy && dbResponseTime < 5000; // 5 second threshold
    
    const healthData = {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: systemStats.timestamp,
      services: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          responseTime: dbResponseTime,
          stats: dbStats
        },
        api: {
          status: 'healthy',
          uptime: systemStats.uptime
        }
      },
      system: systemStats
    };
    
    // Return appropriate status code
    const statusCode = overallHealthy ? 200 : 503;
    
    return res.status(statusCode).json({
      success: overallHealthy,
      data: healthData,
      timestamp: systemStats.timestamp
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    return sendError(res, 'Health check failed', 500);
  }
}

export default withCors(withErrorHandler(handler));
