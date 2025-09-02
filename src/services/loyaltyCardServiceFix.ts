/**
 * IMMEDIATE FIX for Points Synchronization Issue
 * 
 * This service provides fixed versions of the loyalty card methods that handle
 * the database column mismatch issue properly.
 */

import { getActualPoints } from '../utils/pointsColumnFix';
import sql from '../utils/db';

export class LoyaltyCardServiceFix {
  /**
   * FIXED VERSION: Get all loyalty cards for a customer with proper points handling
   * This addresses the core issue where cards show 0 points despite having points in the database
   */
  static async getCustomerCardsFixed(customerId: string): Promise<any[]> {
    try {
      // Ensure we have a valid customer ID
      if (!customerId) {
        console.error('Invalid customer ID');
        return [];
      }

      console.log(`🔧 FIXED: Fetching loyalty cards for customer ${customerId}`);

      // FIXED: Query includes all points columns for proper detection
      const result = await sql`
        SELECT 
          lc.*,
          lc.points,
          lc.points_balance,
          lc.total_points_earned,
          lp.name as program_name,
          lp.description as program_description,
          lp.type as program_type,
          lp.points_per_dollar,
          lp.points_expiry_days,
          u.name as business_name
        FROM loyalty_cards lc
        JOIN loyalty_programs lp ON lc.program_id = lp.id
        JOIN users u ON lp.business_id = u.id
        WHERE lc.customer_id = ${parseInt(customerId)} OR lc.customer_id = ${customerId}
        ORDER BY lc.created_at DESC
      `;

      if (!result.length) {
        console.log(`No loyalty cards found for customer ${customerId}`);
        return [];
      }

      console.log(`✅ FIXED: Found ${result.length} loyalty cards for customer ${customerId}`);

      // CRITICAL FIX: Use the fixed points extraction for each card
      return result.map(card => {
        const actualPoints = getActualPoints(card);
        
        return {
          id: card.id?.toString() || '',
          customerId: card.customer_id?.toString() || '',
          businessId: card.business_id?.toString() || '',
          programId: card.program_id?.toString() || '',
          programName: card.program_name || '',
          cardNumber: card.card_number || '',
          points: actualPoints, // 🎯 FIXED: Use the properly extracted points
          tier: card.tier || 'STANDARD',
          status: card.status || 'ACTIVE',
          expiryDate: card.expiry_date,
          createdAt: card.created_at,
          updatedAt: card.updated_at,
          cardType: card.card_type || 'STANDARD',
          businessName: card.business_name || '',
          pointsMultiplier: parseFloat(card.points_multiplier) || 1,
          pointsToNext: card.points_to_next_tier ? parseFloat(card.points_to_next_tier) : undefined,
          benefits: card.benefits || []
        };
      });
    } catch (error) {
      console.error('🚨 Error in getCustomerCardsFixed:', error);
      return [];
    }
  }

  /**
   * EMERGENCY FIX: Synchronize all points columns for all cards of a customer
   * This ensures database consistency by making all points columns have the same value
   */
  static async fixCustomerCardPoints(customerId: string): Promise<boolean> {
    try {
      console.log(`🔧 Emergency fix: Syncing points for customer ${customerId}`);
      
      const cards = await sql`
        SELECT id, points, points_balance, total_points_earned 
        FROM loyalty_cards 
        WHERE customer_id = ${parseInt(customerId)} OR customer_id = ${customerId}
      `;
      
      if (!cards.length) {
        console.log('No cards found to fix');
        return false;
      }
      
      let fixedCount = 0;
      
      for (const card of cards) {
        const actualPoints = getActualPoints(card);
        
        // Only update if there's a discrepancy
        const pointsVal = parseFloat(String(card.points || '0'));
        const pointsBalanceVal = parseFloat(String(card.points_balance || '0'));
        
        if (pointsVal !== actualPoints || pointsBalanceVal !== actualPoints) {
          await sql`
            UPDATE loyalty_cards 
            SET 
              points = ${actualPoints},
              points_balance = ${actualPoints},
              total_points_earned = ${actualPoints},
              updated_at = NOW()
            WHERE id = ${card.id}
          `;
          
          console.log(`✅ Fixed card ${card.id}: synced all columns to ${actualPoints} points`);
          fixedCount++;
        }
      }
      
      console.log(`🎉 Emergency fix completed: ${fixedCount} cards fixed`);
      return true;
    } catch (error) {
      console.error('🚨 Error in emergency fix:', error);
      return false;
    }
  }

  /**
   * DIAGNOSTIC: Check for points column mismatches in the database
   * This helps identify cards that have the synchronization issue
   */
  static async diagnoseMismatchedCards(customerId?: string): Promise<any[]> {
    try {
      const whereClause = customerId 
        ? sql`WHERE customer_id = ${parseInt(customerId)} OR customer_id = ${customerId}`
        : sql`WHERE 1=1`;
      
      const cards = await sql`
        SELECT 
          lc.id,
          lc.customer_id,
          lc.points,
          lc.points_balance,
          lc.total_points_earned,
          lp.name as program_name,
          u.name as business_name
        FROM loyalty_cards lc
        JOIN loyalty_programs lp ON lc.program_id = lp.id
        JOIN users u ON lp.business_id = u.id
        ${whereClause}
        ORDER BY lc.updated_at DESC
      `;
      
      const mismatchedCards = cards.filter(card => {
        const pointsVal = parseFloat(String(card.points || '0'));
        const pointsBalanceVal = parseFloat(String(card.points_balance || '0'));
        const totalEarnedVal = parseFloat(String(card.total_points_earned || '0'));
        
        // Check if there are discrepancies between columns
        return pointsVal !== pointsBalanceVal || 
               pointsVal !== totalEarnedVal || 
               pointsBalanceVal !== totalEarnedVal;
      });
      
      if (mismatchedCards.length > 0) {
        console.log(`🚨 Found ${mismatchedCards.length} cards with column mismatches:`);
        mismatchedCards.forEach(card => {
          console.log(`  Card ${card.id} (${card.program_name}): points=${card.points}, balance=${card.points_balance}, earned=${card.total_points_earned}`);
        });
      } else {
        console.log('✅ No points column mismatches found');
      }
      
      return mismatchedCards;
    } catch (error) {
      console.error('🚨 Error in diagnosis:', error);
      return [];
    }
  }
} 