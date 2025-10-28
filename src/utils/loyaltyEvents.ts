import { recordEvent } from './telemetry';

// Define custom loyalty event types
export const LOYALTY_EVENT = {
  POINTS_ADDED: 'loyalty.points.added',
  POINTS_REDEEMED: 'loyalty.points.redeemed',
  ENROLLMENT_NEW: 'loyalty.enrollment.new',
  PROMO_CODE_GENERATED: 'loyalty.promo.generated'
};

/**
 * Emit loyalty points added event
 */
export function emitPointsAddedEvent(
  customerId: string | number,
  businessId: string | number,
  businessName: string,
  points: number,
  cardId: string | number
): void {
  recordEvent('error', {
    type: LOYALTY_EVENT.POINTS_ADDED,
    customerId,
    businessId,
    businessName,
    points,
    cardId,
    timestamp: Date.now()
  });
}

/**
 * Emit loyalty points redeemed event
 */
export function emitPointsRedeemedEvent(
  customerId: string | number,
  businessId: string | number,
  businessName: string,
  points: number,
  cardId: string | number,
  rewardName?: string
): void {
  recordEvent('error', {
    type: LOYALTY_EVENT.POINTS_REDEEMED,
    customerId,
    businessId,
    businessName,
    points,
    cardId,
    rewardName,
    timestamp: Date.now()
  });
}

/**
 * Emit new enrollment event
 */
export function emitEnrollmentEvent(
  customerId: string | number,
  businessId: string | number,
  businessName: string,
  programId: string | number,
  programName: string,
  cardId: string | number
): void {
  recordEvent('error', {
    type: LOYALTY_EVENT.ENROLLMENT_NEW,
    customerId,
    businessId,
    businessName,
    programId,
    programName,
    cardId,
    timestamp: Date.now()
  });
}

/**
 * Emit promo code generated event
 */
export function emitPromoCodeGeneratedEvent(
  customerId: string | number,
  businessId: string | number,
  businessName: string,
  cardId: string | number,
  promoCode: string
): void {
  recordEvent('error', {
    type: LOYALTY_EVENT.PROMO_CODE_GENERATED,
    customerId,
    businessId,
    businessName,
    cardId,
    promoCode,
    timestamp: Date.now()
  });
} 