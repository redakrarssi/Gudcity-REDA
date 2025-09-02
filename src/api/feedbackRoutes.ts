import { Router, Request, Response } from 'express';
import sql from '../utils/db';
import { auth } from '../middleware/auth';
import { validateUserId, validateBusinessId } from '../utils/sqlSafety';
import { validateBody, validateQuery, schemas } from '../utils/validation';
import { createSecureErrorResponse, logSecureError } from '../utils/secureErrorResponse';
import { log } from '../utils/logger';

const router = Router();

/**
 * Submit feedback
 */
router.post('/feedback', validateBody(schemas.feedback) as any, async (req: Request, res: Response) => {
  try {
    // Use only validated body - no fallback to req.body
    const { rating, comment, category, userId, page, timestamp } = (req as any).validatedBody;
    
    // Validate userId if provided
    let validatedUserId = null;
    if (userId) {
      try {
        validatedUserId = validateUserId(userId);
      } catch (error) {
        const { statusCode, response } = createSecureErrorResponse(
          new Error('Invalid user ID format'), 
          false
        );
        return res.status(statusCode).json(response);
      }
    }
    
    // Insert feedback into database with validated data
    await sql`
      INSERT INTO feedback (
        user_id,
        rating,
        comment,
        category,
        page,
        timestamp
      ) VALUES (
        ${validatedUserId},
        ${rating},
        ${comment || null},
        ${category || null},
        ${page || null},
        ${timestamp || new Date().toISOString()}
      )
    `;
    
    log.api('Feedback submitted successfully', {
      rating,
      hasComment: !!comment,
      category: category || 'none',
      userId: validatedUserId
    });
    
    res.status(200).json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    const { statusCode, response } = createSecureErrorResponse(error as Error, false);
    
    logSecureError(error as Error, response.requestId, {
      endpoint: '/feedback',
      method: 'POST',
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
    
    res.status(statusCode).json(response);
  }
});

/**
 * Submit error report
 */
router.post('/errors/report', validateBody(schemas.errorReport) as any, async (req: Request, res: Response) => {
  try {
    // Use only validated body - no fallback to req.body
    const { error, context, userId, page, timestamp } = (req as any).validatedBody;
    
    // Validate userId if provided
    let validatedUserId = null;
    if (userId) {
      try {
        validatedUserId = validateUserId(userId);
      } catch (validationError) {
        const { statusCode, response } = createSecureErrorResponse(
          new Error('Invalid user ID format'), 
          false
        );
        return res.status(statusCode).json(response);
      }
    }
    
    // Insert error report into database with validated data
    await sql`
      INSERT INTO error_reports (
        user_id,
        error_message,
        context,
        page,
        timestamp
      ) VALUES (
        ${validatedUserId},
        ${error},
        ${context ? JSON.stringify(context) : null},
        ${page || null},
        ${timestamp || new Date().toISOString()}
      )
    `;
    
    log.api('Error report submitted', {
      hasContext: !!context,
      page: page || 'unknown',
      userId: validatedUserId,
      errorLength: error.length
    });
    
    res.status(200).json({ success: true, message: 'Error report submitted successfully' });
  } catch (error) {
    const { statusCode, response } = createSecureErrorResponse(error as Error, false);
    
    logSecureError(error as Error, response.requestId, {
      endpoint: '/errors/report',
      method: 'POST',
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
    
    res.status(statusCode).json(response);
  }
});

/**
 * Log QR code scan for analytics
 */
router.post('/analytics/scan', validateBody(schemas.scanLog) as any, async (req: Request, res: Response) => {
  try {
    // Use only validated body - no fallback to req.body
    const {
      timestamp,
      type,
      business_id,
      customer_id,
      card_number,
      points_awarded,
      status,
      scan_duration_ms,
      program_id,
      device_info,
      error
    } = (req as any).validatedBody;
    
    // Validate business and customer IDs
    let validatedBusinessId, validatedCustomerId;
    try {
      validatedBusinessId = validateBusinessId(business_id);
      validatedCustomerId = validateUserId(customer_id);
    } catch (validationError) {
      const { statusCode, response } = createSecureErrorResponse(
        new Error('Invalid business ID or customer ID format'), 
        false
      );
      return res.status(statusCode).json(response);
    }
    
    // Insert scan data into database with validated data
    await sql`
      INSERT INTO scan_logs (
        timestamp,
        scan_type,
        business_id,
        customer_id,
        card_number,
        points_awarded,
        status,
        scan_duration_ms,
        program_id,
        device_info,
        error_message
      ) VALUES (
        ${timestamp || new Date().toISOString()},
        ${type},
        ${validatedBusinessId},
        ${validatedCustomerId},
        ${card_number || null},
        ${points_awarded || null},
        ${status},
        ${scan_duration_ms || null},
        ${program_id || null},
        ${device_info || null},
        ${error || null}
      )
    `;
    
    log.api('QR scan logged successfully', {
      type,
      businessId: validatedBusinessId,
      customerId: validatedCustomerId,
      status,
      pointsAwarded: points_awarded || 0,
      hasError: !!error
    });
    
    res.status(200).json({ success: true, message: 'Scan logged successfully' });
  } catch (error) {
    const { statusCode, response } = createSecureErrorResponse(error as Error, false);
    
    logSecureError(error as Error, response.requestId, {
      endpoint: '/analytics/scan',
      method: 'POST',
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
    
    res.status(statusCode).json(response);
  }
});

/**
 * Get feedback for a business
 */
router.get('/feedback/business/:businessId', 
  auth, 
  validateQuery(schemas.businessFeedbackQuery) as any,
  async (req: Request, res: Response) => {
  try {
    const businessId = validateBusinessId(req.params.businessId);
    const { period } = (req as any).validatedQuery;
    
    // Period is now validated by schema, no additional validation needed
    
    // Calculate date range based on period
    let dateFilter;
    const now = new Date();
    
    if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      dateFilter = `timestamp >= '${weekAgo.toISOString()}'`;
    } else if (period === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      dateFilter = `timestamp >= '${monthAgo.toISOString()}'`;
    } else {
      const yearAgo = new Date(now);
      yearAgo.setFullYear(now.getFullYear() - 1);
      dateFilter = `timestamp >= '${yearAgo.toISOString()}'`;
    }
    
    // Get all feedback for this business in the specified period
    const feedbackItems = await sql`
      SELECT * FROM feedback
      WHERE business_id = ${businessId}
      AND ${sql.raw(dateFilter)}
      ORDER BY timestamp DESC
    `;
    
    // Calculate statistics
    let totalRating = 0;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    feedbackItems.forEach((item: any) => {
      totalRating += item.rating;
      ratingDistribution[item.rating as 1|2|3|4|5]++;
    });
    
    const averageRating = feedbackItems.length > 0 
      ? parseFloat((totalRating / feedbackItems.length).toFixed(1)) 
      : 0;
    
    log.api('Business feedback retrieved', {
      businessId,
      period,
      totalFeedback: feedbackItems.length,
      averageRating
    });
    
    res.status(200).json({
      averageRating,
      totalFeedback: feedbackItems.length,
      ratingDistribution,
      recentFeedback: feedbackItems.slice(0, 10) // Return only the 10 most recent items
    });
  } catch (error) {
    const { statusCode, response } = createSecureErrorResponse(error as Error, false);
    
    logSecureError(error as Error, response.requestId, {
      endpoint: `/feedback/business/${req.params.businessId}`,
      method: 'GET',
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: (req as any).user?.id
    });
    
    res.status(statusCode).json(response);
  }
});

/**
 * Get feedback history for a customer
 */
router.get('/feedback/customer/:customerId', auth, async (req: Request, res: Response) => {
  try {
    const customerId = validateUserId(req.params.customerId);
    
    // Verify the requesting user has permission to access this data
    if (req.user?.id !== customerId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to customer feedback' });
    }
    
    // Get feedback history for this customer
    const feedbackHistory = await sql`
      SELECT * FROM feedback
      WHERE customer_id = ${customerId}
      ORDER BY timestamp DESC
    `;
    
    log.api('Customer feedback history retrieved', {
      customerId,
      feedbackCount: feedbackHistory.length,
      requestingUserId: (req as any).user?.id
    });
    
    res.status(200).json(feedbackHistory);
  } catch (error) {
    const { statusCode, response } = createSecureErrorResponse(error as Error, false);
    
    logSecureError(error as Error, response.requestId, {
      endpoint: `/feedback/customer/${req.params.customerId}`,
      method: 'GET',
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: (req as any).user?.id
    });
    
    res.status(statusCode).json(response);
  }
});

/**
 * Respond to feedback
 */
router.post('/feedback/:feedbackId/respond', 
  auth, 
  validateBody(schemas.feedbackResponse) as any,
  async (req: Request, res: Response) => {
  try {
    const feedbackId = parseInt(req.params.feedbackId);
    
    // Validate feedbackId parameter
    if (isNaN(feedbackId) || feedbackId <= 0) {
      const { statusCode, response } = createSecureErrorResponse(
        new Error('Invalid feedback ID'), 
        false
      );
      return res.status(statusCode).json(response);
    }
    
    // Use only validated body - no fallback to req.body
    const { response } = (req as any).validatedBody;
    
    // Verify the feedback exists
    const feedbackCheck = await sql`
      SELECT id, business_id FROM feedback
      WHERE id = ${feedbackId}
    `;
    
    if (!feedbackCheck.length) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    // Verify the user has permission to respond to this feedback
    const businessId = feedbackCheck[0].business_id;
    
    if (req.user?.id !== businessId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to respond to this feedback' });
    }
    
    // Update the feedback with the response
    await sql`
      UPDATE feedback
      SET 
        response = ${response},
        response_timestamp = ${new Date().toISOString()},
        response_by = ${req.user.id}
      WHERE id = ${feedbackId}
    `;
    
    log.api('Feedback response added', {
      feedbackId,
      businessId,
      responseLength: response.length,
      respondingUserId: (req as any).user.id
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Response added successfully',
      feedbackId 
    });
  } catch (error) {
    const { statusCode, response: errorResponse } = createSecureErrorResponse(error as Error, false);
    
    logSecureError(error as Error, errorResponse.requestId, {
      endpoint: `/feedback/${req.params.feedbackId}/respond`,
      method: 'POST',
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: (req as any).user?.id,
      feedbackId: req.params.feedbackId
    });
    
    res.status(statusCode).json(errorResponse);
  }
});

export default router; 