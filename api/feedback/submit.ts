import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FeedbackServerService } from '../_services/feedbackServerService';
import { formatSuccessResponse, formatErrorResponse } from '../_services/responseFormatter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json(formatErrorResponse('Method not allowed', 405));
  }

  try {
    const { userId, rating, comment, category, page } = req.body;

    // Validate required fields
    if (!rating || typeof rating !== 'number') {
      return res.status(400).json(formatErrorResponse('Rating is required and must be a number', 400));
    }

    const result = await FeedbackServerService.submitFeedback({
      userId,
      rating,
      comment,
      category,
      page
    });

    if (!result.success) {
      return res.status(400).json(formatErrorResponse(result.error || 'Failed to submit feedback', 400));
    }

    return res.status(200).json(formatSuccessResponse(result.feedback, 'Feedback submitted successfully'));
  } catch (error) {
    console.error('Error in feedback submit endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

