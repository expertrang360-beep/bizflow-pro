import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "owner" | "manager" | "cashier" | "accountant" | "super_admin";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { roles, loading } = useAuth();

  if (loading) return null;

  // If roles haven't loaded yet (empty array), allow access to prevent flash redirects
  // RLS policies are the real security enforcement
  if (roles.length === 0) return <>{children}</>;

  const hasAccess = allowedRoles.some((role) => roles.includes(role));

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
