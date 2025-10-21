import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../_lib/auth';
import { formatSuccessResponse, formatErrorResponse } from '../../_services/responseFormatter';
import sql from '../../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json(formatErrorResponse('Method not allowed', 405));
  }

  try {
    // Authenticate the request
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return res.status(401).json(formatErrorResponse('Unauthorized', 401));
    }

    const { customerId, programId } = req.body;

    // Validate required fields
    if (!customerId || !programId) {
      return res.status(400).json(formatErrorResponse('Missing required fields: customerId, programId', 400));
    }

    const customerIdInt = parseInt(customerId);
    const programIdInt = parseInt(programId);
    const businessId = authResult.user.id;

    // Verify the program belongs to this business
    const program = await sql`
      SELECT id, name, business_id 
      FROM loyalty_programs 
      WHERE id = ${programIdInt}
    `;

    if (program.length === 0) {
      return res.status(404).json(formatErrorResponse('Program not found', 404));
    }

    if (authResult.user.user_type === 'business' && program[0].business_id !== businessId) {
      return res.status(403).json(formatErrorResponse('You can only send enrollment requests for your own programs', 403));
    }

    // Check if customer is already enrolled
    const existing = await sql`
      SELECT id FROM customer_programs
      WHERE customer_id = ${customerIdInt}
      AND program_id = ${programIdInt}
    `;

    if (existing.length > 0) {
      return res.status(400).json(formatErrorResponse('Customer is already enrolled in this program', 400));
    }

    // Check if there's already a pending enrollment request
    const pendingRequest = await sql`
      SELECT id FROM customer_notifications
      WHERE customer_id = ${customerIdInt}
      AND type = 'ENROLLMENT_REQUEST'
      AND data::jsonb->>'programId' = ${programIdInt.toString()}
      AND requires_action = true
      AND action_taken = false
    `;

    if (pendingRequest.length > 0) {
      return res.status(400).json(formatErrorResponse('Enrollment request already pending', 400));
    }

    // Get customer info
    const customer = await sql`
      SELECT name, email FROM users WHERE id = ${customerIdInt}
    `;

    if (customer.length === 0) {
      return res.status(404).json(formatErrorResponse('Customer not found', 404));
    }

    // Create enrollment request notification
    const notification = await sql`
      INSERT INTO customer_notifications (
        id,
        customer_id,
        business_id,
        type,
        title,
        message,
        data,
        requires_action,
        action_taken,
        is_read,
        created_at
      ) VALUES (
        gen_random_uuid(),
        ${customerIdInt},
        ${program[0].business_id},
        'ENROLLMENT_REQUEST',
        'Enrollment Request',
        ${`You've been invited to join ${program[0].name}`},
        ${JSON.stringify({
          programId: programIdInt,
          programName: program[0].name,
          businessId: program[0].business_id
        })},
        true,
        false,
        false,
        NOW()
      ) RETURNING id::text, created_at as "createdAt"
    `;

    return res.status(200).json(formatSuccessResponse({
      notificationId: notification[0].id,
      message: 'Enrollment request sent successfully'
    }));
  } catch (error) {
    console.error('Error sending enrollment request:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

