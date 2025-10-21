import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../_lib/auth';
import { SettingsServerService } from '../../_services/settingsServerService';
import { formatSuccessResponse, formatErrorResponse } from '../../_services/responseFormatter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return res.status(401).json(formatErrorResponse('Unauthorized', 401));
    }

    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json(formatErrorResponse('Business ID is required', 400));
    }

    // Authorization check - only the business owner or admin can access settings
    if (
      authResult.user.user_type !== 'admin' &&
      authResult.user.id.toString() !== businessId
    ) {
      return res.status(403).json(formatErrorResponse('Access denied', 403));
    }

    if (req.method === 'GET') {
      const settings = await SettingsServerService.getBusinessSettings(businessId as string);
      
      if (!settings) {
        return res.status(404).json(formatErrorResponse('Business settings not found', 404));
      }

      return res.status(200).json(formatSuccessResponse(settings));
    } else if (req.method === 'PUT' || req.method === 'PATCH') {
      const updates = req.body;

      if (!updates) {
        return res.status(400).json(formatErrorResponse('Settings data is required', 400));
      }

      const result = await SettingsServerService.updateBusinessSettings(
        businessId as string,
        updates
      );

      if (!result.success) {
        return res.status(400).json(formatErrorResponse(result.error || 'Failed to update settings', 400));
      }

      return res.status(200).json(formatSuccessResponse(result.settings, 'Settings updated successfully'));
    } else {
      return res.status(405).json(formatErrorResponse('Method not allowed', 405));
    }
  } catch (error) {
    console.error('Error in business settings endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

