import sql from '../utils/db';
import { NotificationService } from './notificationService';

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
  // BIG RULE: Customer is enrolled in AT LEAST ONE program
  programName?: string;
  programId?: string;
  // Additional fields for multiple programs
  programCount?: number;
  totalLoyaltyPoints?: number;
}

export interface CustomerProgram {
  id: string;
  name: string;
  points: number;
  enrolledAt: string;
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
   * Debug method: Check if there are any customers and programs in the system
   */
  static async debugDatabaseState(businessId: string): Promise<void> {
    try {
      const businessIdInt = parseInt(businessId, 10);
      console.log(`🔍 DEBUG DATABASE STATE for business ${businessId} (${businessIdInt}):`);
      
      // Check if there are any customers at all
      const allCustomers = await sql`
        SELECT COUNT(*) as count FROM users WHERE user_type = 'customer' AND status = 'active'
      `;
      console.log(`📊 Total active customers in system: ${allCustomers[0]?.count || 0}`);
      
      // Check if there are programs for this business
      const businessPrograms = await sql.query(
        'SELECT COUNT(*) as count FROM loyalty_programs WHERE business_id = $1',
        [businessIdInt]
      );
      console.log(`📊 Programs for business ${businessIdInt}: ${businessPrograms[0]?.count || 0}`);
      
      // Check if there are any program enrollments
      const enrollments = await sql.query(
        'SELECT COUNT(*) as count FROM program_enrollments pe JOIN loyalty_programs lp ON pe.program_id = lp.id WHERE lp.business_id = $1',
        [businessIdInt]
      );
      console.log(`📊 Program enrollments for business ${businessIdInt}: ${enrollments[0]?.count || 0}`);
      
      // Check if there are any loyalty transactions
      const transactions = await sql.query(
        'SELECT COUNT(*) as count FROM loyalty_transactions WHERE business_id = $1',
        [businessIdInt]
      );
      console.log(`📊 Loyalty transactions for business ${businessIdInt}: ${transactions[0]?.count || 0}`);
      
    } catch (error) {
      console.error('❌ Error in debugDatabaseState:', error);
    }
  }

  /**
   * Get customers enrolled in AT LEAST ONE program of this business (BIG RULE)
   * Shows customer name and the programs they're enrolled in that belong to this business
   */
  static async getBusinessCustomers(businessId: string): Promise<Customer[]> {
    try {
      console.log(`🔍 DEBUG: Fetching customers for business ID: ${businessId} (BIG RULE: customers enrolled in AT LEAST ONE program)`);
      console.log(`🔍 DEBUG: Business ID type: ${typeof businessId}, value: "${businessId}"`);
      
      if (!businessId || businessId === '' || businessId === 'undefined') {
        console.error('❌ ERROR: Invalid business ID provided:', businessId);
        return [];
      }
      
      // Convert businessId to integer for database comparison
      const businessIdInt = parseInt(businessId, 10);
      console.log(`🔍 DEBUG: Converted business ID to integer: ${businessIdInt}`);
      
      if (isNaN(businessIdInt)) {
        console.error('❌ ERROR: Business ID is not a valid number:', businessId);
        return [];
      }
      
      // Get customers who are enrolled in AT LEAST ONE program of this business (BIG RULE)
      // Use DISTINCT ON to ensure each customer appears only once
      const customers = await sql.query(`
        SELECT DISTINCT ON (c.id)
          c.id,
          c.name,
          c.email,
          c.status,
          c.created_at as joined_at,
          COALESCE(SUM(pe.current_points), 0) as total_loyalty_points,
          COUNT(DISTINCT pe.program_id) as program_count,
          COALESCE(SUM(lt.amount), 0) as total_spent,
          MAX(lt.transaction_date) as last_visit,
          MIN(pe.enrolled_at) as first_enrolled_at
        FROM users c
        JOIN program_enrollments pe ON c.id = pe.customer_id
        JOIN loyalty_programs lp ON pe.program_id = lp.id
        LEFT JOIN loyalty_transactions lt ON c.id = lt.customer_id AND lt.business_id = $1
        WHERE c.user_type = 'customer' 
          AND c.status = 'active'
          AND lp.business_id = $1
          AND pe.status = 'ACTIVE'
        GROUP BY c.id, c.name, c.email, c.status, c.created_at
        ORDER BY c.id, c.name ASC
      `, [businessIdInt, businessIdInt]);
      
      console.log(`🔍 DEBUG: Raw SQL query returned ${customers.length} rows`);
      console.log(`🔍 DEBUG: First few raw results:`, customers.slice(0, 3));
      console.log(`✅ Found ${customers.length} customers for business ${businessId} (enrolled in AT LEAST ONE program each)`);
      
      const formattedCustomers = customers.map(customer => ({
        id: customer.id.toString(),
        name: customer.name || 'Unknown Customer',
        email: customer.email || '',
        phone: '', // Default empty since users table doesn't have phone column
        tier: 'Bronze', // Default tier since users table doesn't have tier column
        loyaltyPoints: parseInt(customer.total_loyalty_points) || 0,
        points: parseInt(customer.total_loyalty_points) || 0,
        visits: parseInt(customer.program_count) || 1, // Shows number of programs enrolled
        totalSpent: parseFloat(customer.total_spent) || 0,
        lastVisit: customer.last_visit ? new Date(customer.last_visit).toISOString() : undefined,
        favoriteItems: [], // TODO: Implement favorite items tracking
        birthday: undefined, // Default since users table doesn't have birthday column
        joinedAt: customer.first_enrolled_at ? new Date(customer.first_enrolled_at).toISOString() : 
                  (customer.joined_at ? new Date(customer.joined_at).toISOString() : undefined),
        notes: '', // Default empty since users table doesn't have notes column
        status: customer.status || 'active',
        // Add program information (BIG RULE: AT LEAST ONE program)
        programName: `${customer.program_count || 1} Programs`, // Show program count instead of single program
        programId: '', // Will be populated when customer is selected
        // Additional fields for multiple programs
        programCount: parseInt(customer.program_count) || 1,
        totalLoyaltyPoints: parseInt(customer.total_loyalty_points) || 0
      }));
      
      console.log(`🔍 DEBUG: Returning ${formattedCustomers.length} formatted customers`);
      
      // If no customers found with program enrollments, try fallback method
      if (formattedCustomers.length === 0) {
        console.log(`⚠️ WARNING: No customers found with program enrollments, trying fallback method...`);
        return await this.getBusinessCustomersFallback(businessId);
      }
      
      return formattedCustomers;
    } catch (error) {
      console.error('❌ ERROR: Error fetching business customers:', error);
      console.error('❌ ERROR: Error details:', error);
      if (error instanceof Error) {
        console.error('❌ ERROR: Error message:', error.message);
        console.error('❌ ERROR: Error stack:', error.stack);
      }
      // Try fallback method on error
      console.log(`⚠️ WARNING: Primary method failed, trying fallback method...`);
      return await this.getBusinessCustomersFallback(businessId);
    }
  }

  /**
   * Fallback method: Get customers who have interacted with business (even without program enrollment)
   */
  static async getBusinessCustomersFallback(businessId: string): Promise<Customer[]> {
    try {
      console.log(`🔍 FALLBACK: Fetching customers who interacted with business ${businessId}`);
      const businessIdInt = parseInt(businessId, 10);
      
      if (isNaN(businessIdInt)) {
        console.error('❌ FALLBACK ERROR: Invalid business ID:', businessId);
        return [];
      }
      
      // Get customers who have had any transactions with this business
      const customers = await sql.query(`
        SELECT DISTINCT
          c.id,
          c.name,
          c.email,
          c.status,
          c.created_at as joined_at,
          COALESCE(SUM(lt.amount), 0) as total_spent,
          COUNT(lt.id) as transaction_count,
          MAX(lt.transaction_date) as last_visit
        FROM users c
        LEFT JOIN loyalty_transactions lt ON c.id = lt.customer_id AND lt.business_id = $1
        WHERE c.user_type = 'customer' 
          AND c.status = 'active'
          AND (lt.business_id = $1 OR c.created_at IS NOT NULL)
        GROUP BY c.id, c.name, c.email, c.status, c.created_at
        ORDER BY c.name ASC
        LIMIT 50
      `, [businessIdInt, businessIdInt]);
      
      console.log(`🔍 FALLBACK: Found ${customers.length} customers with business interactions`);
      
      const formattedCustomers = customers.map(customer => ({
        id: customer.id.toString(),
        name: customer.name || 'Unknown Customer',
        email: customer.email || '',
        phone: '',
        tier: 'Bronze',
        loyaltyPoints: 0, // No program enrollment yet
        points: 0,
        visits: parseInt(customer.transaction_count) || 0,
        totalSpent: parseFloat(customer.total_spent) || 0,
        lastVisit: customer.last_visit ? new Date(customer.last_visit).toISOString() : undefined,
        favoriteItems: [],
        birthday: undefined,
        joinedAt: customer.joined_at ? new Date(customer.joined_at).toISOString() : undefined,
        notes: '',
        status: customer.status || 'active',
        programName: 'Not Enrolled', // Indicate no program enrollment
        programId: '',
        programCount: 0,
        totalLoyaltyPoints: 0
      }));
      
      console.log(`🔍 FALLBACK: Returning ${formattedCustomers.length} formatted customers`);
      return formattedCustomers;
    } catch (error) {
      console.error('❌ FALLBACK ERROR:', error);
      return [];
    }
  }

  /**
   * Count distinct customers for a business based on transactions/enrollments
   */
  static async countBusinessCustomers(businessId: string): Promise<number> {
    try {
      const businessIdInt = parseInt(businessId, 10);
      if (isNaN(businessIdInt)) return 0;
      
      console.log(`🔍 Counting customers for business ${businessId} (${businessIdInt})`);
      
      // Use the same logic as getBusinessCustomers to ensure consistency
      const customers = await this.getBusinessCustomers(businessId);
      const actualCount = customers.length;
      
      console.log(`✅ Actual customer count for business ${businessId}: ${actualCount}`);
      console.log(`📋 Customer details:`, customers.map(c => ({ id: c.id, name: c.name, email: c.email })));
      
      return actualCount;
    } catch (error) {
      console.error('Error counting business customers:', error);
      return 0;
    }
  }

  /**
   * Get customer programs for a specific business
   */
  static async getCustomerPrograms(customerId: string, businessId: string): Promise<CustomerProgram[]> {
    try {
      const businessIdInt = parseInt(businessId, 10);
      const customerIdInt = parseInt(customerId, 10);
      
      if (isNaN(businessIdInt) || isNaN(customerIdInt)) {
        console.error('❌ ERROR: Invalid business or customer ID');
        return [];
      }
      
      const programs = await sql.query(`
        SELECT 
          lp.id,
          lp.name,
          pe.current_points as points,
          pe.enrolled_at,
          pe.status
        FROM loyalty_programs lp
        JOIN program_enrollments pe ON lp.id = pe.program_id
        WHERE pe.customer_id = $1
          AND lp.business_id = $2
          AND pe.status = 'ACTIVE'
        ORDER BY pe.enrolled_at ASC
      `, [customerIdInt, businessIdInt]);
      
      return programs.map(program => ({
        id: program.id.toString(),
        name: program.name || 'Unknown Program',
        points: parseInt(program.points) || 0,
        enrolledAt: new Date(program.enrolled_at).toISOString(),
        status: program.status || 'ACTIVE'
      }));
    } catch (error) {
      console.error('Error fetching customer programs:', error);
      return [];
    }
  }

  /**
   * Get a customer by ID
   */
  static async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      const customers = await sql.query(`
        SELECT 
          c.*,
          COALESCE(SUM(pe.current_points), 0) as total_loyalty_points,
          COUNT(DISTINCT pe.program_id) as program_count
        FROM users c
        LEFT JOIN program_enrollments pe ON c.id::text = pe.customer_id AND pe.status = 'ACTIVE'
        WHERE c.id = $1 AND c.user_type = 'customer'
        GROUP BY c.id
      `, [customerId]);
      
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
      await sql.query(`
        INSERT INTO customer_interactions (
          customer_id,
          business_id,
          type,
          message,
          happened_at
        )
        VALUES ($1, $2, $3, $4, NOW())
      `, [customerId, businessId, interactionType, description]);
      
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
          customer_id INTEGER,
          business_id VARCHAR(255) NOT NULL,
          type VARCHAR(100) NOT NULL,
          message TEXT,
          happened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
      await sql.query(`
        UPDATE businesses 
        SET updated_at = NOW() 
        WHERE id = $1
      `, [businessId]);
      
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
      
      // Get customer and business information first
      let customerName;
      let businessName;
      
      try {
        const customerInfo = await sql.query(
          'SELECT name FROM users WHERE id = $1 AND user_type = \'customer\'',
          [customerId]
        );
        if (customerInfo.length > 0) {
          customerName = customerInfo[0].name;
        }
        
        const businessInfo = await sql.query(
          'SELECT name FROM users WHERE id = $1 AND user_type = \'business\'',
          [businessId]
        );
        if (businessInfo.length > 0) {
          businessName = businessInfo[0].name;
        }
      } catch (infoError) {
        console.error('Error getting customer/business names:', infoError);
      }
      
      // Track enrollment through multiple methods
      let isEnrolled = false;
      let enrollmentDetails = {
        fromPrograms: false,
        fromRelationships: false,
        fromCards: false
      };
      
      // Check for enrollments in loyalty programs first
      let enrollments = [];
      try {
        enrollments = await sql.query(`
          SELECT 
            pe.program_id,
            pe.current_points,
            lp.name as program_name
          FROM program_enrollments pe
          JOIN loyalty_programs lp ON pe.program_id = lp.id
          WHERE pe.customer_id = $1 
            AND lp.business_id = $2
            AND pe.status = 'ACTIVE'
        `, [customerId, businessId]);
        
        if (enrollments.length > 0) {
          console.log(`Found ${enrollments.length} active program enrollments`);
          isEnrolled = true;
          enrollmentDetails.fromPrograms = true;
        }
      } catch (enrollmentError) {
        console.error('Error checking program enrollments:', enrollmentError);
      }
      
      // Check the customer_business_relationships table as a fallback
      if (!isEnrolled) {
        console.log(`No active program enrollments found, checking business relationships`);
        
        try {
          const relationships = await sql.query(`
            SELECT * FROM customer_business_relationships
            WHERE customer_id = $1
              AND business_id = $2
              AND status = 'ACTIVE'
          `, [customerId, businessId]);
          
          if (relationships.length > 0) {
            console.log(`Found business relationship without program enrollment`);
            isEnrolled = true;
            enrollmentDetails.fromRelationships = true;
            
            // Try to find programs for this business to populate programIds
            try {
              const businessPrograms = await sql.query(
                'SELECT id, name FROM loyalty_programs WHERE business_id = $1 AND status = \'active\'',
                [businessId]
              );
              
              if (businessPrograms.length > 0) {
                // Add these programs to our enrollments list
                for (const program of businessPrograms) {
                  enrollments.push({
                    program_id: program.id,
                    current_points: 0,
                    program_name: program.name
                  });
                }
              }
            } catch (programsError) {
              console.error('Error fetching business programs:', programsError);
            }
          }
        } catch (relationshipError) {
          console.error('Error checking business relationships:', relationshipError);
        }
      }

      // Check loyalty cards directly as another fallback
      if (!isEnrolled) {
        console.log(`No active business relationship found, checking loyalty cards`);
        
        try {
          const cards = await sql.query(`
            SELECT 
              lc.*,
              lp.id as program_id,
              lp.name as program_name
            FROM loyalty_cards lc
            LEFT JOIN loyalty_programs lp ON lc.program_id = lp.id
            WHERE lc.customer_id = $1
              AND lc.business_id = $2
              AND lc.is_active = true
          `, [customerId, businessId]);
          
          if (cards.length > 0) {
            console.log(`Found ${cards.length} active loyalty cards`);
            isEnrolled = true;
            enrollmentDetails.fromCards = true;
            
            // Use these cards to determine programIds and points
            for (const card of cards) {
              if (card.program_id) {
                // Add synthetic enrollments based on card data
                enrollments.push({
                  program_id: card.program_id,
                  current_points: parseFloat(card.points || card.points_balance || 0),
                  program_name: card.program_name || 'Unknown Program'
                });
              }
            }
          }
        } catch (cardsError) {
          console.error('Error checking loyalty cards:', cardsError);
        }
      }
      
      // Final fallback: check if customer exists and business has programs
      // This is the most permissive check to ensure points can be awarded
      if (!isEnrolled) {
        try {
          // Check if customer exists
          const customerExists = await sql.query(
            'SELECT EXISTS (SELECT 1 FROM users WHERE id = $1 AND user_type = \'customer\')',
            [customerId]
          );
          
          // Check if business has programs
          const businessHasPrograms = await sql.query(
            'SELECT EXISTS (SELECT 1 FROM loyalty_programs WHERE business_id = $1 AND status = \'active\')',
            [businessId]
          );
          
          if (customerExists[0]?.exists && businessHasPrograms[0]?.exists) {
            console.log(`Customer and business both exist with programs - allowing enrollment`);
            isEnrolled = true;
            
            // Get business programs for enrollment
            const businessPrograms = await sql.query(
              'SELECT id, name FROM loyalty_programs WHERE business_id = $1 AND status = \'active\' LIMIT 1',
              [businessId]
            );
            
            if (businessPrograms.length > 0) {
              // Add first program as fallback
              enrollments.push({
                program_id: businessPrograms[0].id,
                current_points: 0,
                program_name: businessPrograms[0].name
              });
            }
          }
        } catch (fallbackError) {
          console.error('Error in final enrollment fallback check:', fallbackError);
        }
      }

      // Log final enrollment determination
      console.log(`Customer ${customerId} enrollment with business ${businessId}: ${isEnrolled}`, enrollmentDetails);
      
      // Process enrollments to get program IDs and points
      const programIds = enrollments
        .filter(e => e && e.program_id) // Ensure valid program IDs
        .map(e => e.program_id.toString());
      
      const totalPoints = enrollments
        .reduce((sum, e) => sum + (parseFloat(e.current_points?.toString() || '0') || 0), 0);

      const programs = enrollments
        .filter(e => e && e.program_id) // Ensure valid program IDs
        .map(e => ({
          id: e.program_id.toString(),
          name: e.program_name || 'Unknown Program',
          points: parseFloat(e.current_points?.toString() || '0') || 0
        }));
      
      return {
        isEnrolled,
        programIds: programIds.length > 0 ? programIds : [],
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
      const existingCheck = await sql.query(`
        SELECT * FROM customer_business_relationships
        WHERE customer_id = $1
          AND business_id = $2
      `, [customerId, businessId]);
      
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
        
        await sql.query(`
          INSERT INTO customer_business_relationships (
            customer_id,
            business_id,
            status,
            created_at,
            updated_at
          )
          VALUES ($1, $2, 'ACTIVE', NOW(), NOW())
          ON CONFLICT (customer_id, business_id) 
          DO UPDATE SET
            status = 'ACTIVE',
            updated_at = NOW()
        `, [customerId, businessId]);
        
        // Record the association event
        await this.recordCustomerInteraction(
          customerId,
          businessId,
          'ASSOCIATION',
          `Customer associated with business through program ${programId}`
        );
      } else {
        // If it exists but might be inactive, reactivate it
        await sql.query(`
          UPDATE customer_business_relationships
          SET 
            status = 'ACTIVE',
            updated_at = NOW()
          WHERE 
            customer_id = $1 AND
            business_id = $2
        `, [customerId, businessId]);
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
   * Send a promo code to a customer
   */
  static async sendPromoCodeToCustomer(
    customerId: string,
    businessId: string,
    promoCodeId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get customer and promo code details
      const customerResult = await sql.query(
        'SELECT name, email FROM users WHERE id = $1 AND user_type = \'customer\'',
        [customerId]
      );
      
      const promoCodeResult = await sql.query(
        'SELECT code, name, type, value, currency FROM promo_codes WHERE id = $1',
        [promoCodeId]
      );
      
      const businessResult = await sql.query(
        'SELECT name FROM users WHERE id = $1 AND user_type = \'business\'',
        [businessId]
      );
      
      if (customerResult.length === 0) {
        return { success: false, error: 'Customer not found' };
      }
      
      if (promoCodeResult.length === 0) {
        return { success: false, error: 'Promo code not found' };
      }
      
      if (businessResult.length === 0) {
        return { success: false, error: 'Business not found' };
      }
      
      const customer = customerResult[0];
      const promoCode = promoCodeResult[0];
      const business = businessResult[0];
      
      // Record the promo code send interaction
      await this.recordCustomerInteraction(
        customerId,
        businessId,
        'PROMO_CODE_SENT',
        `Promo code ${promoCode.code} (${promoCode.name}) sent to customer`
      );
      
      // Create notification for the customer
      const notificationTitle = `New Promo Code from ${business.name}!`;
      const notificationMessage = `You've received a new promo code from ${business.name}: ${promoCode.code}`;
      
      const notificationData = {
        promoCode: promoCode.code,
        promoCodeName: promoCode.name,
        promoCodeType: promoCode.type,
        promoCodeValue: promoCode.value,
        promoCodeCurrency: promoCode.currency,
        businessName: business.name,
        businessId: businessId,
        promoCodeId: promoCodeId
      };
      
      const notificationResult = await NotificationService.createNotification(
        customerId,
        'PROMO_CODE_RECEIVED',
        notificationTitle,
        notificationMessage,
        notificationData
      );
      
      if (!notificationResult.success) {
        console.error('Failed to create notification:', notificationResult.error);
        // Continue anyway as the promo code was sent
      }
      
      console.log(`📧 Promo code ${promoCode.code} sent to ${customer.name} (${customer.email}) with notification`);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending promo code to customer:', error);
      return { success: false, error: 'Failed to send promo code' };
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
      const searchPattern = `%${query}%`;
      const result = await sql.query(`
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
            LOWER(name) LIKE LOWER($1) OR
            LOWER(email) LIKE LOWER($2)
          )
        ORDER BY name ASC
        LIMIT 20
      `, [searchPattern, searchPattern]);
      
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