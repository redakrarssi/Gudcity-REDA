import sql from '../utils/db';

export interface Customer {
  id: string;
  userId?: string;
  name: string;
  email: string;
  tier: string;
  loyaltyPoints: number;
  totalSpent: number;
  visits: number;
  birthday?: string;
  lastVisit?: string;
  joinedAt: string;
  notes?: string;
  phone?: string;
  address?: string;
  favoriteItems: string[];
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
 * Service for managing customer data with database integration
 */
export class CustomerService {
  /**
   * Get all customers for a business
   */
  static async getBusinessCustomers(businessId: string): Promise<Customer[]> {
    try {
      // Get customers that have interacted with this business via transactions, enrollments or loyalty cards
      const customers = await sql`
        SELECT DISTINCT c.* 
        FROM customers c
        LEFT JOIN program_enrollments pe ON pe.customer_id = c.id::text
        LEFT JOIN loyalty_programs lp ON lp.id = pe.program_id
        LEFT JOIN loyalty_transactions lt ON lt.customer_id = c.id::text
        LEFT JOIN loyalty_cards lc ON lc.customer_id = c.id AND lc.business_id = ${businessId}
        WHERE lp.business_id = ${businessId} 
        OR lt.business_id = ${businessId}
        OR lc.business_id = ${businessId}
        ORDER BY c.name ASC
      `;
      
      if (!customers.length) {
        return [];
      }
      
      // For each customer, fetch their favorite items and program information
      const customersWithDetails = await Promise.all(
        customers.map(async (customer: any) => {
          const favoriteItems = await this.getCustomerFavoriteItems(customer.id);
          
          // Get customer's loyalty points for this specific business
          const pointsResult = await sql`
            SELECT SUM(current_points) as total_points
            FROM program_enrollments pe
            JOIN loyalty_programs lp ON pe.program_id = lp.id
            WHERE pe.customer_id = ${customer.id.toString()}
            AND lp.business_id = ${businessId}
          `;
          
          const businessPoints = pointsResult.length > 0 ? 
            parseInt(pointsResult[0].total_points) || 0 : 
            customer.loyalty_points;
          
          return {
            id: customer.id,
            userId: customer.user_id,
            name: customer.name,
            email: customer.email,
            tier: customer.tier,
            loyaltyPoints: businessPoints,
            totalSpent: parseFloat(customer.total_spent) || 0,
            visits: customer.visits,
            birthday: customer.birthday,
            lastVisit: customer.last_visit,
            joinedAt: customer.joined_at,
            notes: customer.notes,
            phone: customer.phone,
            address: customer.address,
            favoriteItems
          } as Customer;
        })
      );
      
      return customersWithDetails;
    } catch (error) {
      console.error('Error fetching business customers:', error);
      return [];
    }
  }

  /**
   * Get a specific customer by ID
   */
  static async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      const customers = await sql`
        SELECT * FROM customers
        WHERE id = ${customerId}
      `;
      
      if (!customers.length) {
        return null;
      }
      
      const customer = customers[0];
      const favoriteItems = await this.getCustomerFavoriteItems(customerId);
      
      return {
        id: customer.id,
        userId: customer.user_id,
        name: customer.name,
        email: customer.email,
        tier: customer.tier,
        loyaltyPoints: customer.loyalty_points,
        totalSpent: parseFloat(customer.total_spent) || 0,
        visits: customer.visits,
        birthday: customer.birthday,
        lastVisit: customer.last_visit,
        joinedAt: customer.joined_at,
        notes: customer.notes,
        phone: customer.phone,
        address: customer.address,
        favoriteItems
      } as Customer;
    } catch (error) {
      console.error(`Error fetching customer ${customerId}:`, error);
      return null;
    }
  }

  /**
   * Get favorite items for a specific customer
   */
  static async getCustomerFavoriteItems(customerId: string): Promise<string[]> {
    try {
      const items = await sql`
        SELECT item_name 
        FROM customer_favorite_items
        WHERE customer_id = ${customerId}
        ORDER BY created_at ASC
      `;
      
      return items.map((item: any) => item.item_name);
    } catch (error) {
      console.error(`Error fetching favorite items for customer ${customerId}:`, error);
      return [];
    }
  }

  /**
   * Search for customers by name or email
   */
  static async searchCustomers(businessId: string, searchTerm: string): Promise<Customer[]> {
    try {
      const customers = await sql`
        SELECT DISTINCT c.* 
        FROM customers c
        LEFT JOIN program_enrollments pe ON pe.customer_id = c.id::text
        LEFT JOIN loyalty_programs lp ON lp.id = pe.program_id
        LEFT JOIN loyalty_transactions lt ON lt.customer_id = c.id::text
        LEFT JOIN loyalty_cards lc ON lc.customer_id = c.id AND lc.business_id = ${businessId}
        WHERE (lp.business_id = ${businessId} OR lt.business_id = ${businessId} OR lc.business_id = ${businessId})
        AND (
          c.name ILIKE ${'%' + searchTerm + '%'}
          OR c.email ILIKE ${'%' + searchTerm + '%'}
        )
        ORDER BY c.name ASC
      `;
      
      if (!customers.length) {
        return [];
      }
      
      // For each customer, fetch their favorite items and program information
      const customersWithDetails = await Promise.all(
        customers.map(async (customer: any) => {
          const favoriteItems = await this.getCustomerFavoriteItems(customer.id);
          
          // Get customer's loyalty points for this specific business
          const pointsResult = await sql`
            SELECT SUM(current_points) as total_points
            FROM program_enrollments pe
            JOIN loyalty_programs lp ON pe.program_id = lp.id
            WHERE pe.customer_id = ${customer.id.toString()}
            AND lp.business_id = ${businessId}
          `;
          
          const businessPoints = pointsResult.length > 0 ? 
            parseInt(pointsResult[0].total_points) || 0 : 
            customer.loyalty_points;
          
          return {
            id: customer.id,
            userId: customer.user_id,
            name: customer.name,
            email: customer.email,
            tier: customer.tier,
            loyaltyPoints: businessPoints,
            totalSpent: parseFloat(customer.total_spent) || 0,
            visits: customer.visits,
            birthday: customer.birthday,
            lastVisit: customer.last_visit,
            joinedAt: customer.joined_at,
            notes: customer.notes,
            phone: customer.phone,
            address: customer.address,
            favoriteItems
          } as Customer;
        })
      );
      
      return customersWithDetails;
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  }

  /**
   * Record a customer interaction (message, gift, birthday wish, etc.)
   */
  static async recordCustomerInteraction(
    customerId: string,
    businessId: string,
    type: string,
    message?: string
  ): Promise<boolean> {
    try {
      await sql`
        INSERT INTO customer_interactions (
          customer_id,
          business_id,
          type,
          message,
          happened_at
        )
        VALUES (
          ${customerId},
          ${businessId},
          ${type},
          ${message || null},
          NOW()
        )
      `;
      
      return true;
    } catch (error) {
      console.error('Error recording customer interaction:', error);
      return false;
    }
  }

  /**
   * Get recent interactions for a customer
   */
  static async getCustomerInteractions(
    customerId: string,
    businessId: string,
    limit: number = 10
  ): Promise<CustomerInteraction[]> {
    try {
      const interactions = await sql`
        SELECT * FROM customer_interactions
        WHERE customer_id = ${customerId}
        AND business_id = ${businessId}
        ORDER BY happened_at DESC
        LIMIT ${limit}
      `;
      
      return interactions.map((interaction: any) => ({
        id: interaction.id,
        customerId: interaction.customer_id,
        businessId: interaction.business_id,
        type: interaction.type,
        message: interaction.message,
        happenedAt: interaction.happened_at
      }));
    } catch (error) {
      console.error(`Error fetching interactions for customer ${customerId}:`, error);
      return [];
    }
  }

  /**
   * Associate a customer with a business
   */
  static async associateCustomerWithBusiness(
    customerId: string,
    businessId: string,
    programId: string
  ): Promise<boolean> {
    try {
      // Check if already associated through program_enrollments
      const enrollmentCheck = await sql`
        SELECT id FROM program_enrollments pe
        JOIN loyalty_programs lp ON pe.program_id = lp.id
        WHERE pe.customer_id = ${customerId}
        AND lp.business_id = ${businessId}
      `;
      
      // If no enrollment exists, create one
      if (enrollmentCheck.length === 0) {
        await sql`
          INSERT INTO program_enrollments (
            program_id,
            customer_id,
            current_points,
            last_activity,
            enrolled_at
          ) VALUES (
            ${programId},
            ${customerId},
            0,
            NOW(),
            NOW()
          )
        `;
      }
      
      // Check if there's any transaction history
      const transactionCheck = await sql`
        SELECT COUNT(*) as count 
        FROM loyalty_transactions
        WHERE customer_id = ${customerId}
        AND business_id = ${businessId}
      `;
      
      // If no transaction exists, create an initial one
      if (transactionCheck.length === 0 || parseInt(transactionCheck[0].count) === 0) {
        await sql`
          INSERT INTO loyalty_transactions (
            program_id,
            customer_id,
            business_id,
            type,
            points,
            amount,
            created_at
          ) VALUES (
            ${programId},
            ${customerId},
            ${businessId},
            'ENROLL',
            0,
            0,
            NOW()
          )
        `;
      }
      
      return true;
    } catch (error) {
      console.error('Error associating customer with business:', error);
      return false;
    }
  }
} 