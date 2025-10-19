/**
 * Shared types for server-side API services
 * These types are used across all server services for consistency
 */

// Standard API Response Format
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiMeta {
  timestamp: string;
  cached?: boolean;
  requestId?: string;
}

// User Types
export interface User {
  id: number;
  email: string;
  name: string;
  user_type: string;
  role: string;
  status: string;
  business_id?: number;
  business_name?: string;
  business_phone?: string;
  avatar_url?: string;
  created_at?: string;
  last_login?: string;
}

// Customer Types
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
  status: string;
  programCount?: number;
}

// Business Types
export interface Business {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  created_at?: string;
  status: string;
}

// Loyalty Program Types
export interface LoyaltyProgram {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  points_per_purchase: number;
  reward_threshold: number;
  status: string;
  created_at?: string;
}

// Loyalty Card Types
export interface LoyaltyCard {
  id: string;
  customer_id: string;
  program_id: string;
  business_id: string;
  card_number: string;
  points: number;
  points_balance: number;
  total_points_earned: number;
  tier: string;
  status: string;
  created_at?: string;
}

// Transaction Types
export interface Transaction {
  id: string;
  customer_id: string;
  business_id: string;
  program_id: string;
  card_id?: string;
  points: number;
  source: string;
  description?: string;
  created_at?: string;
}

// Notification Types
export interface Notification {
  id: string;
  user_id?: number;
  customer_id?: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  actioned: boolean;
  created_at?: string;
}

// Authentication Types
export interface AuthTokens {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  businessId?: number;
  iat?: number;
  exp?: number;
  jti?: string;
}

// Request Filter Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface FilterParams {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Database Query Types
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

