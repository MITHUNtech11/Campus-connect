/**
 * Route guard — the TS successor to the old ProtectedRoute.jsx + RoleGuard.jsx.
 * Both concerns are folded into one component: pass `roles` to additionally
 * gate on role, omit it for "any authenticated user".
 */

import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

export function FullPageSpinner() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
      <p className="text-sm text-slate-500">Loading your campus…</p>
    </div>
  );
}
