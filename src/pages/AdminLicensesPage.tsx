import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Plus, Shield, Trash2 } from "lucide-react";
import BackButton from "@/components/BackButton";

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
};

type LicenseKey = {
  id: string;
  key: string;
  plan_id: string;
  status: string;
  assigned_org_id: string | null;
  activated_at: string | null;
  notes: string | null;
  created_at: string;
};

export default function AdminLicensesPage() {
  const [generating, setGenerating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);

  const { data: plans = [] } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, price, currency")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Plan[];
    },
  });

  const { data: licenses = [], refetch: refetchLicenses } = useQuery({
    queryKey: ["admin-licenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("license_keys")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as LicenseKey[];
    },
  });

  const generateLicenses = async (
    planId: string,
    quantity: number = 1
  ) => {
    if (quantity < 1 || quantity > 100) {
      toast.error("Generate between 1 and 100 keys at a time");
      return;
    }

    setGenerating(true);
    try {
      const keys: string[] = [];
      for (let i = 0; i < quantity; i++) {
        const { data, error } = await supabase.rpc(
          "generate_license_key"
        );
        if (error) throw error;
        if (data) {
          keys.push(data);
          // Insert the key
          await supabase.from("license_keys").insert({
            key: data,
            plan_id: planId,
            status: "unused",
          });
        }
      }
      setGeneratedKeys(keys);
      toast.success(`Generated ${quantity} license key(s)`);
      await refetchLicenses();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate keys");
    } finally {
      setGenerating(false);
    }
  };

  const revokeLicense = async (id: string) => {
    try {
      await supabase
        .from("license_keys")
        .update({ status: "revoked" })
        .eq("id", id);
      toast.success("License revoked");
      await refetchLicenses();
    } catch (e: any) {
      toast.error(e.message || "Failed to revoke");
    }
  };

  const copyKeys = () => {
    const text = generatedKeys.join("\n");
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${generatedKeys.length} keys to clipboard`);
  };

  return (
    <div className="flex flex-col min-h-full pb-8">
      <div className="gradient-hero px-5 pt-12 pb-10">
        <BackButton fallback="/" className="text-primary-foreground/80 mb-3" variant="ghost" />
        <h1 className="text-primary-foreground font-display text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" /> License Manager
        </h1>
        <p className="text-primary-foreground/70 text-sm">Admin: Generate and manage license keys</p>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {/* Generate Section */}
        <Card className="p-5 shadow-card">
          <h3 className="font-display font-semibold mb-4">Generate License Keys</h3>
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <div>
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">{plan.price} {plan.currency}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => generateLicenses(plan.id, 1)}
                  disabled={generating}
                >
                  <Plus className="w-4 h-4" /> Generate
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Generated Keys */}
        {generatedKeys.length > 0 && (
          <Card className="p-5 shadow-card border-success/50 bg-success/5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-semibold">Generated Keys ({generatedKeys.length})</p>
              <Button size="sm" onClick={copyKeys} variant="outline">
                <Copy className="w-4 h-4" /> Copy All
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {generatedKeys.map((key, i) => (
                <div
                  key={i}
                  className="p-3 bg-background rounded-lg font-mono text-sm flex items-center justify-between"
                >
                  <span>{key}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(key);
                      toast.success("Copied!");
                    }}
                    className="text-primary hover:text-primary/80"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* License List */}
        <div>
          <h3 className="font-display font-semibold px-1 mb-2 mt-4">All License Keys</h3>
          <div className="space-y-2">
            {licenses.map((license) => (
              <Card key={license.id} className="p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-mono text-sm font-semibold">{license.key}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status: <span className="capitalize font-medium">{license.status}</span>
                      {license.activated_at && ` • Activated: ${new Date(license.activated_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  {license.status !== "revoked" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => revokeLicense(license.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
