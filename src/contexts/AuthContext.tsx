import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

type AppRole = "owner" | "manager" | "cashier" | "accountant" | "super_admin";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  organizationId: string | null;
  organizationName: string | null;
  loading: boolean;
  rolesLoading: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  signOut: () => Promise<void>;
  // New: Auth hardening
  passwordStrength?: "weak" | "medium" | "strong";
  needsPasswordUpdate?: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  roles: [],
  organizationId: null,
  organizationName: null,
  loading: true,
  rolesLoading: true,
  hasRole: () => false,
  hasAnyRole: () => false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong">(
    "medium"
  );
  const [needsPasswordUpdate, setNeedsPasswordUpdate] = useState(false);

  const fetchRoles = async (userId: string) => {
    setRolesLoading(true);
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      setRoles(data?.map((r) => r.role as AppRole) || []);
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchOrganization = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .single();

    if (profile?.organization_id) {
      setOrganizationId(profile.organization_id);
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", profile.organization_id)
        .single();
      setOrganizationName(org?.name || null);
    }
  };

  // Check password strength and HIBP
  const validatePasswordSecurity = async (password: string) => {
    // Client-side password strength check
    const strength = getPasswordStrength(password);
    setPasswordStrength(strength);

    // Server-side HIBP check (via edge function)
    if (strength === "strong") {
      try {
        const { data, error } = await supabase.functions.invoke("check-hibp", {
          body: { password },
        });
        if (error) console.warn("HIBP check failed:", error);
        if (data?.leaked) {
          setNeedsPasswordUpdate(true);
        }
      } catch (e) {
        console.warn("Could not verify password against breach database");
      }
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          fetchRoles(session.user.id);
          fetchOrganization(session.user.id);
        } else {
          setRoles([]);
          setRolesLoading(false);
          setOrganizationId(null);
          setOrganizationName(null);
          setNeedsPasswordUpdate(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchRoles(session.user.id);
        fetchOrganization(session.user.id);
      } else {
        setRolesLoading(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: AppRole) => roles.includes(role);
  const hasAnyRole = (r: AppRole[]) => r.some((role) => roles.includes(role));

  const signOut = async () => {
    await supabase.auth.signOut();
    setNeedsPasswordUpdate(false);
    setPasswordStrength("medium");
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        roles,
        organizationId,
        organizationName,
        loading,
        rolesLoading,
        hasRole,
        hasAnyRole,
        signOut,
        passwordStrength,
        needsPasswordUpdate,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Password strength calculator
function getPasswordStrength(password: string): "weak" | "medium" | "strong" {
  if (!password) return "weak";
  if (password.length < 8) return "weak";
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password);

  const strength =
    Number(hasUppercase) +
    Number(hasLowercase) +
    Number(hasNumbers) +
    Number(hasSpecial);

  if (strength >= 3 && password.length >= 12) return "strong";
  if (strength >= 2 && password.length >= 10) return "medium";
  return "weak";
}
