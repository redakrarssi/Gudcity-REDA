import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const UserRoleDebug: React.FC = () => {
  const { user, hasPermission } = useAuth();
  
  console.log('DEBUG: Current user data:', user);
  console.log('DEBUG: User role:', user?.role);
  console.log('DEBUG: User type:', user?.user_type);
  console.log('DEBUG: Has staff.manage permission:', hasPermission('business.staff.manage'));
  console.log('DEBUG: Has profile.view permission:', hasPermission('business.profile.view'));

  if (!user) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <strong>DEBUG:</strong> No user logged in
      </div>
    );
  }

  return (
    <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
      <h3 className="font-bold">User Debug Info:</h3>
      <p><strong>ID:</strong> {user.id}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Role:</strong> {user.role}</p>
      <p><strong>User Type:</strong> {user.user_type}</p>
      <p><strong>Status:</strong> {user.status}</p>
      <p><strong>Has business.staff.manage permission:</strong> {hasPermission('business.staff.manage') ? '✅' : '❌'}</p>
      <p><strong>Has business.profile.view permission:</strong> {hasPermission('business.profile.view') ? '✅' : '❌'}</p>
    </div>
  );
};
