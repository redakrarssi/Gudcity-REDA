/**
 * Business-related types for the application
 */

export interface Business {
  id: number | string; // Can be numeric or UUID depending on DB schema
  name: string;
  business_name?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  created_at: string | Date;
  updated_at?: string | Date;
  user_type: 'business';
  role?: string;
  settings?: BusinessSettings;
}

export interface BusinessSettings {
  notification_preferences?: NotificationPreferences;
  branding?: BusinessBranding;
  payment_info?: PaymentInfo;
  operational_hours?: OperationalHours[];
  default_currency?: string;
  timezone?: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  marketing_emails: boolean;
}

export interface BusinessBranding {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  banner_image_url?: string;
}

export interface PaymentInfo {
  payment_methods?: string[];
  stripe_connected?: boolean;
  bank_account_configured?: boolean;
}

export interface OperationalHours {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  open_time?: string;
  close_time?: string;
  is_closed: boolean;
}

export interface BusinessListItem {
  id: string;
  name: string;
}

export interface UserRole {
  role: string;
}

export interface BusinessWithoutSensitiveData extends Omit<Business, 'password'> {
  // Additional fields can be added here if needed
} 