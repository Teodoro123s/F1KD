import React from 'react';
import { Navigate } from 'react-router-dom';
import { hasRole } from '../utils/permissions';
import { useAuth } from '../auth/AuthProvider';

// Route-level UI guard; App.jsx supplies each route's allowed roles.
export default function RoleBasedRoute({ allowedRoles = [], children }) {
  const { currentUser } = useAuth();

  if (!hasRole(currentUser?.role, allowedRoles)) {
    return <Navigate to="/community" replace />;
  }

  return children;
}