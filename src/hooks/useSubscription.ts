import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlanFeatures = {
  max_branches: number;
  max_staff: number;
  max_products: number;
  modules: {
    manufacturing?: boolean;
    ai_advisor?: boolean;
    payroll?: boolean;
    assets?: boolean;
    multi_branch?: boolean;
  };
};

export type Subscription = {
  id: string;
  organization_id: string;
  plan_id: string;
  plan_name: string;
  plan_price: number;
  billing_period: string;
  plan_features: PlanFeatures;
  status: string;
  starts_at: string;
  expires_at: string | null;
};

export function useSubscription() {
  const { organizationId } = useAuth();

  const query = useQuery({
    queryKey: ["subscription", organizationId],
    queryFn: async (): Promise<Subscription | null> => {
      if (!organizationId) return null;
      const { data, error } = await supabase.rpc("get_org_subscription", {
        p_org_id: organizationId,
      });
      if (error) throw error;
      return (data as unknown as Subscription) ?? null;
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  const features: PlanFeatures = query.data?.plan_features ?? {
    max_branches: 0,
    max_staff: 0,
    max_products: 0,
    modules: {},
  };

  const hasFeature = (key: keyof PlanFeatures["modules"]) =>
    Boolean(features.modules?.[key]);

  const canAccess = (key: keyof PlanFeatures["modules"]) => {
    if (!query.data) return false; // No subscription
    if (query.data.status !== "active") return false; // Not active
    return hasFeature(key);
  };

  const checkLimit = (
    featureName: "max_branches" | "max_staff" | "max_products",
    currentCount: number
  ): { allowed: boolean; message?: string } => {
    const limit = features[featureName];
    if (limit === -1) return { allowed: true }; // Unlimited
    if (currentCount >= limit) {
      return {
        allowed: false,
        message: `You've reached your limit of ${limit} ${featureName.replace("max_", "")}.`,
      };
    }
    return { allowed: true };
  };

  const isExpired = query.data?.expires_at
    ? new Date(query.data.expires_at).getTime() < Date.now()
    : false;

  const isActive = !!query.data && !isExpired && query.data.status === "active";

  const daysLeft = query.data?.expires_at
    ? Math.max(0, Math.ceil((new Date(query.data.expires_at).getTime() - Date.now()) / 86_400_000))
    : null;

  return {
    subscription: query.data,
    features,
    hasFeature,
    canAccess,
    checkLimit,
    isActive,
    isExpired,
    daysLeft,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
