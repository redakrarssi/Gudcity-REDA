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
    
    // Fetch real-time analytics data
    const analyticsData = await AnalyticsService.getAdminAnalytics(
      validatedCurrency as any,
      period as 'day' | 'week' | 'month' | 'year'
    );
    
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
    res.status(500).json({
      error: 'Failed to fetch analytics data',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
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

export default router;