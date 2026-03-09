import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Package, Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface RawMaterial {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  category: string | null;
  stock_qty: number;
  cost_price: number;
  reorder_level: number | null;
}

export default function RawMaterialsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["owner", "manager"]);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RawMaterial | null>(null);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    unit: "piece",
    category: "",
    stock_qty: 0,
    cost_price: 0,
    reorder_level: 0,
  });

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["raw-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("raw_materials")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as RawMaterial[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase
          .from("raw_materials")
          .update({
            name: form.name,
            sku: form.sku || null,
            unit: form.unit,
            category: form.category || null,
            stock_qty: form.stock_qty,
            cost_price: form.cost_price,
            reorder_level: form.reorder_level,
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("raw_materials").insert({
          name: form.name,
          sku: form.sku || null,
          unit: form.unit,
          category: form.category || null,
          stock_qty: form.stock_qty,
          cost_price: form.cost_price,
          reorder_level: form.reorder_level,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Material updated" : "Material created" });
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("raw_materials")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Material deleted" });
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setForm({ name: "", sku: "", unit: "piece", category: "", stock_qty: 0, cost_price: 0, reorder_level: 0 });
    setEditing(null);
  };

  const openEdit = (m: RawMaterial) => {
    setEditing(m);
    setForm({
      name: m.name,
      sku: m.sku || "",
      unit: m.unit || "piece",
      category: m.category || "",
      stock_qty: m.stock_qty,
      cost_price: m.cost_price,
      reorder_level: m.reorder_level || 0,
    });
    setDialogOpen(true);
  };

  const filtered = materials.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-full">
      <div className="gradient-hero px-5 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/more")} className="text-primary-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-primary-foreground">Raw Materials</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 animate-fade-in">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search materials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Material" : "New Raw Material"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>SKU</Label>
                      <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Stock Qty</Label>
                      <Input type="number" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Cost Price</Label>
                      <Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: +e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Reorder Level</Label>
                    <Input type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: +e.target.value })} />
                  </div>
                  <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No raw materials found</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            {filtered.map((m, i) => (
              <div key={m.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.stock_qty} {m.unit} • ₦{m.cost_price.toLocaleString()}
                  </p>
                </div>
                {canManage && (
                  <>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(m)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => { if (confirm("Delete this material?")) deleteMutation.mutate(m.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
