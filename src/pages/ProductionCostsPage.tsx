import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calculator, Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type ProductionStatus = "draft" | "in_progress" | "completed" | "cancelled";

interface ProductionOrder {
  id: string;
  quantity: number;
  status: ProductionStatus;
  created_at: string;
  bom?: { name: string; estimated_labor_cost: number; estimated_overhead_cost: number };
  product?: { name: string };
  production_costs?: { amount: number; cost_type: string }[];
  production_material_usage?: { total_cost: number }[];
}

const statusConfig: Record<ProductionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function ProductionCostsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["production-costs-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select(`
          *,
          bom:bill_of_materials(name, estimated_labor_cost, estimated_overhead_cost),
          product:products(name),
          production_costs(amount, cost_type),
          production_material_usage(total_cost)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductionOrder[];
    },
  });

  const calculateTotalCost = (order: ProductionOrder) => {
    const materialCost = order.production_material_usage?.reduce((sum, m) => sum + m.total_cost, 0) || 0;
    const otherCosts = order.production_costs?.reduce((sum, c) => sum + c.amount, 0) || 0;
    return materialCost + otherCosts;
  };

  const filtered = orders.filter((o) =>
    o.bom?.name.toLowerCase().includes(search.toLowerCase()) ||
    o.product?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-full">
      <div className="gradient-hero px-5 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/more")} className="text-primary-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-primary-foreground">Production Costs</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 animate-fade-in">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search production orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No production orders to track costs</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const totalCost = calculateTotalCost(o);
              const costPerUnit = o.quantity > 0 ? totalCost / o.quantity : 0;

              return (
                <div
                  key={o.id}
                  className="bg-card rounded-2xl border border-border shadow-card p-4"
                  onClick={() => navigate(`/production-costs/${o.id}`)}
                  role="button"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{o.bom?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">→ {o.product?.name}</p>
                    </div>
                    <Badge variant={statusConfig[o.status].variant} className="ml-2">
                      {statusConfig[o.status].label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Qty</p>
                      <p className="text-sm font-semibold">{o.quantity}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Total Cost</p>
                      <p className="text-sm font-semibold">₦{totalCost.toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Per Unit</p>
                      <p className="text-sm font-semibold">₦{costPerUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>{format(new Date(o.created_at), "MMM d, yyyy")}</span>
                    <ChevronRight className="w-4 h-4" />
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
