import { CurrencyCode } from './currency';

export type PromoCodeType = 'POINTS' | 'DISCOUNT' | 'CASHBACK' | 'GIFT';
export type PromoCodeStatus = 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'CANCELLED';

export interface PromoCode {
  id: string;
  businessId: string;
  businessName?: string;
  code: string;
  type: PromoCodeType;
  value: number;
  currency?: CurrencyCode;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  status: PromoCodeStatus;
  name?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCodeRedemption {
  id: string;
  codeId: string;
  customerId: string;
  businessId: string;
  value: number;
  currency?: CurrencyCode;
  transactionId?: string;
  redeemedAt: string;
}

export interface PromoCodeStats {
  totalCodes: number;
  activeCodes: number;
  totalRedemptions: number;
  redemptionRate: number;
  redemptionValue: number;
  byType: Record<PromoCodeType, number>;
} 