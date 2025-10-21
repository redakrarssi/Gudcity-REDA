import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { TransactionServerService } from '../_services/transactionServerService';
import { formatSuccessResponse, formatErrorResponse } from '../_services/responseFormatter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json(formatErrorResponse('Method not allowed', 405));
  }

  try {
    // Authenticate the request
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return res.status(401).json(formatErrorResponse('Unauthorized', 401));
    }

    // Parse query parameters
    const { customerId, businessId, programId, startDate, endDate, type } = req.query;

    // Build filters
    const filters: any = {};

    if (customerId) {
      filters.customerId = customerId as string;
    }

    if (businessId) {
      filters.businessId = businessId as string;
    }

    if (programId) {
      filters.programId = programId as string;
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    if (type) {
      filters.type = type as string;
    }

    // Authorization check
    if (authResult.user.user_type === 'customer') {
      // Customers can only see their own transactions
      filters.customerId = authResult.user.id.toString();
    } else if (authResult.user.user_type === 'business') {
      // Businesses can only see their own transactions
      filters.businessId = authResult.user.id.toString();
    }
    // Admin can see all transactions

    const transactions = await TransactionServerService.getTransactions(filters);

    return res.status(200).json(formatSuccessResponse({
      transactions,
      count: transactions.length
    }));
  } catch (error) {
    console.error('Error in transactions list endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

