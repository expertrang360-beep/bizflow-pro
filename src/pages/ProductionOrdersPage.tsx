import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Factory, Search, Play, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { formatNaira } from "@/lib/bizkit";

type ProductionStatus = "draft" | "in_progress" | "completed" | "cancelled";

interface ProductionOrder {
  id: string;
  quantity: number;
  status: ProductionStatus;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  notes: string | null;
  created_at: string;
  bom?: { name: string; estimated_labor_cost: number; estimated_overhead_cost: number };
  product?: { name: string };
  production_costs?: { amount: number; cost_type: string }[];
  production_material_usage?: { total_cost: number }[];
}

interface BOM {
  id: string;
  name: string;
  product_id: string;
  product?: { name: string };
}

const statusConfig: Record<ProductionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function ProductionOrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasAnyRole, user } = useAuth();
  const canManage = hasAnyRole(["owner", "manager"]);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    bom_id: "",
    quantity: 1,
    planned_start_date: "",
    planned_end_date: "",
    notes: "",
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["production-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select("*, bom:bill_of_materials(name), product:products(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductionOrder[];
    },
  });

  const { data: boms = [] } = useQuery({
    queryKey: ["boms-for-production"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bill_of_materials")
        .select("id, name, product_id, product:products(name)")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as BOM[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const selectedBom = boms.find((b) => b.id === form.bom_id);
      if (!selectedBom) throw new Error("BOM not found");

      const { error } = await supabase.from("production_orders").insert({
        bom_id: form.bom_id,
        product_id: selectedBom.product_id,
        quantity: form.quantity,
        planned_start_date: form.planned_start_date || null,
        planned_end_date: form.planned_end_date || null,
        notes: form.notes || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Production order created" });
      setDialogOpen(false);
      setForm({ bom_id: "", quantity: 1, planned_start_date: "", planned_end_date: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProductionStatus }) => {
      if (status === "completed") {
        // Use atomic RPC to deduct raw materials and add finished products
        const { data, error } = await supabase.rpc("complete_production_order", { p_order_id: id });
        if (error) throw error;
        return data;
      }
      
      const updates: Record<string, unknown> = { status };
      if (status === "in_progress") updates.actual_start_date = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("production_orders").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (data, variables) => {
      if (variables.status === "completed" && data) {
        const result = data as { product_added?: { name: string; qty: number } };
        toast({ 
          title: "Production completed",
          description: `Added ${result.product_added?.qty} ${result.product_added?.name} to inventory`
        });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["raw-materials"] });
      } else {
        toast({ title: "Status updated" });
      }
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
          <h1 className="text-lg font-bold text-primary-foreground">Production Orders</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 animate-fade-in">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Production Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Bill of Materials *</Label>
                    <Select value={form.bom_id} onValueChange={(v) => setForm({ ...form, bom_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select BOM" />
                      </SelectTrigger>
                      <SelectContent>
                        {boms.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} → {b.product?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantity to Produce *</Label>
                    <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Planned Start</Label>
                      <Input type="date" value={form.planned_start_date} onChange={(e) => setForm({ ...form, planned_start_date: e.target.value })} />
                    </div>
                    <div>
                      <Label>Planned End</Label>
                      <Input type="date" value={form.planned_end_date} onChange={(e) => setForm({ ...form, planned_end_date: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.bom_id || form.quantity < 1 || createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Order"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Factory className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No production orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <div key={o.id} className="bg-card rounded-2xl border border-border shadow-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{o.bom?.name}</p>
                    <p className="text-xs text-muted-foreground">→ {o.product?.name}</p>
                  </div>
                  <Badge variant={statusConfig[o.status].variant}>{statusConfig[o.status].label}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Qty: {o.quantity}</span>
                  <span>{format(new Date(o.created_at), "MMM d, yyyy")}</span>
                </div>
                {canManage && o.status !== "completed" && o.status !== "cancelled" && (
                  <div className="flex gap-2 mt-3">
                    {o.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1"
                        onClick={() => updateStatusMutation.mutate({ id: o.id, status: "in_progress" })}
                      >
                        <Play className="w-3 h-3" /> Start
                      </Button>
                    )}
                    {o.status === "in_progress" && (
                      <Button
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => updateStatusMutation.mutate({ id: o.id, status: "completed" })}
                      >
                        <CheckCircle2 className="w-3 h-3" /> Complete
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => updateStatusMutation.mutate({ id: o.id, status: "cancelled" })}
                    >
                      <XCircle className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
