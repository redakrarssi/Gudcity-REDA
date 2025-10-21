import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HealthServerService } from '../_services/healthServerService';
import { formatSuccessResponse } from '../_services/responseFormatter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow all methods for ping
  const result = await HealthServerService.ping();
  return res.status(200).json(formatSuccessResponse(result));
}

