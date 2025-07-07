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
      
      // Convert businessId to integer for database comparison
      const businessIdInt = parseInt(businessId, 10);
      
      // Get customers who are enrolled in this business's loyalty programs
      // or have a direct business relationship
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
          COUNT(DISTINCT pe.program_id) as enrolled_programs_count,
          COALESCE(SUM(lt.amount), 0) as total_spent,
          MAX(lt.transaction_date) as last_visit
        FROM users c
        LEFT JOIN program_enrollments pe ON c.id::text = pe.customer_id
        LEFT JOIN loyalty_programs lp ON pe.program_id = lp.id
        LEFT JOIN loyalty_transactions lt ON c.id::text = lt.customer_id AND lt.business_id = ${businessIdInt}
        LEFT JOIN customer_business_relationships cbr ON c.id::text = cbr.customer_id AND cbr.business_id = ${businessIdInt}
        WHERE c.user_type = 'customer' 
          AND c.status = 'active'
          AND (
            (lp.business_id = ${businessIdInt} AND pe.status = 'ACTIVE')
            OR
            (cbr.business_id = ${businessIdInt} AND cbr.status = 'ACTIVE')
          )
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
        visits: parseInt(customer.enrolled_programs_count) || 0,
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
    customerName?: string;
    businessName?: string;
    programs?: { id: string, name: string, points: number }[];
  }> {
    try {
      console.log(`Checking enrollment status for customer ${customerId} with business ${businessId}`);
      
      // First check for enrollments in loyalty programs
      const enrollments = await sql`
        SELECT 
          pe.program_id,
          pe.current_points,
          lp.name as program_name,
          c.name as customer_name,
          b.name as business_name
        FROM program_enrollments pe
        JOIN loyalty_programs lp ON pe.program_id = lp.id
        JOIN users c ON pe.customer_id = c.id::text
        JOIN users b ON lp.business_id = b.id::text
        WHERE pe.customer_id = ${customerId} 
          AND lp.business_id = ${businessId}
          AND pe.status = 'ACTIVE'
      `;
      
      // If no enrollments found, also check the customer_business_relationships table
      // as a fallback, which might indicate a relationship without specific program enrollment
      let isEnrolled = enrollments.length > 0;
      let customerName = enrollments.length > 0 ? enrollments[0].customer_name : undefined;
      let businessName = enrollments.length > 0 ? enrollments[0].business_name : undefined;
      
      if (!isEnrolled) {
        console.log(`No active program enrollments found, checking business relationships`);
        
        const relationships = await sql`
          SELECT 
            cbr.*,
            c.name as customer_name,
            b.name as business_name
          FROM customer_business_relationships cbr
          JOIN users c ON cbr.customer_id = c.id::text
          JOIN users b ON cbr.business_id = b.id::text
          WHERE cbr.customer_id = ${customerId}
            AND cbr.business_id = ${businessId}
            AND cbr.status = 'ACTIVE'
        `;
        
        if (relationships.length > 0) {
          console.log(`Found business relationship without program enrollment`);
          isEnrolled = true;
          customerName = relationships[0].customer_name;
          businessName = relationships[0].business_name;
        }
      }

      // If still no enrollment, check loyalty cards directly
      // This is another fallback in case program enrollment records are missing
      if (!isEnrolled) {
        console.log(`No active business relationship found, checking loyalty cards`);
        
        const cards = await sql`
          SELECT 
            lc.*,
            c.name as customer_name,
            b.name as business_name,
            lp.id as program_id,
            lp.name as program_name
          FROM loyalty_cards lc
          JOIN users c ON lc.customer_id = c.id::text
          JOIN users b ON lc.business_id = b.id::text
          LEFT JOIN loyalty_programs lp ON lc.program_id = lp.id
          WHERE lc.customer_id = ${customerId}
            AND lc.business_id = ${businessId}
            AND lc.is_active = true
        `;
        
        if (cards.length > 0) {
          console.log(`Found active loyalty cards without program enrollment`);
          isEnrolled = true;
          customerName = cards[0].customer_name;
          businessName = cards[0].business_name;
          
          // Use these cards to determine programIds
          const cardProgramIds = cards.map(card => card.program_id?.toString()).filter(Boolean);
          if (cardProgramIds.length > 0) {
            // If we found program IDs from cards, add them to enrollments
            // This creates synthetic enrollments based on card data
            for (const card of cards) {
              if (card.program_id) {
                enrollments.push({
                  program_id: card.program_id,
                  current_points: card.points || 0,
                  program_name: card.program_name || 'Unknown Program'
                });
              }
            }
          }
        }
      }

      // If we found any form of enrollment, log it
      if (isEnrolled) {
        console.log(`Customer ${customerId} is enrolled with business ${businessId}`);
      } else {
        console.log(`Customer ${customerId} is NOT enrolled with business ${businessId}`);
      }

      // Process enrollments to get program IDs and points
      const programIds = enrollments.map(e => e.program_id.toString());
      const totalPoints = enrollments.reduce((sum, e) => sum + (parseFloat(e.current_points) || 0), 0);

      const programs = enrollments.map(e => ({
        id: e.program_id.toString(),
        name: e.program_name || 'Unknown Program',
        points: parseFloat(e.current_points) || 0
      }));
      
      return {
        isEnrolled,
        programIds,
        totalPoints,
        customerName,
        businessName,
        programs: programs.length > 0 ? programs : undefined
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

  /**
   * Associate a customer with a business
   * This establishes a relationship between a customer and a business
   * through enrollment in a loyalty program
   */
  static async associateCustomerWithBusiness(
    customerId: string,
    businessId: string,
    programId: string
  ): Promise<boolean> {
    try {
      // Check if the customer-business association already exists
      const existingCheck = await sql`
        SELECT * FROM customer_business_relationships
        WHERE customer_id = ${customerId}
          AND business_id = ${businessId}
      `;
      
      // If it doesn't exist, create it
      if (existingCheck.length === 0) {
        await sql`
          CREATE TABLE IF NOT EXISTS customer_business_relationships (
            id SERIAL PRIMARY KEY,
            customer_id VARCHAR(255) NOT NULL,
            business_id VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'ACTIVE',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(customer_id, business_id)
          )
        `;
        
        await sql`
          INSERT INTO customer_business_relationships (
            customer_id,
            business_id,
            status,
            created_at,
            updated_at
          )
          VALUES (
            ${customerId},
            ${businessId},
            'ACTIVE',
            NOW(),
            NOW()
          )
          ON CONFLICT (customer_id, business_id) 
          DO UPDATE SET
            status = 'ACTIVE',
            updated_at = NOW()
        `;
        
        // Record the association event
        await this.recordCustomerInteraction(
          customerId,
          businessId,
          'ASSOCIATION',
          `Customer associated with business through program ${programId}`
        );
      } else {
        // If it exists but might be inactive, reactivate it
        await sql`
          UPDATE customer_business_relationships
          SET 
            status = 'ACTIVE',
            updated_at = NOW()
          WHERE 
            customer_id = ${customerId} AND
            business_id = ${businessId}
        `;
      }
      
      // Import LoyaltyProgramService dynamically to avoid circular dependency
      const { LoyaltyProgramService } = await import('./loyaltyProgramService');
      
      // Enroll the customer in the specified program
      // Set requireApproval to false for direct linking from business side
      const enrollmentResult = await LoyaltyProgramService.enrollCustomer(
        customerId,
        programId,
        false // Auto-approve the enrollment
      );
      
      if (!enrollmentResult.success) {
        console.error('Error enrolling customer in program:', enrollmentResult.error);
        // Continue anyway as the business-customer relationship was established
      }
      
      // Refresh business customers data to ensure UI updates
      await this.refreshBusinessCustomers(businessId);
      
      return true;
    } catch (error) {
      console.error('Error associating customer with business:', error);
      return false;
    }
  }

  /**
   * Search for customers by name or email
   * Used for finding customers to link to a business
   */
  static async searchCustomers(businessId: string, searchTerm: string): Promise<Customer[]> {
    try {
      const query = searchTerm.toLowerCase();
      
      // Search for customers that match the search term
      const result = await sql`
        SELECT 
          id,
          name,
          email,
          phone,
          tier,
          status,
          created_at as joined_at,
          notes
        FROM users
        WHERE user_type = 'customer' 
          AND status = 'active'
          AND (
            LOWER(name) LIKE ${`%${query}%`} OR
            LOWER(email) LIKE ${`%${query}%`}
          )
        ORDER BY name ASC
        LIMIT 20
      `;
      
      // Convert to Customer objects with proper type handling
      const customers: Customer[] = result.map((row: any) => ({
        id: row.id ? row.id.toString() : '',
        name: row.name ? row.name.toString() : 'Unknown Customer',
        email: row.email ? row.email.toString() : '',
        phone: row.phone ? row.phone.toString() : '',
        tier: row.tier ? row.tier.toString() : 'Bronze',
        loyaltyPoints: 0,
        points: 0,
        visits: 0,
        totalSpent: 0,
        favoriteItems: [],
        birthday: undefined,
        joinedAt: row.joined_at ? new Date(row.joined_at).toISOString() : undefined,
        notes: row.notes ? row.notes.toString() : '',
        status: row.status ? row.status.toString() : 'active'
      }));
      
      return customers;
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  }
}

// Initialize interactions table when service is imported
CustomerService.ensureInteractionsTable().catch(console.error); 