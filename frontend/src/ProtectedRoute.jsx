import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function isAdminToken(token) {
  try {
    const payloadSegment = token.split('.')[1];
    const payload = JSON.parse(window.atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/')));
    return payload.isAdmin === true;
  } catch (error) {
    return false;
  }
}

function ProtectedRoute({ children, token, requireAdmin = false }) {
  const location = useLocation();

  if (requireAdmin && !isAdminToken(token)) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
