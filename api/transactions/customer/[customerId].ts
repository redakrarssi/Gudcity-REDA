import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../_lib/auth';
import { TransactionServerService } from '../../_services/transactionServerService';
import { formatSuccessResponse, formatErrorResponse } from '../../_services/responseFormatter';

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

    const { customerId } = req.query;
    const { programId } = req.query;

    if (!customerId) {
      return res.status(400).json(formatErrorResponse('Customer ID is required', 400));
    }

    // Authorization check - customers can only see their own transactions
    if (authResult.user.user_type === 'customer' && authResult.user.id.toString() !== customerId) {
      return res.status(403).json(formatErrorResponse('Access denied', 403));
    }

    const transactions = await TransactionServerService.getCustomerTransactions(
      customerId as string,
      programId as string | undefined
    );

    return res.status(200).json(formatSuccessResponse({
      transactions,
      count: transactions.length
    }));
  } catch (error) {
    console.error('Error in customer transactions endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

