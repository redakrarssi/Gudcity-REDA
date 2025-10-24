import { requireSql } from '../_lib/db.js';

export interface LoyaltyCard {
  id: string;
  customerId: string;
  businessId: string;
  programId: string;
  cardNumber: string;
  points: number;
  tier: string;
  status: string;
  programName?: string;
  businessName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all loyalty cards for a customer
 */
export async function getCustomerCards(customerId: number): Promise<LoyaltyCard[]> {
  try {
    const sql = requireSql();
    const customerIdInt = parseInt(customerId.toString(), 10);
    const customerIdStr = customerId.toString();
    
    const result = await sql`
      SELECT 
        lc.*,
        lp.name as program_name,
        lp.description as program_description,
        lp.type as program_type,
        lp.points_per_dollar,
        lp.points_expiry_days,
        u.name as business_name
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lc.program_id = lp.id
      JOIN users u ON lp.business_id = u.id
      WHERE (lc.customer_id = ${customerIdInt} OR lc.customer_id = ${customerIdStr})
      ORDER BY lc.created_at DESC
    `;
    
    return result.map((card: any) => ({
      id: card.id.toString(),
      customerId: card.customer_id.toString(),
      businessId: card.business_id.toString(),
      programId: card.program_id.toString(),
      programName: card.program_name,
      cardNumber: card.card_number || '',
      points: parseFloat(card.points) || 0,
      tier: card.tier || 'STANDARD',
      status: card.status || 'ACTIVE',
      businessName: card.business_name,
      createdAt: card.created_at,
      updatedAt: card.updated_at
    }));
  } catch (error) {
    console.error('Error fetching customer cards:', error);
    return [];
  }
}

/**
 * Get a specific loyalty card by ID
 */
export async function getCardById(cardId: number): Promise<LoyaltyCard | null> {
  try {
    const sql = requireSql();
    const result = await sql`
      SELECT 
        lc.*,
        lp.name as program_name,
        u.name as business_name
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lc.program_id = lp.id
      JOIN users u ON lp.business_id = u.id
      WHERE lc.id = ${cardId}
    `;
    
    if (!result.length) {
      return null;
    }
    
    const card = result[0];
    return {
      id: card.id.toString(),
      customerId: card.customer_id.toString(),
      businessId: card.business_id.toString(),
      programId: card.program_id.toString(),
      programName: card.program_name,
      cardNumber: card.card_number || '',
      points: parseFloat(card.points) || 0,
      tier: card.tier || 'STANDARD',
      status: card.status || 'ACTIVE',
      businessName: card.business_name,
      createdAt: card.created_at,
      updatedAt: card.updated_at
    };
  } catch (error) {
    console.error(`Error fetching card ${cardId}:`, error);
    return null;
  }
}

/**
 * Update card points
 */
export async function updateCardPoints(
  cardId: number, 
  points: number, 
  operation: 'add' | 'subtract' | 'set' = 'set'
): Promise<LoyaltyCard | null> {
  try {
    const sql = requireSql();
    let result;
    
    if (operation === 'add') {
      result = await sql`
        UPDATE loyalty_cards
        SET points = COALESCE(points, 0) + ${points}, updated_at = NOW()
        WHERE id = ${cardId}
        RETURNING *
      `;
    } else if (operation === 'subtract') {
      result = await sql`
        UPDATE loyalty_cards
        SET points = GREATEST(COALESCE(points, 0) - ${points}, 0), updated_at = NOW()
        WHERE id = ${cardId}
        RETURNING *
      `;
    } else {
      result = await sql`
        UPDATE loyalty_cards
        SET points = ${points}, updated_at = NOW()
        WHERE id = ${cardId}
        RETURNING *
      `;
    }
    
    if (!result.length) {
      return null;
    }
    
    return await getCardById(cardId);
  } catch (error) {
    console.error(`Error updating card points for card ${cardId}:`, error);
    return null;
  }
}

/**
 * Get card activities/history
 */
export async function getCardActivities(cardId: number, limit: number = 10): Promise<any[]> {
  try {
    const sql = requireSql();
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
 * Award points to a card
 */
export async function awardPoints(
  cardId: number,
  points: number,
  source: string,
  description: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    const sql = requireSql();
    if (points <= 0) {
      return { success: false, error: 'Points must be greater than zero' };
    }
    
    const result = await sql`
      UPDATE loyalty_cards
      SET points = COALESCE(points, 0) + ${points}, updated_at = NOW()
      WHERE id = ${cardId}
      RETURNING points
    `;
    
    if (!result.length) {
      return { success: false, error: 'Card not found' };
    }
    
    // Record activity
    await sql`
      INSERT INTO card_activities (
        card_id,
        activity_type,
        points,
        description,
        created_at
      ) VALUES (
        ${cardId},
        'EARN_POINTS',
        ${points},
        ${description},
        NOW()
      )
    `;
    
    return { 
      success: true, 
      newBalance: parseFloat(result[0].points) 
    };
  } catch (error) {
    console.error(`Error awarding points to card ${cardId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Create a new loyalty card
 */
export async function createCard(cardData: {
  customerId: number;
  businessId: number;
  programId: number;
  cardNumber: string;
}): Promise<LoyaltyCard | null> {
  try {
    const sql = requireSql();
    const result = await sql`
      INSERT INTO loyalty_cards (
        customer_id,
        business_id,
        program_id,
        card_number,
        points,
        tier,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${cardData.customerId},
        ${cardData.businessId},
        ${cardData.programId},
        ${cardData.cardNumber},
        0,
        'STANDARD',
        'ACTIVE',
        NOW(),
        NOW()
      )
      RETURNING id
    `;
    
    if (!result.length) {
      return null;
    }
    
    return await getCardById(result[0].id);
  } catch (error) {
    console.error('Error creating loyalty card:', error);
    return null;
  }
}

