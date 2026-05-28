import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, PlanFeatures } from "@/hooks/useSubscription";

interface FeatureGateProps {
  feature: keyof PlanFeatures["modules"];
  children: ReactNode;
  fallback?: ReactNode;
  /** When true, renders nothing (instead of upgrade card) if locked. */
  silent?: boolean;
  /** Show limit reached message instead of generic locked */
  showLimitMessage?: boolean;
  currentCount?: number;
  maxCount?: number;
}

export default function FeatureGate({
  feature,
  children,
  fallback,
  silent,
  showLimitMessage,
  currentCount,
  maxCount,
}: FeatureGateProps) {
  const { hasFeature, loading, subscription, features } = useSubscription();
  const navigate = useNavigate();

  if (loading) return null;
  if (hasFeature(feature)) return <>{children}</>;
  if (silent) return null;
  if (fallback) return <>{fallback}</>;

  const planName = subscription?.plan_name ?? "current";
  const isLimitReached =
    showLimitMessage && currentCount !== undefined && maxCount !== undefined && currentCount >= maxCount;

  return (
    <div className="px-4 py-8">
      <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-card">
        <div
          className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
            isLimitReached
              ? "bg-warning/10"
              : "bg-primary/10"
          }`}
        >
          {isLimitReached ? (
            <AlertCircle className="w-6 h-6 text-warning" />
          ) : (
            <Lock className="w-6 h-6 text-primary" />
          )}
        </div>
        <h3 className="font-display text-lg font-semibold mb-1">
          {isLimitReached ? "Limit reached" : "Premium feature"}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {isLimitReached ? (
            <>
              You've reached the <span className="font-medium">{maxCount}</span> limit for{" "}
              <span className="font-medium">{feature}</span> on your{" "}
              <span className="font-medium">{planName}</span> plan.
            </>
          ) : (
            <>
              Your <span className="font-medium">{planName}</span> plan doesn't include this module.
              Upgrade to unlock.
            </>
          )}
        </p>
        <Button onClick={() => navigate("/subscription")} className="gap-2">
          <Sparkles className="w-4 h-4" />
          {isLimitReached ? "Upgrade plan" : "View plans"}
        </Button>
      </div>
    </div>
  );
}
