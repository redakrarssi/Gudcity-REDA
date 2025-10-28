import { User } from '../services/userService';

/**
 * Get the business ID that the current user should operate under
 * - For business owners: returns their own ID
 * - For staff members: returns their business_owner_id
 * - For other roles: returns user's ID (fallback)
 */
export function getBusinessId(user: User | null): number | null {
  if (!user || !user.id) {
    return null;
  }

  // If user is staff, return the business owner's ID
  if (user.role === 'staff' && user.business_owner_id) {
    console.log('🔍 BusinessContext: Staff user accessing business owner data:', user.business_owner_id);
    return user.business_owner_id;
  }

  // For business owners and other roles, return their own ID
  return user.id;
}

/**
 * Get the business ID as a string (commonly needed for API calls)
 */
export function getBusinessIdString(user: User | null): string {
  const businessId = getBusinessId(user);
  return businessId ? businessId.toString() : '';
}

/**
 * Check if the current user is operating on behalf of a business
 * (either as owner or staff)
 */
export function isBusinessContext(user: User | null): boolean {
  if (!user) return false;
  
  return user.role === 'business' || 
         user.role === 'owner' || 
         user.role === 'staff';
}

/**
 * Get display name for the business context
 * - For owners: "Your Business"
 * - For staff: "Business Name" (if available)
 */
export function getBusinessContextName(user: User | null): string {
  if (!user) return '';
  
  if (user.role === 'staff') {
    return user.business_name || 'Business';
  }
  
  return user.business_name || 'Your Business';
}

/**
 * Check if user can perform owner-only actions in current business context
 */
export function canPerformOwnerActions(user: User | null): boolean {
  if (!user) return false;
  
  return user.role === 'business' || 
         user.role === 'owner' || 
         user.role === 'admin';
}
