import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission, canAccessNavigation, isBusinessOwner, isStaffMember } from '../../utils/permissions';
import type { PermissionAction } from '../../utils/permissions';
import type { User } from '../../services/userService';

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: PermissionAction;
  navigationPath?: string;
  requiresOwner?: boolean;
  requiresStaff?: boolean;
  fallback?: React.ReactNode;
}

/**
 * PermissionGate - Conditionally renders children based on user permissions
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  navigationPath,
  requiresOwner = false,
  requiresStaff = false,
  fallback = null
}) => {
  const { user } = useAuth();

  // Check if user meets the requirements
  const hasAccess = checkAccess(user, {
    permission,
    navigationPath,
    requiresOwner,
    requiresStaff
  });

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Helper function to check access based on various criteria
 */
function checkAccess(
  user: User | null,
  criteria: {
    permission?: PermissionAction;
    navigationPath?: string;
    requiresOwner?: boolean;
    requiresStaff?: boolean;
  }
): boolean {
  const { permission, navigationPath, requiresOwner, requiresStaff } = criteria;

  if (!user) {
    return false;
  }

  // Check owner requirement
  if (requiresOwner && !isBusinessOwner(user)) {
    return false;
  }

  // Check staff requirement
  if (requiresStaff && !isStaffMember(user)) {
    return false;
  }

  // Check specific permission
  if (permission && !hasPermission(user, permission)) {
    return false;
  }

  // Check navigation access
  if (navigationPath && !canAccessNavigation(user, navigationPath)) {
    return false;
  }

  return true;
}

/**
 * OwnerOnly - Only renders children for business owners
 */
export const OwnerOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback = null }) => {
  return (
    <PermissionGate requiresOwner fallback={fallback}>
      {children}
    </PermissionGate>
  );
};

/**
 * StaffOnly - Only renders children for staff members
 */
export const StaffOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback = null }) => {
  return (
    <PermissionGate requiresStaff fallback={fallback}>
      {children}
    </PermissionGate>
  );
};

/**
 * WithPermission - Renders children only if user has specific permission
 */
export const WithPermission: React.FC<{
  children: React.ReactNode;
  permission: PermissionAction;
  fallback?: React.ReactNode;
}> = ({ children, permission, fallback = null }) => {
  return (
    <PermissionGate permission={permission} fallback={fallback}>
      {children}
    </PermissionGate>
  );
};

/**
 * RestrictedFeatureNotice - Shows a notice for restricted features
 */
export const RestrictedFeatureNotice: React.FC<{
  featureName: string;
  className?: string;
}> = ({ featureName, className = '' }) => {
  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center">
        <svg className="w-4 h-4 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="text-sm text-yellow-700">
          {featureName} is restricted for staff users. Contact your business owner for access.
        </span>
      </div>
    </div>
  );
};

/**
 * DeleteButton - Conditionally renders delete button based on permissions
 */
export const DeleteButton: React.FC<{
  permission: PermissionAction;
  onDelete: () => void;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}> = ({ permission, onDelete, className = '', children, disabled = false }) => {
  const { user } = useAuth();
  const canDelete = hasPermission(user, permission);

  if (!canDelete) {
    return (
      <button
        disabled
        className={`opacity-50 cursor-not-allowed ${className}`}
        title="Deletion restricted for staff users"
      >
        {children || (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onDelete}
      disabled={disabled}
      className={className}
    >
      {children || (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )}
    </button>
  );
};

/**
 * SettingsButton - Conditionally renders settings button based on permissions
 */
export const SettingsButton: React.FC<{
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}> = ({ onClick, className = '', children, disabled = false }) => {
  const { user } = useAuth();
  const canAccessSettings = canAccessNavigation(user, '/business/settings');

  if (!canAccessSettings) {
    return (
      <button
        disabled
        className={`opacity-50 cursor-not-allowed ${className}`}
        title="Settings access restricted for staff users"
      >
        {children || (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children || (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )}
    </button>
  );
};
