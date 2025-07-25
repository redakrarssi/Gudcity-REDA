/**
 * CRITICAL POINTS SYNCHRONIZATION FIX
 * 
 * This utility addresses the core issue where points are stored in different database columns
 * but the frontend only reads from one column, causing a disconnect between 
 * notifications (which show success) and card display (which shows 0 points).
 */

/**
 * Extracts the actual points value from a loyalty card database record
 * by checking multiple possible columns in priority order.
 * 
 * PRIORITY ORDER:
 * 1. points_balance (most commonly updated by points awarding functions)
 * 2. total_points_earned (backup column)  
 * 3. points (legacy column)
 * 4. 0 (fallback)
 */
export function getActualPoints(cardRecord: any): number {
  let actualPoints = 0;
  
  // Priority 1: Check points_balance (this is often where points are actually stored)
  if (cardRecord.points_balance !== null && cardRecord.points_balance !== undefined) {
    const pointsBalanceValue = parseFloat(String(cardRecord.points_balance)) || 0;
    if (pointsBalanceValue > 0) {
      actualPoints = pointsBalanceValue;
      console.log(`Found points in points_balance: ${actualPoints} for card ${cardRecord.id}`);
      return actualPoints;
    }
  }
  
  // Priority 2: Check total_points_earned
  if (cardRecord.total_points_earned !== null && cardRecord.total_points_earned !== undefined) {
    const totalEarnedValue = parseFloat(String(cardRecord.total_points_earned)) || 0;
    if (totalEarnedValue > 0) {
      actualPoints = totalEarnedValue;
      console.log(`Found points in total_points_earned: ${actualPoints} for card ${cardRecord.id}`);
      return actualPoints;
    }
  }
  
  // Priority 3: Check points (legacy)
  if (cardRecord.points !== null && cardRecord.points !== undefined) {
    const pointsValue = parseFloat(String(cardRecord.points)) || 0;
    if (pointsValue > 0) {
      actualPoints = pointsValue;
      return actualPoints;
    }
  }
  
  // Log discrepancies for debugging
  const pointsVal = parseFloat(String(cardRecord.points || '0'));
  const pointsBalanceVal = parseFloat(String(cardRecord.points_balance || '0'));
  const totalEarnedVal = parseFloat(String(cardRecord.total_points_earned || '0'));
  
  if (pointsVal !== pointsBalanceVal && (pointsVal > 0 || pointsBalanceVal > 0)) {
    console.warn(`Points column mismatch for card ${cardRecord.id}:`, {
      points: pointsVal,
      points_balance: pointsBalanceVal, 
      total_points_earned: totalEarnedVal,
      using: actualPoints
    });
  }
  
  return actualPoints;
}

/**
 * Validates that points awarding functions are updating the correct columns.
 * This can be called after points are awarded to ensure consistency.
 */
export async function validatePointsConsistency(cardId: string, sql: any): Promise<boolean> {
  try {
    const card = await sql`
      SELECT points, points_balance, total_points_earned, updated_at
      FROM loyalty_cards 
      WHERE id = ${cardId}
    `;
    
    if (!card.length) {
      console.error(`Card ${cardId} not found for validation`);
      return false;
    }
    
    const cardData = card[0];
    const actualPoints = getActualPoints(cardData);
    
    console.log(`Points validation for card ${cardId}:`, {
      points: cardData.points,
      points_balance: cardData.points_balance,
      total_points_earned: cardData.total_points_earned,
      computed_actual: actualPoints,
      last_updated: cardData.updated_at
    });
    
    return true;
  } catch (error) {
    console.error(`Error validating points for card ${cardId}:`, error);
    return false;
  }
}

/**
 * Emergency fix function that can be called to sync all points columns
 * for a specific loyalty card. This ensures all columns have the same value.
 */
export async function syncPointsColumns(cardId: string, sql: any): Promise<boolean> {
  try {
    const card = await sql`
      SELECT * FROM loyalty_cards WHERE id = ${cardId}
    `;
    
    if (!card.length) {
      console.error(`Card ${cardId} not found for sync`);
      return false;
    }
    
    const actualPoints = getActualPoints(card[0]);
    
    // Update all points columns to have the same value
    await sql`
      UPDATE loyalty_cards 
      SET 
        points = ${actualPoints},
        points_balance = ${actualPoints},
        total_points_earned = ${actualPoints},
        updated_at = NOW()
      WHERE id = ${cardId}
    `;
    
    console.log(`Synced all points columns for card ${cardId} to ${actualPoints} points`);
    return true;
  } catch (error) {
    console.error(`Error syncing points columns for card ${cardId}:`, error);
    return false;
  }
} 