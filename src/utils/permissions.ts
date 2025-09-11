import type { User, StaffPermissions } from '../services/userService';

// Define permission actions for different resources
export interface PermissionAction {
  resource: string;
  action: string;
}

// Permission constants
export const PERMISSIONS = {
  // Settings permissions
  SETTINGS_ACCESS: { resource: 'settings', action: 'access' },
  SETTINGS_MODIFY: { resource: 'settings', action: 'modify' },
  
  // Staff management permissions
  STAFF_CREATE: { resource: 'staff', action: 'create' },
  STAFF_VIEW: { resource: 'staff', action: 'view' },
  STAFF_EDIT: { resource: 'staff', action: 'edit' },
  STAFF_DELETE: { resource: 'staff', action: 'delete' },
  STAFF_MANAGE_PERMISSIONS: { resource: 'staff', action: 'manage_permissions' },
  
  // Program permissions
  PROGRAMS_CREATE: { resource: 'programs', action: 'create' },
  PROGRAMS_VIEW: { resource: 'programs', action: 'view' },
  PROGRAMS_EDIT: { resource: 'programs', action: 'edit' },
  PROGRAMS_DELETE: { resource: 'programs', action: 'delete' },
  
  // Promotion permissions
  PROMOTIONS_CREATE: { resource: 'promotions', action: 'create' },
  PROMOTIONS_VIEW: { resource: 'promotions', action: 'view' },
  PROMOTIONS_EDIT: { resource: 'promotions', action: 'edit' },
  PROMOTIONS_DELETE: { resource: 'promotions', action: 'delete' },
  
  // Customer permissions
  CUSTOMERS_VIEW: { resource: 'customers', action: 'view' },
  CUSTOMERS_EDIT: { resource: 'customers', action: 'edit' },
  
  // Analytics/Reports permissions
  ANALYTICS_VIEW: { resource: 'analytics', action: 'view' },
  REPORTS_VIEW: { resource: 'reports', action: 'view' },
  
  // QR Scanner permissions
  QR_SCAN: { resource: 'qr', action: 'scan' },
  POINTS_AWARD: { resource: 'points', action: 'award' },
} as const;

/**
 * Check if a user has permission to perform a specific action
 */
export function hasPermission(
  user: User | null, 
  permission: PermissionAction
): boolean {
  if (!user) {
    return false;
  }

  const { resource, action } = permission;

  // Admin users have all permissions
  if (user.role === 'admin') {
    return true;
  }

  // Business owners (role: owner or business) have all business permissions
  if (user.role === 'owner' || user.role === 'business') {
    return true;
  }

  // Staff users - check their specific permissions
  if (user.role === 'staff' && user.permissions) {
    const permissions = user.permissions;
    
    switch (`${resource}.${action}`) {
      // Settings - Staff cannot access settings
      case 'settings.access':
      case 'settings.modify':
        return permissions.canAccessSettings;
      
      // Staff management - Only owners can manage staff
      case 'staff.create':
      case 'staff.view':
      case 'staff.edit':
      case 'staff.delete':
      case 'staff.manage_permissions':
        return permissions.canManageStaff;
      
      // Programs
      case 'programs.create':
        return permissions.canCreatePrograms;
      case 'programs.view':
        return true; // Staff can always view programs
      case 'programs.edit':
        return permissions.canEditPrograms;
      case 'programs.delete':
        return permissions.canDeletePrograms;
      
      // Promotions
      case 'promotions.create':
        return permissions.canCreatePromotions;
      case 'promotions.view':
        return true; // Staff can always view promotions
      case 'promotions.edit':
        return permissions.canEditPromotions;
      case 'promotions.delete':
        return permissions.canDeletePromotions;
      
      // Customers
      case 'customers.view':
      case 'customers.edit':
        return permissions.canViewCustomers;
      
      // Analytics/Reports
      case 'analytics.view':
      case 'reports.view':
        return permissions.canViewReports;
      
      // QR Scanner
      case 'qr.scan':
        return permissions.canScanQR;
      case 'points.award':
        return permissions.canAwardPoints;
      
      default:
        return false;
    }
  }

  // Default: no permission
  return false;
}

/**
 * Check if user can access a specific navigation item
 */
export function canAccessNavigation(
  user: User | null, 
  navigationPath: string
): boolean {
  if (!user) {
    return false;
  }

  // Admin and business owners can access everything
  if (user.role === 'admin' || user.role === 'owner' || user.role === 'business') {
    return true;
  }

  // Staff users - check specific navigation permissions
  if (user.role === 'staff') {
    switch (navigationPath) {
      case '/business/dashboard':
        return true; // Staff can always access dashboard
      case '/business/programs':
        return hasPermission(user, PERMISSIONS.PROGRAMS_VIEW);
      case '/business/analytics':
        return hasPermission(user, PERMISSIONS.ANALYTICS_VIEW);
      case '/business/customers':
        return hasPermission(user, PERMISSIONS.CUSTOMERS_VIEW);
      case '/business/staff':
        return hasPermission(user, PERMISSIONS.STAFF_VIEW);
      case '/business/promotions':
        return hasPermission(user, PERMISSIONS.PROMOTIONS_VIEW);
      case '/business/qr-scanner':
        return hasPermission(user, PERMISSIONS.QR_SCAN);
      case '/business/settings':
        return hasPermission(user, PERMISSIONS.SETTINGS_ACCESS);
      default:
        return false;
    }
  }

  return false;
}

/**
 * Get restricted features for a staff user
 */
export function getRestrictedFeatures(user: User | null): string[] {
  const restrictions: string[] = [];

  if (!user || user.role !== 'staff') {
    return restrictions;
  }

  if (!hasPermission(user, PERMISSIONS.PROGRAMS_DELETE)) {
    restrictions.push('delete_programs');
  }

  if (!hasPermission(user, PERMISSIONS.PROMOTIONS_DELETE)) {
    restrictions.push('delete_promotions');
  }

  if (!hasPermission(user, PERMISSIONS.SETTINGS_ACCESS)) {
    restrictions.push('access_settings');
  }

  if (!hasPermission(user, PERMISSIONS.STAFF_MANAGE_PERMISSIONS)) {
    restrictions.push('manage_staff');
  }

  return restrictions;
}

/**
 * Check if user is business owner (can manage staff)
 */
export function isBusinessOwner(user: User | null): boolean {
  if (!user) return false;
  
  return user.role === 'owner' || 
         user.role === 'business' || 
         user.role === 'admin';
}

/**
 * Check if user is staff member
 */
export function isStaffMember(user: User | null): boolean {
  if (!user) return false;
  
  return user.role === 'staff';
}

/**
 * Get user role display name
 */
export function getUserRoleDisplayName(user: User | null): string {
  if (!user) return 'Guest';
  
  switch (user.role) {
    case 'admin':
      return 'Administrator';
    case 'owner':
      return 'Business Owner';
    case 'business':
      return 'Business Owner';
    case 'staff':
      return 'Staff Member';
    case 'customer':
      return 'Customer';
    default:
      return 'User';
  }
}

/**
 * Permission-based component wrapper
 */
export function withPermission<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  permission: PermissionAction,
  fallback?: React.ComponentType<T> | React.ReactElement | null
) {
  return function PermissionWrapper(props: T & { user?: User | null }) {
    const { user, ...restProps } = props;
    
    if (!hasPermission(user, permission)) {
      if (fallback) {
        return typeof fallback === 'function' ? React.createElement(fallback, restProps as T) : fallback;
      }
      return null;
    }

    return React.createElement(Component, restProps as T);
  };
}

/**
 * React hook to check permissions
 */
export function usePermission(user: User | null, permission: PermissionAction) {
  return hasPermission(user, permission);
}

/**
 * React hook to check navigation access
 */
export function useNavigationAccess(user: User | null, navigationPath: string) {
  return canAccessNavigation(user, navigationPath);
}
