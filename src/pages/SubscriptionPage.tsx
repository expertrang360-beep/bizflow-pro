import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Sparkles, Calendar, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_period: string;
  duration_days: number;
  features: any;
  sort_order: number;
};

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { subscription, daysLeft, refetch } = useSubscription();
  const [licenseKey, setLicenseKey] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Plan[];
    },
  });

  const handleRedeem = async () => {
    if (!licenseKey.trim()) {
      toast.error("Enter a license key");
      return;
    }
    setRedeeming(true);
    try {
      const { data, error } = await supabase.rpc("redeem_license_key", {
        p_key: licenseKey.trim().toUpperCase(),
      });
      if (error) throw error;
      const result = data as any;
      toast.success(`Activated ${result?.plan_name ?? "plan"} 🎉`);
      setLicenseKey("");
      await refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to redeem key");
    } finally {
      setRedeeming(false);
    }
  };

  const fmt = (n: number, cur = "NGN") =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="flex flex-col min-h-full pb-8">
      <div className="gradient-hero px-5 pt-12 pb-10">
        <button onClick={() => navigate(-1)} className="text-primary-foreground/80 mb-3 flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-primary-foreground font-display text-2xl font-bold">Subscription</h1>
        <p className="text-primary-foreground/70 text-sm">Manage your plan and unlock features</p>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {/* Current plan */}
        <Card className="p-5 shadow-card">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Current plan</p>
                <p className="font-display text-lg font-semibold">{subscription?.plan_name ?? "No active plan"}</p>
              </div>
            </div>
            {subscription && (
              <span className="text-xs px-2 py-1 rounded-full bg-[hsl(var(--success-light))] text-[hsl(var(--success-text))] font-medium">
                Active
              </span>
            )}
          </div>
          {subscription?.expires_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {daysLeft !== null && daysLeft > 0
                  ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                  : "Expired"} · ends {new Date(subscription.expires_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </Card>

        {/* Redeem */}
        <Card className="p-5 shadow-card">
          <h3 className="font-display font-semibold mb-1">Redeem license key</h3>
          <p className="text-sm text-muted-foreground mb-3">Activate a plan with a key from BizKit sales.</p>
          <div className="flex gap-2">
            <Input
              placeholder="BIZ-XXXX-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              className="font-mono"
            />
            <Button onClick={handleRedeem} disabled={redeeming}>
              {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem"}
            </Button>
          </div>
        </Card>

        {/* Plans */}
        <div>
          <h3 className="font-display font-semibold px-1 mb-2 mt-2">Available plans</h3>
          <div className="space-y-3">
            {plans.map((p) => {
              const features = p.features ?? {};
              const modules = features.modules ?? {};
              const isCurrent = subscription?.plan_id === p.id;
              return (
                <Card key={p.id} className={`p-5 shadow-card ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-display font-semibold text-lg">{p.name}</p>
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-lg">{p.price === 0 ? "Free" : fmt(p.price, p.currency)}</p>
                      <p className="text-xs text-muted-foreground">/{p.billing_period}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 mt-3 text-sm">
                    <Feature label={`${features.max_branches === -1 ? "Unlimited" : features.max_branches} branch${features.max_branches === 1 ? "" : "es"}`} />
                    <Feature label={`${features.max_staff === -1 ? "Unlimited" : features.max_staff} staff`} />
                    <Feature label={`${features.max_products === -1 ? "Unlimited" : features.max_products} products`} />
                    {modules.assets && <Feature label="Assets management" />}
                    {modules.payroll && <Feature label="Staff payroll" />}
                    {modules.ai_advisor && <Feature label="AI Business Advisor" />}
                    {modules.multi_branch && <Feature label="Multi-branch" />}
                    {modules.manufacturing && <Feature label="Manufacturing module" />}
                  </div>
                  {isCurrent && (
                    <div className="mt-3 text-xs text-primary font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Your active plan
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Check className="w-4 h-4 text-[hsl(var(--success))]" />
      <span>{label}</span>
    </div>
  );
}
