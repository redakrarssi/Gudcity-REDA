import sql from '../utils/db';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tier: string;
  points?: number;
  loyaltyPoints: number;
  visits: number;
  totalSpent: number;
  lastVisit?: string;
  favoriteItems: string[];
  birthday?: string;
  joinedAt?: string;
  notes?: string;
  status: string;
}

export interface CustomerInteraction {
  id: string;
  customerId: string;
  businessId: string;
  type: string;
  message?: string;
  happenedAt: string;
}

/**
 * Service for managing customer data and business-customer relationships
 */
export class CustomerService {
  /**
   * Get customers enrolled in a business's programs
   * This properly joins business programs with customer enrollments
   */
  static async getBusinessCustomers(businessId: string): Promise<Customer[]> {
    try {
      console.log(`Fetching customers for business ID: ${businessId}`);
      
      // Get customers who are enrolled in this business's loyalty programs
      const customers = await sql`
        SELECT DISTINCT
          c.id,
          c.name,
          c.email,
          c.phone,
          c.tier,
          c.status,
          c.created_at as joined_at,
          c.notes,
          COALESCE(SUM(pe.current_points), 0) as loyalty_points,
          COUNT(DISTINCT pe.program_id) as visits,
          COALESCE(SUM(lt.amount), 0) as total_spent,
          MAX(lt.transaction_date) as last_visit,
          ARRAY_AGG(DISTINCT lp.name) FILTER (WHERE lp.name IS NOT NULL) as enrolled_programs
        FROM users c
        JOIN program_enrollments pe ON c.id::text = pe.customer_id
        JOIN loyalty_programs lp ON pe.program_id = lp.id
        LEFT JOIN loyalty_transactions lt ON c.id::text = lt.customer_id AND lt.business_id = ${businessId}
        WHERE c.user_type = 'customer' 
          AND c.status = 'active'
          AND lp.business_id = ${businessId}
          AND pe.status = 'ACTIVE'
        GROUP BY c.id, c.name, c.email, c.phone, c.tier, c.status, c.created_at, c.notes
        ORDER BY c.name ASC
      `;
      
      console.log(`Found ${customers.length} customers for business ${businessId}`);
      
      const formattedCustomers = customers.map(customer => ({
        id: customer.id.toString(),
        name: customer.name || 'Unknown Customer',
        email: customer.email || '',
        phone: customer.phone || '',
        tier: customer.tier || 'Bronze',
        loyaltyPoints: parseInt(customer.loyalty_points) || 0,
        points: parseInt(customer.loyalty_points) || 0,
        visits: parseInt(customer.visits) || 0,
        totalSpent: parseFloat(customer.total_spent) || 0,
        lastVisit: customer.last_visit ? new Date(customer.last_visit).toISOString() : undefined,
        favoriteItems: [], // TODO: Implement favorite items tracking
        birthday: customer.birthday || undefined,
        joinedAt: customer.joined_at ? new Date(customer.joined_at).toISOString() : undefined,
        notes: customer.notes || '',
        status: customer.status || 'active'
      }));
      
      return formattedCustomers;
    } catch (error) {
      console.error('Error fetching business customers:', error);
      return [];
    }
  }

  /**
   * Get a customer by ID
   */
  static async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      const customers = await sql`
        SELECT 
          c.*,
          COALESCE(SUM(pe.current_points), 0) as total_loyalty_points,
          COUNT(DISTINCT pe.program_id) as program_count
        FROM users c
        LEFT JOIN program_enrollments pe ON c.id::text = pe.customer_id AND pe.status = 'ACTIVE'
        WHERE c.id = ${customerId} AND c.user_type = 'customer'
        GROUP BY c.id
      `;
      
      if (!customers.length) {
        return null;
      }
      
      const customer = customers[0];
      return {
        id: customer.id.toString(),
        name: customer.name || 'Unknown Customer',
        email: customer.email || '',
        phone: customer.phone || '',
        tier: customer.tier || 'Bronze',
        loyaltyPoints: parseInt(customer.total_loyalty_points) || 0,
        points: parseInt(customer.total_loyalty_points) || 0,
        visits: parseInt(customer.program_count) || 0,
        totalSpent: 0, // TODO: Calculate from transactions
        favoriteItems: [],
        joinedAt: customer.created_at ? new Date(customer.created_at).toISOString() : undefined,
        notes: customer.notes || '',
        status: customer.status || 'active'
      };
    } catch (error) {
      console.error('Error fetching customer by ID:', error);
      return null;
    }
  }

  /**
   * Record a customer interaction for business analytics
   */
  static async recordCustomerInteraction(
    customerId: string,
    businessId: string,
    interactionType: string,
    description: string
  ): Promise<boolean> {
    try {
      await sql`
        INSERT INTO customer_interactions (
          customer_id,
          business_id,
          interaction_type,
          description,
          created_at
        )
        VALUES (
          ${customerId},
          ${businessId},
          ${interactionType},
          ${description},
          NOW()
        )
      `;
      
      // TODO: Emit customer event for real-time updates
      // emitCustomerEvent(customerId, businessId, interactionType, description);
      
      return true;
    } catch (error) {
      console.error('Error recording customer interaction:', error);
      return false;
    }
  }

  /**
   * Create customer interactions table if it doesn't exist
   */
  static async ensureInteractionsTable(): Promise<void> {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS customer_interactions (
          id SERIAL PRIMARY KEY,
          customer_id VARCHAR(255) NOT NULL,
          business_id VARCHAR(255) NOT NULL,
          interaction_type VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer 
        ON customer_interactions(customer_id)
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_customer_interactions_business 
        ON customer_interactions(business_id)
      `;
    } catch (error) {
      console.error('Error ensuring interactions table:', error);
    }
  }

  /**
   * Refresh business customers data and trigger real-time sync
   */
  static async refreshBusinessCustomers(businessId: string): Promise<void> {
    try {
      // Trigger a refresh by updating the business's updated_at timestamp
      await sql`
        UPDATE businesses 
        SET updated_at = NOW() 
        WHERE id = ${businessId}
      `;
      
      // TODO: Emit event for real-time sync
      // emitCustomerEvent('refresh', businessId, 'REFRESH', 'Customer list refreshed');
    } catch (error) {
      console.error('Error refreshing business customers:', error);
    }
  }

  /**
   * Get customer enrollment status for a business
   */
  static async getCustomerEnrollmentStatus(customerId: string, businessId: string): Promise<{
    isEnrolled: boolean;
    programIds: string[];
    totalPoints: number;
  }> {
    try {
      const enrollments = await sql`
        SELECT 
          pe.program_id,
          pe.current_points,
          lp.name as program_name
        FROM program_enrollments pe
        JOIN loyalty_programs lp ON pe.program_id = lp.id
        WHERE pe.customer_id = ${customerId} 
          AND lp.business_id = ${businessId}
          AND pe.status = 'ACTIVE'
      `;
      
      const programIds = enrollments.map(e => e.program_id.toString());
      const totalPoints = enrollments.reduce((sum, e) => sum + (e.current_points || 0), 0);
      
      return {
        isEnrolled: enrollments.length > 0,
        programIds,
        totalPoints
      };
    } catch (error) {
      console.error('Error getting customer enrollment status:', error);
      return {
        isEnrolled: false,
        programIds: [],
        totalPoints: 0
      };
    }
  }
}

// Initialize interactions table when service is imported
CustomerService.ensureInteractionsTable().catch(console.error); 