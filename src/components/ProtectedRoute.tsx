import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "owner" | "manager" | "cashier" | "accountant" | "super_admin";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { roles, loading, rolesLoading, session } = useAuth();

  // Wait until both session and roles are resolved
  if (loading || rolesLoading) return null;

  if (!session) return <Navigate to="/auth" replace />;

  const hasAccess = allowedRoles.some((role) => roles.includes(role));
  if (!hasAccess) return <Navigate to="/" replace />;

  return <>{children}</>;
}
