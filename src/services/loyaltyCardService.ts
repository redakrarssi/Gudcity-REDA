import sql from '../utils/db';
import { useAuth } from '../contexts/AuthContext';

// Define the card benefit type
export type CardBenefit = string;

// Define the LoyaltyCard interface that matches our database schema
export interface LoyaltyCard {
  id: string;
  customerId: string;
  businessId: string;
  programId: string;
  cardType: string;
  tier: string;
  points: number;
  pointsMultiplier: number;
  promoCode: string | null;
  nextReward: string | null;
  pointsToNext: number | null;
  expiryDate: string | null;
  benefits: string[];
  lastUsed: string | null;
  isActive: boolean;
  availableRewards: Reward[];
  createdAt: string;
  updatedAt: string;
}

// Define the Reward interface
export interface Reward {
  name: string;
  points: number;
  description: string;
  imageUrl?: string;
  isRedeemable?: boolean;
}

// Define the RedemptionResult interface
export interface RedemptionResult {
  success: boolean;
  message: string;
  updatedCard?: LoyaltyCard;
  reward?: Reward;
}

// Define the CardTierRequirement interface
export interface CardTierRequirement {
  tier: string;
  pointsRequired: number;
  benefits: string[];
  pointsMultiplier: number;
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

/**
 * Service for managing loyalty cards and rewards
 */
export class LoyaltyCardService {
  // Card tier requirements
  private static readonly cardTiers: CardTierRequirement[] = [
    {
      tier: 'STANDARD',
      pointsRequired: 0,
      benefits: ['Basic rewards', 'Birthday gift'],
      pointsMultiplier: 1.0
    },
    {
      tier: 'SILVER',
      pointsRequired: 1000,
      benefits: ['Basic rewards', 'Birthday gift', '5% discount'],
      pointsMultiplier: 1.25
    },
    {
      tier: 'GOLD',
      pointsRequired: 2500,
      benefits: ['All Silver benefits', '10% discount', 'Free item monthly'],
      pointsMultiplier: 1.5
    },
    {
      tier: 'PLATINUM',
      pointsRequired: 5000,
      benefits: ['All Gold benefits', '15% discount', 'Priority service', 'Exclusive events'],
      pointsMultiplier: 2.0
    }
  ];

  /**
   * Get a customer's loyalty card for a specific business
   */
  static async getCustomerCard(customerId: string, businessId: string): Promise<LoyaltyCard | null> {
    try {
      const cards = await sql`
        SELECT * 
        FROM loyalty_cards
        WHERE customer_id = ${customerId}
        AND business_id = ${businessId}
        AND is_active = true
      `;
      
      if (!cards.length) {
        return null;
      }
      
      return this.formatCard(cards[0]);
    } catch (error) {
      console.error('Error fetching customer loyalty card:', error);
      return null;
    }
  }

  /**
   * Get all loyalty cards for a customer
   */
  static async getCustomerCards(customerId: string): Promise<LoyaltyCard[]> {
    try {
      const cards = await sql`
        SELECT lc.*, 
               lp.name as program_name, 
               u.name as business_name
        FROM loyalty_cards lc
        JOIN loyalty_programs lp ON lc.program_id = lp.id
        JOIN users u ON lp.business_id = u.id::text
        WHERE lc.customer_id = ${customerId}
        AND lc.is_active = true
        ORDER BY lc.updated_at DESC
      `;
      
      return cards.map(card => this.formatCard(card));
    } catch (error) {
      console.error('Error fetching customer loyalty cards:', error);
      return [];
    }
  }
  
  /**
   * Create or activate a loyalty card for a customer
   */
  static async enrollCustomerInProgram(
    customerId: string,
    businessId: string,
    programId: string
  ): Promise<LoyaltyCard | null> {
    try {
      // Check if card already exists
      const existingCard = await sql`
        SELECT * FROM loyalty_cards
        WHERE customer_id = ${customerId}
        AND business_id = ${businessId}
        AND program_id = ${programId}
      `;
      
      if (existingCard.length > 0) {
        // If exists but inactive, reactivate it
        if (!existingCard[0].is_active) {
          await sql`
            UPDATE loyalty_cards
            SET is_active = true, updated_at = NOW()
            WHERE id = ${existingCard[0].id}
          `;
          
          const updatedCard = await sql`
            SELECT * FROM loyalty_cards WHERE id = ${existingCard[0].id}
          `;
          
          return this.formatCard(updatedCard[0]);
        }
        
        // Card already exists and is active
        return this.formatCard(existingCard[0]);
      }
      
      // Generate unique promo code
      const promoCode = await this.generateUniquePromoCode(businessId, customerId);
      
      // Create new card
      const newCard = await sql`
        INSERT INTO loyalty_cards (
          customer_id,
          business_id,
          program_id,
          card_type,
          tier,
          points,
          promo_code,
          benefits,
          points_multiplier,
          available_rewards,
          points_to_next,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          ${customerId},
          ${businessId},
          ${programId},
          'STANDARD',
          'STANDARD',
          0,
          ${promoCode},
          ${this.cardTiers[0].benefits},
          ${this.cardTiers[0].pointsMultiplier},
          ${JSON.stringify(this.getDefaultRewards('STANDARD'))},
          ${1000},
          true,
          NOW(),
          NOW()
        )
        RETURNING *
      `;
      
      return this.formatCard(newCard[0]);
    } catch (error) {
      console.error('Error enrolling customer in program:', error);
      return null;
    }
  }
  
  /**
   * Add points to a customer's loyalty card
   */
  static async addPoints(
    cardId: string,
    points: number,
    transactionType: string
  ): Promise<LoyaltyCard | null> {
    try {
      // Get current card to apply multiplier
      const cardResult = await sql`
        SELECT * FROM loyalty_cards WHERE id = ${cardId}
      `;
      
      if (!cardResult.length) {
        return null;
      }
      
      const card = cardResult[0];
      const multiplier = card.points_multiplier || 1.0;
      const pointsToAdd = Math.round(points * multiplier);
      
      // Update card points
      const updatedCard = await sql`
        UPDATE loyalty_cards
        SET 
          points = points + ${pointsToAdd},
          last_used = NOW(),
          updated_at = NOW()
        WHERE id = ${cardId}
        RETURNING *
      `;
      
      if (!updatedCard.length) {
        return null;
      }
      
      // Record transaction
      await sql`
        INSERT INTO card_activities (
          card_id,
          activity_type,
          points,
          description,
          created_at
        ) VALUES (
          ${cardId},
          ${transactionType},
          ${pointsToAdd},
          ${`Added ${pointsToAdd} points (base: ${points}, multiplier: ×${multiplier})`},
          NOW()
        )
      `;
      
      // Check if tier upgrade is needed
      await this.checkAndUpdateTier(updatedCard[0].id);
      
      // Get the final card
      const finalCard = await sql`
        SELECT * FROM loyalty_cards WHERE id = ${cardId}
      `;
      
      return this.formatCard(finalCard[0]);
    } catch (error) {
      console.error('Error adding points to card:', error);
      return null;
    }
  }
  
  /**
   * Redeem a reward from a loyalty card
   */
  static async redeemReward(
    cardId: string,
    rewardName: string
  ): Promise<RedemptionResult> {
    try {
      // Get card with available rewards
      const cardResult = await sql`
        SELECT * FROM loyalty_cards WHERE id = ${cardId}
      `;
      
      if (!cardResult.length) {
        return { success: false, message: 'Card not found' };
      }
      
      const card = cardResult[0];
      const availableRewards = card.available_rewards || [];
      
      // Find the reward
      const reward = availableRewards.find((r: any) => r.name === rewardName);
      
      if (!reward) {
        return { success: false, message: 'Reward not available on this card' };
      }
      
      // Check if enough points
      if (reward.points > card.points) {
        return { success: false, message: 'Not enough points to redeem this reward' };
      }
      
      // Subtract points if required (some rewards may be free)
      if (reward.points > 0) {
        await sql`
          UPDATE loyalty_cards
          SET 
            points = points - ${reward.points},
            last_used = NOW(),
            updated_at = NOW()
          WHERE id = ${cardId}
        `;
      }
      
      // Record redemption
      await sql`
        INSERT INTO card_activities (
          card_id,
          activity_type,
          points,
          description,
          created_at
        ) VALUES (
          ${cardId},
          'REDEEM_REWARD',
          ${reward.points},
          ${`Redeemed ${rewardName} for ${reward.points} points`},
          NOW()
        )
      `;
      
      // Get updated card
      const updatedCard = await sql`
        SELECT * FROM loyalty_cards WHERE id = ${cardId}
      `;
      
      return {
        success: true,
        message: `Successfully redeemed ${rewardName}`,
        updatedCard: this.formatCard(updatedCard[0]),
        reward: reward
      };
    } catch (error) {
      console.error('Error redeeming reward:', error);
      return { success: false, message: 'An error occurred while redeeming the reward' };
    }
  }

  /**
   * Redeem a promo code
   */
  static async redeemPromoCode(
    businessId: string,
    promoCode: string,
    customerId: string
  ): Promise<RedemptionResult> {
    try {
      // Find card with this promo code
      const cardResult = await sql`
        SELECT * FROM loyalty_cards 
        WHERE promo_code = ${promoCode} 
        AND business_id = ${businessId}
      `;
      
      if (!cardResult.length) {
        return { success: false, message: 'Invalid promo code' };
      }
      
      const card = cardResult[0];
      
      // If this is not the customer's own promo code
      if (card.customer_id !== customerId) {
        // Award bonus points to both card owner and person redeeming
        const bonusPoints = 100;
        
        // Add points to promo code owner
        await this.addPoints(card.id, bonusPoints, 'PROMO_CODE_REFERRAL');
        
        // Find redeemer's card
        const redeemerCardResult = await sql`
          SELECT * FROM loyalty_cards 
          WHERE customer_id = ${customerId}
          AND business_id = ${businessId} 
          AND is_active = true
        `;
        
        // If redeemer has a card, add points to it
        if (redeemerCardResult.length > 0) {
          await this.addPoints(redeemerCardResult[0].id, bonusPoints, 'PROMO_CODE_REDEMPTION');
          
          return {
            success: true,
            message: `Successfully redeemed promo code for ${bonusPoints} bonus points!`,
            updatedCard: await this.getCustomerCard(customerId, businessId)
          };
        } else {
          // Create a card for the redeemer
          const newCard = await this.enrollCustomerInProgram(
            customerId,
            businessId,
            cardResult[0].program_id
          );
          
          if (newCard) {
            await this.addPoints(newCard.id, bonusPoints, 'PROMO_CODE_REDEMPTION');
            
            return {
              success: true,
              message: `Successfully joined program and received ${bonusPoints} bonus points!`,
              updatedCard: await this.getCustomerCard(customerId, businessId)
            };
          }
        }
      } else {
        return { success: false, message: 'You cannot redeem your own promo code' };
      }
      
      return { success: false, message: 'Error redeeming promo code' };
    } catch (error) {
      console.error('Error redeeming promo code:', error);
      return { success: false, message: 'An error occurred while redeeming the promo code' };
    }
  }

  /**
   * Get loyalty card activities
   */
  static async getCardActivities(cardId: string, limit: number = 10): Promise<any[]> {
    try {
      const activities = await sql`
        SELECT * FROM card_activities
        WHERE card_id = ${cardId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      
      return activities.map((activity: any) => ({
        id: activity.id,
        cardId: activity.card_id,
        activityType: activity.activity_type,
        points: activity.points,
        description: activity.description,
        transactionReference: activity.transaction_reference,
        createdAt: activity.created_at
      }));
    } catch (error) {
      console.error('Error fetching card activities:', error);
      return [];
    }
  }
  
  /**
   * Get business card statistics
   */
  static async getBusinessCardStats(businessId: string): Promise<any> {
    try {
      // Get total active cards
      const cardsResult = await sql`
        SELECT 
          COUNT(*) as total_cards,
          SUM(CASE WHEN tier = 'STANDARD' THEN 1 ELSE 0 END) as standard_cards,
          SUM(CASE WHEN tier = 'SILVER' THEN 1 ELSE 0 END) as silver_cards,
          SUM(CASE WHEN tier = 'GOLD' THEN 1 ELSE 0 END) as gold_cards, 
          SUM(CASE WHEN tier = 'PLATINUM' THEN 1 ELSE 0 END) as platinum_cards
        FROM loyalty_cards
        WHERE business_id = ${businessId}
        AND is_active = true
      `;
      
      // Get redemption stats
      const redemptionsResult = await sql`
        SELECT COUNT(*) as total_redemptions
        FROM card_activities ca
        JOIN loyalty_cards lc ON ca.card_id = lc.id
        WHERE lc.business_id = ${businessId}
        AND ca.activity_type = 'REDEEM_REWARD'
      `;
      
      return {
        totalCards: parseInt(cardsResult[0]?.total_cards || '0'),
        tierBreakdown: {
          standard: parseInt(cardsResult[0]?.standard_cards || '0'),
          silver: parseInt(cardsResult[0]?.silver_cards || '0'),
          gold: parseInt(cardsResult[0]?.gold_cards || '0'),
          platinum: parseInt(cardsResult[0]?.platinum_cards || '0')
        },
        totalRedemptions: parseInt(redemptionsResult[0]?.total_redemptions || '0')
      };
    } catch (error) {
      console.error('Error fetching business card stats:', error);
      return {
        totalCards: 0,
        tierBreakdown: { standard: 0, silver: 0, gold: 0, platinum: 0 },
        totalRedemptions: 0
      };
    }
  }

  /**
   * Check and update card tier if needed
   */
  private static async checkAndUpdateTier(cardId: string): Promise<boolean> {
    try {
      const cardResult = await sql`
        SELECT * FROM loyalty_cards WHERE id = ${cardId}
      `;
      
      if (!cardResult.length) {
        return false;
      }
      
      const card = cardResult[0];
      const points = parseInt(card.points);
      
      // Find appropriate tier based on points
      let newTier = 'STANDARD';
      let tierData = this.cardTiers[0];
      
      for (let i = this.cardTiers.length - 1; i >= 0; i--) {
        const tier = this.cardTiers[i];
        if (points >= tier.pointsRequired) {
          newTier = tier.tier;
          tierData = tier;
          break;
        }
      }
      
      // If tier changed, update card
      if (newTier !== card.tier) {
        // Find next tier requirements
        const nextTierIndex = this.cardTiers.findIndex(t => t.tier === newTier) + 1;
        const pointsToNext = nextTierIndex < this.cardTiers.length 
          ? this.cardTiers[nextTierIndex].pointsRequired - points
          : null;
        
        await sql`
          UPDATE loyalty_cards
          SET 
            tier = ${newTier},
            card_type = ${newTier},
            benefits = ${tierData.benefits},
            points_multiplier = ${tierData.pointsMultiplier},
            points_to_next = ${pointsToNext},
            available_rewards = ${JSON.stringify(this.getDefaultRewards(newTier))},
            updated_at = NOW()
          WHERE id = ${cardId}
        `;
        
        // Record tier upgrade activity
        await sql`
          INSERT INTO card_activities (
            card_id,
            activity_type,
            points,
            description,
            created_at
          ) VALUES (
            ${cardId},
            'TIER_CHANGE',
            0,
            ${`Upgraded to ${newTier} tier`},
            NOW()
          )
        `;
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking and updating tier:', error);
      return false;
    }
  }

  /**
   * Generate a unique promo code
   */
  private static async generateUniquePromoCode(businessId: string, customerId: string): Promise<string> {
    // Create a base code
    const businessPrefix = `B${businessId}`.substring(0, 3);
    const customerPart = `C${customerId}`.substring(0, 3);
    
    let promoCode: string;
    let isUnique = false;
    
    // Keep generating until a unique code is found
    do {
      // Generate random part (6 characters)
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      promoCode = `${businessPrefix}-${customerPart}-${randomPart}`;
      
      // Check if code exists
      const exists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM loyalty_cards 
          WHERE promo_code = ${promoCode}
        ) as exists
      `;
      
      isUnique = !exists[0].exists;
    } while (!isUnique);
    
    return promoCode;
  }

  /**
   * Get default rewards for a tier
   */
  private static getDefaultRewards(tier: string): Reward[] {
    switch (tier) {
      case 'PLATINUM':
        return [
          { name: 'Free Coffee', points: 100, description: 'Enjoy a free coffee of your choice' },
          { name: 'Free Pastry', points: 200, description: 'One free pastry of your choice' },
          { name: 'Free Lunch', points: 500, description: 'Enjoy a free lunch item' },
          { name: 'Premium Reward', points: 1000, description: 'Special premium reward' },
          { name: '15% Discount', points: 0, description: 'Automatic 15% discount on all purchases', isRedeemable: false },
          { name: 'Priority Service', points: 0, description: 'Priority service at all locations', isRedeemable: false },
          { name: 'Free Monthly Item', points: 0, description: 'One free item each month', isRedeemable: false },
          { name: 'Exclusive Events', points: 0, description: 'Access to exclusive member events', isRedeemable: false },
          { name: 'Birthday Gift', points: 0, description: 'Special gift on your birthday', isRedeemable: false }
        ];
      case 'GOLD':
        return [
          { name: 'Free Coffee', points: 100, description: 'Enjoy a free coffee of your choice' },
          { name: 'Free Pastry', points: 200, description: 'One free pastry of your choice' },
          { name: 'Free Lunch', points: 500, description: 'Enjoy a free lunch item' },
          { name: '10% Discount', points: 0, description: 'Automatic 10% discount on all purchases', isRedeemable: false },
          { name: 'Free Monthly Item', points: 0, description: 'One free item each month', isRedeemable: false },
          { name: 'Birthday Gift', points: 0, description: 'Special gift on your birthday', isRedeemable: false }
        ];
      case 'SILVER':
        return [
          { name: 'Free Coffee', points: 100, description: 'Enjoy a free coffee of your choice' },
          { name: 'Free Pastry', points: 200, description: 'One free pastry of your choice' },
          { name: '5% Discount', points: 0, description: 'Automatic 5% discount on all purchases', isRedeemable: false },
          { name: 'Birthday Gift', points: 0, description: 'Special gift on your birthday', isRedeemable: false }
        ];
      case 'STANDARD':
      default:
        return [
          { name: 'Free Coffee', points: 100, description: 'Enjoy a free coffee of your choice' },
          { name: 'Birthday Gift', points: 0, description: 'Special gift on your birthday', isRedeemable: false }
        ];
    }
  }

  /**
   * Format a loyalty card from database to API format
   */
  private static formatCard(card: any): LoyaltyCard {
    return {
      id: card.id,
      customerId: card.customer_id,
      businessId: card.business_id,
      programId: card.program_id,
      cardType: card.card_type,
      tier: card.tier || 'STANDARD',
      points: parseInt(card.points) || 0,
      pointsMultiplier: parseFloat(card.points_multiplier) || 1.0,
      promoCode: card.promo_code,
      nextReward: card.next_reward,
      pointsToNext: card.points_to_next ? parseInt(card.points_to_next) : null,
      expiryDate: card.expiry_date,
      benefits: card.benefits || [],
      lastUsed: card.last_used,
      isActive: card.is_active,
      availableRewards: card.available_rewards || this.getDefaultRewards(card.tier || 'STANDARD'),
      createdAt: card.created_at,
      updatedAt: card.updated_at
    };
  }
}

export default LoyaltyCardService; 