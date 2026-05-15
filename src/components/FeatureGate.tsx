import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, PlanFeatures } from "@/hooks/useSubscription";

interface FeatureGateProps {
  feature: keyof PlanFeatures["modules"];
  children: ReactNode;
  fallback?: ReactNode;
  /** When true, renders nothing (instead of upgrade card) if locked. */
  silent?: boolean;
}

export default function FeatureGate({ feature, children, fallback, silent }: FeatureGateProps) {
  const { hasFeature, loading, subscription } = useSubscription();
  const navigate = useNavigate();

  if (loading) return null;
  if (hasFeature(feature)) return <>{children}</>;
  if (silent) return null;
  if (fallback) return <>{fallback}</>;

  return (
    <div className="px-4 py-8">
      <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-card">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-display text-lg font-semibold mb-1">Premium feature</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your <span className="font-medium">{subscription?.plan_name ?? "current"}</span> plan doesn't include this module. Upgrade to unlock.
        </p>
        <Button onClick={() => navigate("/subscription")} className="gap-2">
          <Sparkles className="w-4 h-4" />
          View plans
        </Button>
      </div>
    </div>
  );
}
