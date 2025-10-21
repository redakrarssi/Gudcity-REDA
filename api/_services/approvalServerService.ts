import sql from '../_lib/db';

export interface Approval {
  id: string;
  type: 'business' | 'program' | 'user' | 'payout';
  name: string;
  submittedBy: string;
  email: string;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  details?: any;
}

/**
 * Server-side service for handling approvals
 * All database operations for approval management
 */
export class ApprovalServerService {
  /**
   * Get all approvals
   */
  static async getAllApprovals(): Promise<Approval[]> {
    try {
      // Get business applications/approvals
      const businessApprovals = await sql`
        SELECT 
          id::text,
          'business' as type,
          business_name as name,
          contact_name as "submittedBy",
          business_email as email,
          created_at as "submittedAt",
          status
        FROM business_applications
        ORDER BY created_at DESC
      `;

      return businessApprovals as unknown as Approval[];
    } catch (error) {
      console.error('Error getting all approvals:', error);
      return [];
    }
  }

  /**
   * Get approvals by type
   */
  static async getApprovalsByType(type: Approval['type']): Promise<Approval[]> {
    try {
      if (type === 'business') {
        const result = await sql`
          SELECT 
            id::text,
            'business' as type,
            business_name as name,
            contact_name as "submittedBy",
            business_email as email,
            created_at as "submittedAt",
            status
          FROM business_applications
          ORDER BY created_at DESC
        `;
        return result as unknown as Approval[];
      }

      // Add other types as needed
      return [];
    } catch (error) {
      console.error(`Error getting approvals by type ${type}:`, error);
      return [];
    }
  }

  /**
   * Get approval by ID
   */
  static async getApprovalById(id: string, type: Approval['type']): Promise<Approval | null> {
    try {
      const idInt = parseInt(id);

      if (type === 'business') {
        const result = await sql`
          SELECT 
            id::text,
            'business' as type,
            business_name as name,
            contact_name as "submittedBy",
            business_email as email,
            created_at as "submittedAt",
            status,
            business_address as address,
            business_phone as phone
          FROM business_applications
          WHERE id = ${idInt}
        `;

        if (result.length === 0) {
          return null;
        }

        return result[0] as unknown as Approval;
      }

      return null;
    } catch (error) {
      console.error(`Error getting approval by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Approve an approval request
   */
  static async approveRequest(
    id: string,
    type: Approval['type'],
    approvedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const idInt = parseInt(id);
      const approvedByInt = parseInt(approvedBy);

      if (type === 'business') {
        // Update business application status
        await sql`
          UPDATE business_applications
          SET 
            status = 'approved',
            reviewed_by = ${approvedByInt},
            reviewed_at = NOW(),
            updated_at = NOW()
          WHERE id = ${idInt}
        `;

        return { success: true };
      }

      return { success: false, error: 'Invalid approval type' };
    } catch (error) {
      console.error('Error approving request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Reject an approval request
   */
  static async rejectRequest(
    id: string,
    type: Approval['type'],
    rejectedBy: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const idInt = parseInt(id);
      const rejectedByInt = parseInt(rejectedBy);

      if (type === 'business') {
        await sql`
          UPDATE business_applications
          SET 
            status = 'rejected',
            rejection_reason = ${reason || 'No reason provided'},
            reviewed_by = ${rejectedByInt},
            reviewed_at = NOW(),
            updated_at = NOW()
          WHERE id = ${idInt}
        `;

        return { success: true };
      }

      return { success: false, error: 'Invalid approval type' };
    } catch (error) {
      console.error('Error rejecting request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get approval statistics
   */
  static async getApprovalStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    try {
      const stats = await sql`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          COUNT(*) as total
        FROM business_applications
      `;

      return {
        pending: parseInt(stats[0].pending) || 0,
        approved: parseInt(stats[0].approved) || 0,
        rejected: parseInt(stats[0].rejected) || 0,
        total: parseInt(stats[0].total) || 0
      };
    } catch (error) {
      console.error('Error getting approval stats:', error);
      return { pending: 0, approved: 0, rejected: 0, total: 0 };
    }
  }
}

