/**
 * Test Routes for diagnosing API issues
 * 
 * These routes are used solely for testing and debugging purposes
 * They should NOT be enabled in production
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET test endpoint
 * Simple test to verify routing works for GET requests
 */
router.get('/test', (req: Request, res: Response) => {
  console.log('TEST GET ROUTE ACCESSED');
  
  return res.status(200).json({
    success: true,
    method: 'GET',
    message: 'Test GET endpoint works correctly',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST test endpoint
 * Test to verify that POST requests work correctly
 */
router.post('/test-post', (req: Request, res: Response) => {
  console.log('TEST POST ROUTE ACCESSED');
  console.log('Request body:', req.body);
  
  return res.status(200).json({
    success: true,
    method: 'POST',
    message: 'Test POST endpoint works correctly',
    receivedBody: req.body || {},
    timestamp: new Date().toISOString()
  });
});

/**
 * Test award endpoint with minimal logic
 * Just returns success without doing any actual database operations
 */
router.post('/test-award', (req: Request, res: Response) => {
  console.log('TEST AWARD ENDPOINT ACCESSED');
  console.log('Request body:', req.body);
  
  const { customerId, programId, points } = req.body;
  
  if (!customerId || !programId || !points) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['customerId', 'programId', 'points'],
      received: Object.keys(req.body)
    });
  }
  
  return res.status(200).json({
    success: true,
    message: `Successfully awarded ${points} points to customer ${customerId} in program ${programId} (TEST ONLY)`,
    data: {
      customerId,
      programId,
      points,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Test route with same name as problematic endpoint
 * This route is used to test if the award-points route name itself is problematic
 */
router.post('/award-points', (req: Request, res: Response) => {
  console.log('TEST AWARD-POINTS ROUTE ACCESSED');
  console.log('Request body:', req.body);
  
  const { customerId, programId, points } = req.body;
  
  if (!customerId || !programId || !points) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['customerId', 'programId', 'points'],
      received: Object.keys(req.body)
    });
  }
  
  return res.status(200).json({
    success: true,
    message: `TEST ROUTE: Successfully awarded ${points} points to customer ${customerId} in program ${programId}`,
    data: {
      customerId,
      programId,
      points,
      testRoute: true,
      timestamp: new Date().toISOString()
    }
  });
});

export default router; 