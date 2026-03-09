import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Package, Wrench, Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira } from "@/lib/bizkit";
import { format } from "date-fns";

type ProductionStatus = "draft" | "in_progress" | "completed" | "cancelled";

const statusConfig: Record<ProductionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const costTypeOptions = [
  { value: "labor", label: "Labor", icon: Wrench },
  { value: "overhead", label: "Overhead", icon: Building2 },
  { value: "other", label: "Other", icon: Package },
];

export default function ProductionCostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasAnyRole, user } = useAuth();
  const canManage = hasAnyRole(["owner", "manager"]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ cost_type: "labor", amount: "", description: "" });

  // Fetch production order with all related data
  const { data: order, isLoading } = useQuery({
    queryKey: ["production-cost-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select(`
          *,
          bom:bill_of_materials(name, estimated_labor_cost, estimated_overhead_cost),
          product:products(name),
          production_costs(id, amount, cost_type, description, created_at),
          production_material_usage(id, quantity_used, unit_cost, total_cost, raw_material:raw_materials(name, unit))
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Add cost mutation
  const addCostMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("production_costs").insert({
        production_order_id: id!,
        cost_type: form.cost_type,
        amount: parseFloat(form.amount),
        description: form.description || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Cost added" });
      setDialogOpen(false);
      setForm({ cost_type: "labor", amount: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["production-cost-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["production-costs-overview"] });
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Delete cost mutation
  const deleteCostMutation = useMutation({
    mutationFn: async (costId: string) => {
      const { error } = await supabase.from("production_costs").delete().eq("id", costId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Cost removed" });
      queryClient.invalidateQueries({ queryKey: ["production-cost-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["production-costs-overview"] });
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full">
        <div className="gradient-hero px-5 pt-12 pb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/production-costs")} className="text-primary-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-primary-foreground">Loading...</h1>
          </div>
        </div>
        <div className="flex-1 px-4 py-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col min-h-full">
        <div className="gradient-hero px-5 pt-12 pb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/production-costs")} className="text-primary-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-primary-foreground">Not Found</h1>
          </div>
        </div>
        <div className="flex-1 px-4 py-12 text-center">
          <p className="text-muted-foreground">Production order not found</p>
        </div>
      </div>
    );
  }

  const materialCost = order.production_material_usage?.reduce((s: number, m: { total_cost: number }) => s + m.total_cost, 0) || 0;
  const additionalCosts = order.production_costs?.reduce((s: number, c: { amount: number }) => s + c.amount, 0) || 0;
  const laborFromBom = (order.bom?.estimated_labor_cost || 0) * order.quantity;
  const overheadFromBom = (order.bom?.estimated_overhead_cost || 0) * order.quantity;
  const grandTotal = materialCost + additionalCosts + laborFromBom + overheadFromBom;
  const costPerUnit = order.quantity > 0 ? grandTotal / order.quantity : 0;

  const laborCosts = order.production_costs?.filter((c: { cost_type: string }) => c.cost_type === "labor") || [];
  const overheadCosts = order.production_costs?.filter((c: { cost_type: string }) => c.cost_type === "overhead") || [];
  const otherCosts = order.production_costs?.filter((c: { cost_type: string }) => c.cost_type !== "labor" && c.cost_type !== "overhead") || [];

  return (
    <div className="flex flex-col min-h-full">
      <div className="gradient-hero px-5 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/production-costs")} className="text-primary-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-primary-foreground truncate">{order.bom?.name}</h1>
            <p className="text-xs text-primary-foreground/70">→ {order.product?.name}</p>
          </div>
          <Badge variant={statusConfig[order.status as ProductionStatus].variant}>
            {statusConfig[order.status as ProductionStatus].label}
          </Badge>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 animate-fade-in">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Quantity</p>
            <p className="text-lg font-bold">{order.quantity}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="text-lg font-bold text-primary">{formatNaira(grandTotal)}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Per Unit</p>
            <p className="text-lg font-bold">{formatNaira(costPerUnit)}</p>
          </div>
        </div>

        {/* Material Usage Section */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Raw Materials</h2>
            <span className="ml-auto text-sm font-semibold text-primary">{formatNaira(materialCost)}</span>
          </div>
          {order.production_material_usage && order.production_material_usage.length > 0 ? (
            <div className="space-y-2">
              {order.production_material_usage.map((m: { id: string; quantity_used: number; unit_cost: number; total_cost: number; raw_material: { name: string; unit: string | null } }) => (
                <div key={m.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">{m.raw_material?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.quantity_used} {m.raw_material?.unit || "pcs"} × {formatNaira(m.unit_cost)}
                    </p>
                  </div>
                  <span className="font-medium">{formatNaira(m.total_cost)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {order.status === "completed" ? "No materials were used" : "Materials will be recorded on completion"}
            </p>
          )}
        </div>

        {/* BOM Estimated Costs */}
        {(laborFromBom > 0 || overheadFromBom > 0) && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="text-sm font-semibold mb-3">BOM Estimates (× {order.quantity} units)</h2>
            {laborFromBom > 0 && (
              <div className="flex justify-between text-sm py-1.5 border-b border-border">
                <span className="text-muted-foreground">Estimated Labor</span>
                <span className="font-medium">{formatNaira(laborFromBom)}</span>
              </div>
            )}
            {overheadFromBom > 0 && (
              <div className="flex justify-between text-sm py-1.5">
                <span className="text-muted-foreground">Estimated Overhead</span>
                <span className="font-medium">{formatNaira(overheadFromBom)}</span>
              </div>
            )}
          </div>
        )}

        {/* Additional Costs Section */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Additional Costs</h2>
            {canManage && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Production Cost</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label>Cost Type *</Label>
                      <Select value={form.cost_type} onValueChange={(v) => setForm({ ...form, cost_type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {costTypeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Amount *</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        placeholder="e.g. Machine operator wages"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => addCostMutation.mutate()}
                      disabled={!form.amount || parseFloat(form.amount) <= 0 || addCostMutation.isPending}
                    >
                      {addCostMutation.isPending ? "Adding..." : "Add Cost"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {[
            { label: "Labor", items: laborCosts, icon: Wrench },
            { label: "Overhead", items: overheadCosts, icon: Building2 },
            { label: "Other", items: otherCosts, icon: Package },
          ].map(({ label, items, icon: Icon }) =>
            items.length > 0 ? (
              <div key={label} className="mb-3 last:mb-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
                </div>
                {items.map((c: { id: string; amount: number; description: string | null; created_at: string }) => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.description || label}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(c.created_at), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatNaira(c.amount)}</span>
                      {canManage && (
                        <button
                          onClick={() => deleteCostMutation.mutate(c.id)}
                          className="text-destructive hover:text-destructive/80 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null
          )}

          {additionalCosts === 0 && (
            <p className="text-xs text-muted-foreground">No additional costs recorded yet</p>
          )}

          {additionalCosts > 0 && (
            <div className="flex justify-between text-sm font-semibold pt-2 mt-2 border-t border-border">
              <span>Subtotal</span>
              <span>{formatNaira(additionalCosts)}</span>
            </div>
          )}
        </div>

        {/* Grand Total */}
        <div className="bg-primary/5 rounded-2xl border border-primary/20 p-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Materials</span>
            <span>{formatNaira(materialCost)}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">BOM Labor</span>
            <span>{formatNaira(laborFromBom)}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">BOM Overhead</span>
            <span>{formatNaira(overheadFromBom)}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Additional Costs</span>
            <span>{formatNaira(additionalCosts)}</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-2 border-t border-primary/20">
            <span>Grand Total</span>
            <span className="text-primary">{formatNaira(grandTotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Cost per unit</span>
            <span>{formatNaira(costPerUnit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}