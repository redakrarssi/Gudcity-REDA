/**
 * Vercel Serverless API: Notifications
 * GET /api/notifications - Get user notifications
 * POST /api/notifications - Create notification
 * PUT /api/notifications - Update notification status
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware, cors } from './_lib/auth.js';
import { 
  getNotifications, 
  createNotification, 
  updateNotificationStatus 
} from './_services/notificationServerService.js';
import { successResponse, ErrorResponses } from './_services/responseFormatter.js';
import { standardRateLimit } from './_middleware/rateLimit.js';
import { validationMiddleware } from './_middleware/validation.js';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[Notifications API] Request received:', { method: req.method, url: req.url });
  
  // Handle CORS
  cors(res, req.headers.origin);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate limiting
  if (!standardRateLimit.check(req, res)) {
    return;
  }

  // Authentication required
  const isAuth = await authMiddleware(req, res);
  if (!isAuth) {
    return;
  }

  try {
    if (req.method === 'GET') {
      const { customerId, businessId, unread } = req.query;
      
      const notifications = await getNotifications({
        customerId: customerId as string,
        businessId: businessId as string,
        unread: unread === 'true'
      });
      
      return res.status(200).json(successResponse({ 
        notifications,
        count: notifications.length
      }));
    }

    if (req.method === 'POST') {
      const createSchema = {
        customerId: { type: 'string' as const, required: true },
        businessId: { type: 'string' as const, required: false },
        type: { type: 'string' as const, required: true },
        title: { type: 'string' as const, required: true, min: 1, max: 255 },
        message: { type: 'string' as const, required: true, min: 1, max: 1000 },
        data: { type: 'object' as const, required: false }
      };

      if (!validationMiddleware(createSchema)(req, res)) {
        return;
      }

      const notification = await createNotification(req.body);
      
      return res.status(201).json(successResponse(notification));
    }

    if (req.method === 'PUT') {
      const updateSchema = {
        notificationId: { type: 'string' as const, required: true },
        isRead: { type: 'boolean' as const, required: false },
        actionTaken: { type: 'boolean' as const, required: false }
      };

      if (!validationMiddleware(updateSchema)(req, res)) {
        return;
      }

      const updatedNotification = await updateNotificationStatus(
        req.body.notificationId,
        {
          isRead: req.body.isRead,
          actionTaken: req.body.actionTaken
        }
      );
      
      return res.status(200).json(successResponse(updatedNotification));
    }

    return res.status(405).json(ErrorResponses.methodNotAllowed(['GET', 'POST', 'PUT']));

  } catch (error) {
    console.error('[Notifications API] Error:', error);
    console.error('[Notifications API] Error stack:', (error as Error).stack);
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Notification operation failed',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}
