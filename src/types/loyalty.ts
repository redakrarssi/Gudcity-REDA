export type ProgramType = 'POINTS' | 'STAMPS' | 'CASHBACK';

export interface LoyaltyProgram {
  id: string;
  businessId: string;
  name: string;
  description: string;
  type: ProgramType;
  pointValue: number; // For points/cashback: amount spent for 1 point
  rewardTiers: RewardTier[];
  expirationDays: number | null; // null means never expires
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface RewardTier {
  id: string;
  programId: string;
  pointsRequired: number;
  reward: string;
}

export interface LoyaltyCard {
  id: string;
  customerId: string;
  programId: string;
  businessId: string;
  cardNumber: string;
  points: number;
  pointsBalance: number;
  tier: string;
  status: string;
  programName: string;
  businessName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProgram {
  id: string;
  customerId: string;
  programId: string;
  currentPoints: number;
  lastActivity: string;
  enrolledAt: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  businessId: string;
  programId: string;
  type: 'EARN' | 'REDEEM';
  points: number;
  amount?: number; // For points earned from purchase
  rewardId?: string; // For redemptions
  createdAt: string;
  businessName?: string; // Add businessName field for display purposes
}

export interface RedemptionNotification {
  id: string;
  customerId: string;
  customerName: string;
  businessId: string;
  programId: string;
  programName: string;
  points: number;
  reward: string;
  rewardId: string;
  timestamp: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
}

export interface Business {
  id: string;
  name: string;
  category: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
  };
} 