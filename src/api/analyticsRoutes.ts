import express from 'express';
import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { validateCurrencyCode } from '../utils/sqlSafety';

const router = express.Router();

/**
 * GET /api/analytics/admin
 * Get real-time admin analytics data
 */
router.get('/admin', async (req: Request, res: Response) => {
  try {
    const { period = 'month', currency = 'USD' } = req.query;
    
    // Validate period parameter
    const validPeriods = ['day', 'week', 'month', 'year'];
    if (!validPeriods.includes(period as string)) {
      return res.status(400).json({
        error: 'Invalid period parameter',
        validPeriods,
        received: period
      });
    }
    
    // Validate currency parameter
    let validatedCurrency: string;
    try {
      validatedCurrency = validateCurrencyCode(currency as string);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid currency parameter',
        validCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        received: currency
      });
    }
    
    console.log(`📊 Fetching admin analytics for period: ${period}, currency: ${validatedCurrency}`);
    
    // Fetch real-time analytics data with timeout
    const analyticsData = await Promise.race([
      AnalyticsService.getAdminAnalytics(
        validatedCurrency as any,
        period as 'day' | 'week' | 'month' | 'year'
      ),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      )
    ]);
    
    // Add timestamp for real-time tracking
    const responseData = {
      ...analyticsData,
      timestamp: new Date().toISOString(),
      dataSource: analyticsData.isMockData ? 'mock' : 'database',
      period,
      currency: validatedCurrency
    };
    
    console.log(`✅ Admin analytics fetched successfully. Data source: ${responseData.dataSource}`);
    
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error fetching admin analytics:', error);
    
    // Try to provide fallback data
    try {
      const fallbackData = {
        platform: {
          totalUsers: 0,
          activeUsers: 0,
          userGrowth: 0,
          businessGrowth: 0,
          programGrowth: 0,
          totalRevenue: 0,
          revenueGrowth: 0,
          transactionVolume: 0,
          averageUserValue: 0,
          currency: 'USD'
        },
        regional: [],
        engagement: {
          dailyActiveUsers: 0,
          monthlyActiveUsers: 0,
          averageSessionDuration: 0,
          interactionsByFeature: {},
          retentionByDay: [],
          topFeatures: []
        },
        periodComparison: {
          users: 0,
          businesses: 0,
          revenue: 0,
          programsCreated: 0
        },
        isMockData: true,
        timestamp: new Date().toISOString(),
        dataSource: 'fallback',
        period: req.query.period || 'month',
        currency: req.query.currency || 'USD',
        error: 'Using fallback data due to service error'
      };
      
      res.json(fallbackData);
    } catch (fallbackError) {
      res.status(500).json({
        error: 'Failed to fetch analytics data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        fallbackError: 'Could not provide fallback data'
      });
    }
  }
});

/**
 * GET /api/analytics/business/:businessId
 * Get real-time business analytics data
 */
router.get('/business/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { period = 'month', currency = 'USD' } = req.query;
    
    // Validate business ID
    if (!businessId || isNaN(Number(businessId))) {
      return res.status(400).json({
        error: 'Invalid business ID',
        received: businessId
      });
    }
    
    // Validate period parameter
    const validPeriods = ['day', 'week', 'month', 'year'];
    if (!validPeriods.includes(period as string)) {
      return res.status(400).json({
        error: 'Invalid period parameter',
        validPeriods,
        received: period
      });
    }
    
    // Validate currency parameter
    let validatedCurrency: string;
    try {
      validatedCurrency = validateCurrencyCode(currency as string);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid currency parameter',
        validCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        received: currency
      });
    }
    
    console.log(`📊 Fetching business analytics for business: ${businessId}, period: ${period}, currency: ${validatedCurrency}`);
    
    // Fetch real-time business analytics data
    const analyticsData = await AnalyticsService.getBusinessAnalytics(
      businessId,
      validatedCurrency as any,
      period as 'day' | 'week' | 'month' | 'year'
    );
    
    // Add timestamp for real-time tracking
    const responseData = {
      ...analyticsData,
      timestamp: new Date().toISOString(),
      dataSource: analyticsData.isMockData ? 'mock' : 'database',
      businessId,
      period,
      currency: validatedCurrency
    };
    
    console.log(`✅ Business analytics fetched successfully. Data source: ${responseData.dataSource}`);
    
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error fetching business analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch business analytics data',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/analytics/health
 * Check analytics service health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Test analytics service with minimal data
    const testData = await AnalyticsService.getAdminAnalytics('USD', 'month');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      dataSource: testData.isMockData ? 'mock' : 'database',
      message: 'Analytics service is operational'
    });
  } catch (error) {
    console.error('❌ Analytics service health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Analytics service is not operational',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analytics/test
 * Simple test endpoint to verify server is working
 */
router.get('/test', (req: Request, res: Response) => {
  res.json({
    message: 'Analytics API is working',
    timestamp: new Date().toISOString(),
    endpoint: '/api/analytics/test',
    method: req.method
  });
});

export default router;