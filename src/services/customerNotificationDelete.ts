// Helper service to safely delete notifications without modifying core service implementation
import sql from '../utils/db';

/**
 * Permanently delete a customer notification.
 * Returns true if a row was removed.
 */
export async function deleteCustomerNotification(notificationId: string, customerId?: string): Promise<boolean> {
  try {
    const result = customerId
      ? await sql`
          DELETE FROM customer_notifications
          WHERE id = ${notificationId} AND customer_id = ${parseInt(customerId)}
          RETURNING id
        `
      : await sql`
          DELETE FROM customer_notifications
          WHERE id = ${notificationId}
          RETURNING id
        `;

    return result.length > 0;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
} 