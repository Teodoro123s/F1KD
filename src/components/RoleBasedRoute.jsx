import React from 'react';
import { Navigate } from 'react-router-dom';
import { hasRole } from '../utils/permissions';
import { useAuth } from '../auth/AuthProvider';

export default function RoleBasedRoute({ allowedRoles = [], children }) {
  const { currentUser } = useAuth();

  if (!hasRole(currentUser?.role, allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}