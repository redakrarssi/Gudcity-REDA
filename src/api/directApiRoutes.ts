/**
 * Direct API routes for bypassing problematic API endpoints
 * These routes directly interact with the database via SQL
 */

console.log('🔧 Loading directApiRoutes.ts module...');

import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { logger } from '../utils/logger';
import { directAwardPoints } from '../utils/directPointsAward';

const router = Router();

/**
 * Direct award points endpoint - alternative to the problematic /businesses/award-points
 * 
 * This endpoint uses direct SQL operations to update customer points
 * while bypassing the problematic endpoint that returns 405 errors
 */
router.post('/direct-award-points', auth, async (req: Request, res: Response) => {
  console.log('ROUTE ACCESSED: POST /api/direct-award-points');
  console.log('Request body:', req.body);
  
  const { customerId, programId, points, description, source = 'DIRECT_API' } = req.body;
  const businessIdStr = String(req.user!.id);
  
  // Validate inputs
  if (!customerId || !programId || !points) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  
  if (isNaN(points) || points <= 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Points must be a positive number' 
    });
  }
  
  try {
    // Log the request
    logger.info('Processing direct award points request', {
      customerId,
      programId,
      points,
      businessId: businessIdStr,
      source
    });
    
    // Call the direct SQL function
    const result = await directAwardPoints(
      customerId,
      programId,
      points,
      source || 'DIRECT_API',
      description || 'Points awarded via direct API',
      businessIdStr
    );
    
    if (result.success) {
      // Success!
      return res.status(200).json({
        success: true,
        message: `Successfully awarded ${points} points to customer`,
        data: {
          customerId,
          programId,
          points,
          cardId: result.cardId
        }
      });
    } else {
      // Something went wrong in the direct award function
      logger.error('Direct award points failed', {
        error: result.error,
        customerId,
        programId,
        points
      });
      
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to award points',
        diagnostics: result.diagnostics
      });
    }
  } catch (error) {
    // Unexpected error
    logger.error('Error in direct-award-points endpoint', {
      error: error instanceof Error ? error.message : String(error),
      customerId,
      programId,
      points
    });
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error awarding points'
    });
  }
});

/**
 * GET endpoint to check if the direct API is available
 * This helps clients detect if the direct API is accessible
 */
router.get('/status', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Direct API endpoints are available',
    timestamp: new Date().toISOString()
  });
});

export default router; 