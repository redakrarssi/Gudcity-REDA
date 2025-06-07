# Flawless Loyalty Card System

This document provides comprehensive instructions for implementing and using the loyalty card system that connects customers with businesses. The system includes customer enrollment in programs, promo code redemption, and reward management.

## System Overview

The loyalty card system provides the following features:

- **Loyalty Cards**: Digital cards that track customer points and benefits for each business
- **Tiered Memberships**: Standard, Silver, Gold, and Platinum tiers with increasing benefits and point multipliers
- **Promo Codes**: Unique referral codes that customers can share to earn bonus points
- **Rewards Management**: Redeem points for various rewards based on tier level
- **Customer-Business Relationship**: Robust association between customers and businesses

## Installation Steps

Follow these steps to implement the loyalty card system:

1. **Set up database schema**:
   ```bash
   node setup-customer-business-schema.mjs
   ```

2. **Create card activities tracking table**:
   ```bash
   node setup-card-activities.mjs
   ```

3. **Fix existing customer-business relationships**:
   ```bash
   node fix-customer-business-linking.mjs
   ```

4. **Enhance loyalty card system**:
   ```bash
   node fix-loyalty-cards.mjs
   ```

## Database Schema

The loyalty card system relies on several key tables:

1. **loyalty_cards**: Stores the card information for each customer-business relationship
2. **card_activities**: Tracks all activities related to cards (earning points, redemptions, etc.)
3. **loyalty_programs**: Contains the business loyalty programs
4. **program_enrollments**: Links customers to loyalty programs

Key fields in the `loyalty_cards` table:
- `customer_id`: References the customer
- `business_id`: References the business
- `program_id`: References the loyalty program
- `tier`: The card tier (STANDARD, SILVER, GOLD, PLATINUM)
- `points`: Current loyalty points balance
- `points_multiplier`: Points multiplier based on tier
- `promo_code`: Unique referral code
- `benefits`: Array of benefits provided by this tier
- `available_rewards`: JSONB data storing available rewards

## Components and Services

The system includes the following key components:

### Services

1. **LoyaltyCardService** (`src/services/loyaltyCardService.ts`):
   - Manages all loyalty card operations
   - Handles program enrollment
   - Processes point transactions
   - Manages reward redemption
   - Handles promo code generation and redemption

### UI Components

1. **LoyaltyCard Component** (`src/components/customer/LoyaltyCard.tsx`):
   - Displays the loyalty card with tier information
   - Shows points, benefits, and rewards
   - Allows promo code sharing
   - Provides reward redemption interface

2. **LoyaltyCardsPage** (`src/pages/customer/LoyaltyCards.tsx`):
   - Main page for customers to view their loyalty cards
   - Interface for redeeming promo codes
   - Ability to join new loyalty programs

## Card Tiers and Benefits

The system provides four membership tiers with increasing benefits:

1. **STANDARD**:
   - Base points multiplier: 1.0x
   - Benefits: Basic rewards, Birthday gift
   - Requires: 0 points

2. **SILVER**:
   - Points multiplier: 1.25x
   - Benefits: All Standard benefits plus 5% discount
   - Requires: 1,000 points

3. **GOLD**:
   - Points multiplier: 1.5x
   - Benefits: All Silver benefits plus 10% discount and free monthly item
   - Requires: 2,500 points

4. **PLATINUM**:
   - Points multiplier: 2.0x
   - Benefits: All Gold benefits plus 15% discount, priority service, and exclusive events
   - Requires: 5,000 points

## Features Implementation

### 1. Joining a Loyalty Program

Customers can join a business's loyalty program through:

- **Promo code redemption**: When redeeming a friend's promo code
- **Direct enrollment**: Using the "Join Program" button on the loyalty cards page
- **Business invitation**: When a business adds a customer directly

### 2. Referral System (Promo Codes)

- Each loyalty card has a unique promo code
- When shared and redeemed, both the referrer and new customer get bonus points
- The system ensures customers can't redeem their own promo code

Example promo code format: `B12-C34-ABCDEF` (Business ID + Customer ID + Random characters)

### 3. Points & Rewards

- Customers earn points through transactions with the business
- Points can be redeemed for rewards based on tier
- Higher tiers receive better point multipliers (up to 2.0x for Platinum)
- Automatic tier upgrades happen when point thresholds are reached

### 4. Card Activities Tracking

All card activities are tracked in the `card_activities` table:

- Point earnings
- Reward redemptions
- Tier changes
- Promo code redemptions
- Program enrollment

## Integration Guide

To integrate the loyalty card system with your existing business operations:

### Point of Sale Integration

Add this code to your purchase completion flow:
```javascript
import { LoyaltyCardService } from '../services/loyaltyCardService';

// After purchase is complete
async function addPointsForPurchase(customerId, businessId, purchaseAmount) {
  // Find customer's card for this business
  const card = await LoyaltyCardService.getCustomerCard(customerId, businessId);
  
  if (card) {
    // Award 10 points per dollar spent (customize as needed)
    const pointsToAward = Math.floor(purchaseAmount * 10);
    await LoyaltyCardService.addPoints(card.id, pointsToAward, 'PURCHASE');
  }
}
```

### Reward Redemption at Business

Add this code to your reward redemption workflow:
```javascript
import { LoyaltyCardService } from '../services/loyaltyCardService';

// When customer wants to redeem a reward
async function handleRedeemReward(cardId, rewardName) {
  const result = await LoyaltyCardService.redeemReward(cardId, rewardName);
  
  if (result.success) {
    // Process the reward fulfillment
    fulfillReward(result.reward);
  } else {
    // Handle redemption failure
    showError(result.message);
  }
}
```

## Best Practices

1. **Regular Backups**: Schedule regular backups of the loyalty card data
2. **Point Expiration**: Consider implementing point expiration to encourage activity
3. **Special Promotions**: Run double or triple point promotions during slow periods
4. **Personalized Rewards**: Add special rewards based on customer preferences
5. **Analytics**: Use card activities to analyze customer behavior and preferences

## Troubleshooting

Common issues and solutions:

1. **Missing Points**: Check the card activities table for transaction history
2. **Promo Code Not Working**: Ensure the business ID matches and customer isn't redeeming their own code
3. **Tier Not Updating**: Verify that the checkAndUpdateTier function is being called after point changes
4. **Rewards Not Appearing**: Check that card.availableRewards is properly populated for the tier

## Conclusion

This loyalty card system provides a flawless implementation with robust customer-business linking, rewards management, and referral mechanisms. By following the installation steps and integration guide, you can quickly implement this system in your application to enhance customer retention and engagement. 