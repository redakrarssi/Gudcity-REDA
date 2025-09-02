import { Router, Request, Response } from 'express';
import sql from '../utils/db';
import { auth } from '../middleware/auth';
import { validateUserId, validateBusinessId } from '../utils/sqlSafety';
import { validateBody, schemas } from '../utils/validation';

const router = Router();

/**
 * Submit feedback
 */
router.post('/feedback', validateBody(schemas.feedback) as any, async (req: Request, res: Response) => {
  try {
    const { rating, comment, category, userId, page, timestamp } = (req as any).validatedBody || req.body;
    
    // Insert feedback into database
    await sql`
      INSERT INTO feedback (
        user_id,
        rating,
        comment,
        category,
        page,
        timestamp
      ) VALUES (
        ${userId || null},
        ${rating},
        ${comment || null},
        ${category || null},
        ${page || null},
        ${timestamp || new Date().toISOString()}
      )
    `;
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * Submit error report
 */
router.post('/errors/report', validateBody(schemas.errorReport) as any, async (req: Request, res: Response) => {
  try {
    const { error, context, userId, page, timestamp } = (req as any).validatedBody || req.body;
    
    // Insert error report into database
    await sql`
      INSERT INTO error_reports (
        user_id,
        error_message,
        context,
        page,
        timestamp
      ) VALUES (
        ${userId || null},
        ${error},
        ${context ? JSON.stringify(context) : null},
        ${page || null},
        ${timestamp || new Date().toISOString()}
      )
    `;
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error submitting error report:', error);
    res.status(500).json({ error: 'Failed to submit error report' });
  }
});

/**
 * Log QR code scan for analytics
 */
router.post('/analytics/scan', validateBody(schemas.scanLog) as any, async (req: Request, res: Response) => {
  try {
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
    } = (req as any).validatedBody || req.body;
    
    // Insert scan data into database
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
        ${business_id},
        ${customer_id},
        ${card_number || null},
        ${points_awarded || null},
        ${status},
        ${scan_duration_ms || null},
        ${program_id || null},
        ${device_info || null},
        ${error || null}
      )
    `;
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging scan:', error);
    res.status(500).json({ error: 'Failed to log scan' });
  }
});

/**
 * Get feedback for a business
 */
router.get('/feedback/business/:businessId', auth, async (req: Request, res: Response) => {
  try {
    const businessId = validateBusinessId(req.params.businessId);
    const period = req.query.period as string || 'month';
    
    // Validate period
    if (!['week', 'month', 'year'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Use week, month, or year.' });
    }
    
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
    
    res.status(200).json({
      averageRating,
      totalFeedback: feedbackItems.length,
      ratingDistribution,
      recentFeedback: feedbackItems.slice(0, 10) // Return only the 10 most recent items
    });
  } catch (error) {
    console.error('Error getting business feedback:', error);
    res.status(500).json({ error: 'Failed to get business feedback' });
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
    
    res.status(200).json(feedbackHistory);
  } catch (error) {
    console.error('Error getting customer feedback history:', error);
    res.status(500).json({ error: 'Failed to get customer feedback history' });
  }
});

/**
 * Respond to feedback
 */
router.post('/feedback/:feedbackId/respond', auth, async (req: Request, res: Response) => {
  try {
    const feedbackId = parseInt(req.params.feedbackId);
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).json({ error: 'Response text is required' });
    }
    
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
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error responding to feedback:', error);
    res.status(500).json({ error: 'Failed to respond to feedback' });
  }
});

export default router; 