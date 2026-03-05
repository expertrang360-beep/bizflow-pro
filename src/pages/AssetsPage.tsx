import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, formatDate } from "@/lib/bizkit";
import { ArrowLeft, Plus, Building2, Wrench, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Asset {
  id: string;
  name: string;
  category: string;
  purchase_date: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_months: number;
  depreciation_method: string;
  status: string;
  location: string | null;
  serial_number: string | null;
  created_at: string;
}

function calcDepreciation(asset: Asset) {
  const months = Math.max(0, Math.floor(
    (Date.now() - new Date(asset.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  ));
  const depreciable = asset.purchase_cost - asset.salvage_value;
  if (asset.depreciation_method === "straight_line") {
    const monthlyDep = depreciable / asset.useful_life_months;
    const totalDep = Math.min(depreciable, monthlyDep * months);
    return { totalDep, currentValue: asset.purchase_cost - totalDep };
  }
  // declining balance (200% / useful_life)
  const rate = 2 / asset.useful_life_months;
  let value = asset.purchase_cost;
  for (let i = 0; i < Math.min(months, asset.useful_life_months); i++) {
    value = Math.max(asset.salvage_value, value * (1 - rate));
  }
  return { totalDep: asset.purchase_cost - value, currentValue: value };
}

const statusStyles: Record<string, string> = {
  active: "badge-success",
  maintenance: "badge-warning",
  disposed: "badge-danger",
  retired: "badge-info",
};

export default function AssetsPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("assets").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setAssets((data as Asset[]) || []);
      setLoading(false);
    });
  }, []);

  const totalValue = assets.reduce((s, a) => s + calcDepreciation(a).currentValue, 0);
  const totalCost = assets.reduce((s, a) => s + a.purchase_cost, 0);

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">Assets</h1>
          <Button size="sm" onClick={() => navigate("/assets/new")} className="gap-1 h-9 px-3">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-muted rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="text-lg font-bold">{formatNaira(totalCost)}</p>
          </div>
          <div className="bg-[hsl(var(--success-light))] rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground">Current Value</p>
            <p className="text-lg font-bold text-[hsl(var(--success))]">{formatNaira(totalValue)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-3">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="font-semibold">No assets registered</p>
            <p className="text-sm text-muted-foreground mb-4">Track your business equipment, vehicles, and more</p>
            <Button onClick={() => navigate("/assets/new")} className="gap-2">
              <Plus className="w-4 h-4" /> Add Asset
            </Button>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {assets.map(a => {
              const { currentValue, totalDep } = calcDepreciation(a);
              return (
                <div key={a.id} className="bg-card rounded-xl border border-border shadow-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{a.name}</p>
                        <Badge variant="outline" className={`text-2xs ${statusStyles[a.status] || ""}`}>
                          {a.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{a.category} • {formatDate(a.purchase_date)}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Current Value</p>
                          <p className="font-bold text-sm">{formatNaira(currentValue)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Depreciation</p>
                          <p className="text-sm font-medium text-destructive">-{formatNaira(totalDep)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
