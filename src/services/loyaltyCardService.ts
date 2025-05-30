import sql from '../utils/db';
import { useAuth } from '../contexts/AuthContext';

// Define the card benefit type
export type CardBenefit = string;

// Define the LoyaltyCard interface that matches our database schema
export interface LoyaltyCard {
  id: number;
  customer_id: number;
  business_id: number;
  program_id: number;
  card_type: string;
  points: number;
  next_reward: string;
  points_to_next: number;
  expiry_date: Date | string;
  benefits: CardBenefit[];
  last_used: Date | string;
  is_active: boolean;
  business_name?: string; // Added from join
  program_name?: string; // Added from join
}

// Define the CardActivity interface
export interface CardActivity {
  id: number;
  card_id: number;
  activity_type: 'EARN_POINTS' | 'REDEEM_POINTS' | 'CARD_USED';
  points: number;
  description: string;
  transaction_reference: string;
  created_at: Date | string;
}

export class LoyaltyCardService {
  /**
   * Get all loyalty cards for a customer
   */
  static async getCustomerCards(customerId: number | string): Promise<LoyaltyCard[]> {
    try {
      const customerIdNum = typeof customerId === 'string' ? parseInt(customerId) : customerId;
      
      // Use JOIN to also get business and program information
      const query = `
        SELECT 
          c.*,
          u.business_name,
          lp.name as program_name
        FROM loyalty_cards c
        LEFT JOIN users u ON c.business_id = u.id
        LEFT JOIN loyalty_programs lp ON c.program_id = lp.id
        WHERE c.customer_id = $1 AND c.is_active = TRUE
        ORDER BY c.points DESC
      `;
      
      const result = await sql.query(query, [customerIdNum]);
      return result;
    } catch (error) {
      console.error('Error getting customer loyalty cards:', error);
      return [];
    }
  }
  
  /**
   * Get a single loyalty card by ID
   */
  static async getCardById(cardId: number | string): Promise<LoyaltyCard | null> {
    try {
      const cardIdNum = typeof cardId === 'string' ? parseInt(cardId) : cardId;
      
      const query = `
        SELECT 
          c.*,
          u.business_name,
          lp.name as program_name
        FROM loyalty_cards c
        LEFT JOIN users u ON c.business_id = u.id
        LEFT JOIN loyalty_programs lp ON c.program_id = lp.id
        WHERE c.id = $1
        LIMIT 1
      `;
      
      const result = await sql.query(query, [cardIdNum]);
      
      if (result.length === 0) {
        return null;
      }
      
      return result[0];
    } catch (error) {
      console.error('Error getting loyalty card by ID:', error);
      return null;
    }
  }
  
  /**
   * Get card activities for a specific card
   */
  static async getCardActivities(cardId: number | string, limit = 10): Promise<CardActivity[]> {
    try {
      const cardIdNum = typeof cardId === 'string' ? parseInt(cardId) : cardId;
      
      const query = `
        SELECT *
        FROM card_activities
        WHERE card_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      
      const result = await sql.query(query, [cardIdNum, limit]);
      return result;
    } catch (error) {
      console.error('Error getting card activities:', error);
      return [];
    }
  }
  
  /**
   * Add activity to a card and update points
   */
  static async addCardActivity(
    cardId: number | string,
    activityType: 'EARN_POINTS' | 'REDEEM_POINTS' | 'CARD_USED',
    points: number,
    description: string,
    transactionReference: string
  ): Promise<boolean> {
    try {
      const cardIdNum = typeof cardId === 'string' ? parseInt(cardId) : cardId;
      
      // Start a transaction
      await sql.query('BEGIN');
      
      // Add the activity
      const activityQuery = `
        INSERT INTO card_activities (
          card_id,
          activity_type,
          points,
          description,
          transaction_reference
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      
      await sql.query(activityQuery, [
        cardIdNum,
        activityType,
        points,
        description,
        transactionReference
      ]);
      
      // Update the card points and last_used date
      const updateCardQuery = `
        UPDATE loyalty_cards
        SET 
          points = CASE 
            WHEN $2 = 'EARN_POINTS' THEN points + $3
            WHEN $2 = 'REDEEM_POINTS' THEN GREATEST(0, points - $3)
            ELSE points
          END,
          last_used = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, points
      `;
      
      const updateResult = await sql.query(updateCardQuery, [
        cardIdNum,
        activityType,
        points
      ]);
      
      // Commit the transaction
      await sql.query('COMMIT');
      
      return updateResult.length > 0;
    } catch (error) {
      // Rollback on error
      await sql.query('ROLLBACK');
      console.error('Error adding card activity:', error);
      return false;
    }
  }
  
  /**
   * Get customer ID by user ID
   */
  static async getCustomerIdByUserId(userId: number | string): Promise<number | null> {
    try {
      const userIdNum = typeof userId === 'string' ? parseInt(userId) : userId;
      
      const query = `
        SELECT id FROM customers WHERE user_id = $1 LIMIT 1
      `;
      
      const result = await sql.query(query, [userIdNum]);
      
      if (result.length === 0) {
        return null;
      }
      
      return result[0].id;
    } catch (error) {
      console.error('Error getting customer ID from user ID:', error);
      return null;
    }
  }
}

export default LoyaltyCardService; 