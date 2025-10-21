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

    const { notificationId, accept } = req.body;

    // Validate required fields
    if (!notificationId || typeof accept !== 'boolean') {
      return res.status(400).json(formatErrorResponse('Missing required fields: notificationId, accept', 400));
    }

    // Get the notification
    const notification = await sql`
      SELECT 
        id,
        customer_id,
        business_id,
        type,
        data,
        requires_action,
        action_taken
      FROM customer_notifications
      WHERE id = ${notificationId}
    `;

    if (notification.length === 0) {
      return res.status(404).json(formatErrorResponse('Notification not found', 404));
    }

    const notif = notification[0];

    // Verify the customer owns this notification
    if (authResult.user.user_type === 'customer' && authResult.user.id !== notif.customer_id) {
      return res.status(403).json(formatErrorResponse('Access denied', 403));
    }

    // Verify it's an enrollment request
    if (notif.type !== 'ENROLLMENT_REQUEST') {
      return res.status(400).json(formatErrorResponse('This is not an enrollment request', 400));
    }

    // Verify it hasn't been responded to already
    if (notif.action_taken) {
      return res.status(400).json(formatErrorResponse('This enrollment request has already been responded to', 400));
    }

    const data = notif.data || {};
    const programId = parseInt(data.programId);
    const customerId = notif.customer_id;

    if (accept) {
      // Check if already enrolled (race condition protection)
      const existing = await sql`
        SELECT id FROM customer_programs
        WHERE customer_id = ${customerId}
        AND program_id = ${programId}
      `;

      if (existing.length === 0) {
        // Enroll the customer
        await sql`
          INSERT INTO customer_programs (
            customer_id,
            program_id,
            current_points,
            enrolled_at
          ) VALUES (
            ${customerId},
            ${programId},
            0,
            NOW()
          )
        `;

        // Create a loyalty card for this enrollment
        await sql`
          INSERT INTO loyalty_cards (
            customer_id,
            business_id,
            program_id,
            points,
            card_number,
            is_active,
            created_at
          ) VALUES (
            ${customerId},
            ${notif.business_id},
            ${programId},
            0,
            ${`GC-${customerId.toString().padStart(6, '0')}-${programId}`},
            true,
            NOW()
          )
        `;

        // Create a confirmation notification
        await sql`
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
            ${customerId},
            ${notif.business_id},
            'PROGRAM_ENROLLED',
            'Enrollment Confirmed',
            ${`You've successfully enrolled in ${data.programName || 'the program'}`},
            ${JSON.stringify({
              programId,
              programName: data.programName
            })},
            false,
            true,
            false,
            NOW()
          )
        `;
      }
    }

    // Mark the enrollment request as action taken
    await sql`
      UPDATE customer_notifications
      SET 
        action_taken = true,
        is_read = true,
        read_at = NOW(),
        updated_at = NOW()
      WHERE id = ${notificationId}
    `;

    return res.status(200).json(formatSuccessResponse({
      message: accept ? 'Enrollment accepted successfully' : 'Enrollment declined',
      enrolled: accept
    }));
  } catch (error) {
    console.error('Error responding to enrollment request:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

