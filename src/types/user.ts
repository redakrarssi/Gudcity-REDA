export interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  role?: string;
  user_type?: string;
  business_name?: string;
  business_phone?: string;
  avatar_url?: string;
  reset_token?: string;
  reset_token_expires?: Date;
  last_login?: Date;
  created_at?: Date;
  status?: 'active' | 'banned' | 'restricted';
}

export type UserType = 'customer' | 'business';
export type UserRole = 'admin' | 'customer' | 'business';