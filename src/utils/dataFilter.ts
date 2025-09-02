/**
 * Data Filtering Utility
 * Implements data minimization and role-based access control for API responses
 */

export interface FilterOptions {
  requestingUserId?: string | number;
  userRole?: string;
  isAdmin?: boolean;
  includePrivateFields?: boolean;
}

/**
 * Sensitive fields that should never be exposed in API responses
 */
const ALWAYS_EXCLUDED_FIELDS = [
  'password',
  'password_hash', 
  'password_salt',
  'api_key',
  'api_keys',
  'secret',
  'secrets',
  'private_key',
  'refresh_token',
  'reset_token',
  'verification_token'
];

/**
 * Fields that contain PII and require special handling
 */
const PII_FIELDS = [
  'ssn',
  'social_security_number',
  'credit_card',
  'credit_card_number',
  'credit_card_last4',
  'bank_account',
  'date_of_birth',
  'birth_date',
  'passport_number',
  'driver_license'
];

/**
 * Fields that are private but can be shown to the user themselves or admins
 */
const PRIVATE_FIELDS = [
  'phone',
  'address',
  'street_address',
  'home_address',
  'billing_address',
  'emergency_contact',
  'last_login',
  'login_history',
  'ip_address',
  'user_agent'
];

/**
 * Fields that are public and safe to show to anyone
 */
const PUBLIC_FIELDS = [
  'id',
  'name',
  'display_name',
  'username',
  'email',
  'role',
  'user_type',
  'status',
  'created_at',
  'updated_at',
  'avatar_url',
  'business_name',
  'business_type'
];

/**
 * Filter user data based on access permissions
 */
export function filterUserData(
  user: any, 
  options: FilterOptions = {}
): any {
  if (!user || typeof user !== 'object') {
    return user;
  }

  const {
    requestingUserId,
    userRole = 'user',
    isAdmin = false,
    includePrivateFields = false
  } = options;

  // Check if requesting user is viewing their own data
  const isOwnData = requestingUserId && 
    (String(user.id) === String(requestingUserId) || 
     String(user.user_id) === String(requestingUserId));

  const filtered: any = {};

  for (const [key, value] of Object.entries(user)) {
    const keyLower = key.toLowerCase();

    // Always exclude sensitive fields
    if (ALWAYS_EXCLUDED_FIELDS.some(field => keyLower.includes(field))) {
      continue;
    }

    // Never include PII unless explicitly admin
    if (PII_FIELDS.some(field => keyLower.includes(field)) && !isAdmin) {
      continue;
    }

    // Handle private fields
    if (PRIVATE_FIELDS.some(field => keyLower.includes(field))) {
      if (isAdmin || isOwnData || includePrivateFields) {
        filtered[key] = value;
      }
      continue;
    }

    // Include public fields and any remaining fields for admins/own data
    if (PUBLIC_FIELDS.some(field => keyLower.includes(field)) || 
        isAdmin || 
        isOwnData) {
      filtered[key] = value;
    }
  }

  return filtered;
}

/**
 * Filter an array of user objects
 */
export function filterUserDataArray(
  users: any[], 
  options: FilterOptions = {}
): any[] {
  if (!Array.isArray(users)) {
    return users;
  }

  return users.map(user => filterUserData(user, options));
}

/**
 * Filter business data to remove sensitive information
 */
export function filterBusinessData(
  business: any,
  options: FilterOptions = {}
): any {
  if (!business || typeof business !== 'object') {
    return business;
  }

  const {
    requestingUserId,
    isAdmin = false
  } = options;

  // Check if requesting user owns this business
  const isOwnBusiness = requestingUserId && 
    (String(business.id) === String(requestingUserId) || 
     String(business.user_id) === String(requestingUserId) ||
     String(business.owner_id) === String(requestingUserId));

  const filtered: any = {};

  for (const [key, value] of Object.entries(business)) {
    const keyLower = key.toLowerCase();

    // Always exclude sensitive fields
    if (ALWAYS_EXCLUDED_FIELDS.some(field => keyLower.includes(field))) {
      continue;
    }

    // Handle business-specific private fields
    const businessPrivateFields = [
      'tax_id', 'ein', 'bank_account', 'revenue', 'profit', 
      'customer_count', 'internal_notes', 'api_settings'
    ];

    if (businessPrivateFields.some(field => keyLower.includes(field))) {
      if (isAdmin || isOwnBusiness) {
        filtered[key] = value;
      }
      continue;
    }

    // Include public business information
    const businessPublicFields = [
      'id', 'name', 'business_name', 'description', 'address',
      'phone', 'email', 'website', 'logo', 'category', 'status',
      'created_at', 'updated_at'
    ];

    if (businessPublicFields.some(field => keyLower.includes(field)) ||
        isAdmin || 
        isOwnBusiness) {
      filtered[key] = value;
    }
  }

  return filtered;
}

/**
 * Filter loyalty card data to remove sensitive information
 */
export function filterLoyaltyCardData(
  card: any,
  options: FilterOptions = {}
): any {
  if (!card || typeof card !== 'object') {
    return card;
  }

  const {
    requestingUserId,
    isAdmin = false
  } = options;

  // Check if requesting user owns this card
  const isOwnCard = requestingUserId && 
    (String(card.customer_id) === String(requestingUserId) || 
     String(card.user_id) === String(requestingUserId));

  const filtered: any = {};

  for (const [key, value] of Object.entries(card)) {
    const keyLower = key.toLowerCase();

    // Always exclude sensitive fields
    if (ALWAYS_EXCLUDED_FIELDS.some(field => keyLower.includes(field))) {
      continue;
    }

    // Card-specific private fields (full card number, etc.)
    const cardPrivateFields = ['full_card_number', 'internal_id', 'secret_code'];
    
    if (cardPrivateFields.some(field => keyLower.includes(field))) {
      if (isAdmin || isOwnCard) {
        filtered[key] = value;
      }
      continue;
    }

    // Include card information for owner or admin
    if (isAdmin || isOwnCard) {
      filtered[key] = value;
    } else {
      // For non-owners, only show very basic public info
      const publicCardFields = ['id', 'business_name', 'program_name', 'status'];
      if (publicCardFields.some(field => keyLower.includes(field))) {
        filtered[key] = value;
      }
    }
  }

  return filtered;
}

/**
 * Generic data filtering function that detects data type
 */
export function filterSensitiveData(
  data: any,
  dataType: 'user' | 'business' | 'card' | 'generic' = 'generic',
  options: FilterOptions = {}
): any {
  if (!data) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => filterSensitiveData(item, dataType, options));
  }

  switch (dataType) {
    case 'user':
      return filterUserData(data, options);
    case 'business':
      return filterBusinessData(data, options);
    case 'card':
      return filterLoyaltyCardData(data, options);
    default:
      return filterUserData(data, options); // Default to user filtering
  }
}

/**
 * Check if user has admin privileges
 */
export function isUserAdmin(userRole?: string): boolean {
  return userRole === 'admin' || userRole === 'super_admin' || userRole === 'system_admin';
}

/**
 * Create filter options from request context
 */
export function createFilterOptionsFromRequest(req: any): FilterOptions {
  const user = req.user;
  
  return {
    requestingUserId: user?.id,
    userRole: user?.role,
    isAdmin: isUserAdmin(user?.role),
    includePrivateFields: false
  };
}
