import sql from '../_lib/db';

export interface CustomerNotification {
  id: string;
  customerId: string;
  businessId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  referenceId?: string;
  requiresAction: boolean;
  actionTaken: boolean;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Server-side service for customer-specific notifications
 * All database operations for customer notifications
 */
export class CustomerNotificationServerService {
  /**
   * Get customer notifications
   */
  static async getCustomerNotifications(
    customerId: string,
    filters?: { unreadOnly?: boolean; requiresAction?: boolean; limit?: number }
  ): Promise<CustomerNotification[]> {
    try {
      const customerIdInt = parseInt(customerId);
      const limit = filters?.limit || 50;
      
      let conditions = [`customer_id = ${customerIdInt}`];
      
      if (filters?.unreadOnly) {
        conditions.push('is_read = false');
      }
      
      if (filters?.requiresAction) {
        conditions.push('requires_action = true');
        conditions.push('action_taken = false');
      }

      const whereClause = conditions.join(' AND ');

      const result = await sql.unsafe(`
        SELECT 
          id::text,
          customer_id::text as "customerId",
          business_id::text as "businessId",
          type,
          title,
          message,
          data,
          reference_id as "referenceId",
          requires_action as "requiresAction",
          action_taken as "actionTaken",
          is_read as "isRead",
          read_at as "readAt",
          created_at as "createdAt",
          expires_at as "expiresAt"
        FROM customer_notifications
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);

      return result as unknown as CustomerNotification[];
    } catch (error) {
      console.error('Error getting customer notifications:', error);
      return [];
    }
  }

  /**
   * Send enrollment request
   */
  static async sendEnrollmentRequest(
    customerId: string,
    businessId: string,
    programId: string
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const customerIdInt = parseInt(customerId);
      const businessIdInt = parseInt(businessId);
      const programIdInt = parseInt(programId);

      // Get program info
      const program = await sql`
        SELECT name FROM loyalty_programs WHERE id = ${programIdInt}
      `;

      if (program.length === 0) {
        return { success: false, error: 'Program not found' };
      }

      // Check if request already exists
      const existing = await sql`
        SELECT id FROM customer_notifications
        WHERE customer_id = ${customerIdInt}
        AND type = 'ENROLLMENT_REQUEST'
        AND data::jsonb->>'programId' = ${programIdInt.toString()}
        AND requires_action = true
        AND action_taken = false
      `;

      if (existing.length > 0) {
        return { success: false, error: 'Enrollment request already pending' };
      }

      const result = await sql`
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
          ${businessIdInt},
          'ENROLLMENT_REQUEST',
          'Enrollment Invitation',
          ${`You've been invited to join ${program[0].name}`},
          ${JSON.stringify({ programId: programIdInt, programName: program[0].name })},
          true,
          false,
          false,
          NOW()
        ) RETURNING id::text
      `;

      return {
        success: true,
        notificationId: result[0].id
      };
    } catch (error) {
      console.error('Error sending enrollment request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Respond to enrollment request
   */
  static async respondToEnrollment(
    notificationId: string,
    customerId: string,
    accept: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get notification
      const notification = await sql`
        SELECT customer_id, business_id, data, action_taken
        FROM customer_notifications
        WHERE id = ${notificationId}
        AND type = 'ENROLLMENT_REQUEST'
      `;

      if (notification.length === 0) {
        return { success: false, error: 'Notification not found' };
      }

      const notif = notification[0];
      const customerIdInt = parseInt(customerId);

      // Verify ownership
      if (notif.customer_id !== customerIdInt) {
        return { success: false, error: 'Unauthorized' };
      }

      if (notif.action_taken) {
        return { success: false, error: 'Already responded' };
      }

      const data = notif.data || {};
      const programId = parseInt(data.programId);

      if (accept) {
        // Enroll customer
        await sql`
          INSERT INTO customer_programs (customer_id, program_id, current_points, enrolled_at)
          VALUES (${customerIdInt}, ${programId}, 0, NOW())
          ON CONFLICT (customer_id, program_id) DO NOTHING
        `;

        // Create loyalty card
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
            ${customerIdInt},
            ${notif.business_id},
            ${programId},
            0,
            ${`GC-${customerIdInt.toString().padStart(6, '0')}-${programId}`},
            true,
            NOW()
          )
          ON CONFLICT (customer_id, program_id) DO NOTHING
        `;
      }

      // Mark notification as action taken
      await sql`
        UPDATE customer_notifications
        SET action_taken = true, is_read = true, read_at = NOW(), updated_at = NOW()
        WHERE id = ${notificationId}
      `;

      return { success: true };
    } catch (error) {
      console.error('Error responding to enrollment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send points notification
   */
  static async sendPointsNotification(
    customerId: string,
    businessId: string,
    programId: string,
    points: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const customerIdInt = parseInt(customerId);
      const businessIdInt = parseInt(businessId);

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
          ${customerIdInt},
          ${businessIdInt},
          'POINTS_ADDED',
          'Points Earned',
          ${`You earned ${points} points!`},
          ${JSON.stringify({ points, programId })},
          false,
          true,
          false,
          NOW()
        )
      `;

      return { success: true };
    } catch (error) {
      console.error('Error sending points notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

