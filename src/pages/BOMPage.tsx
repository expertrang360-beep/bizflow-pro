import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, FileStack, Search, Pencil, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface BOM {
  id: string;
  name: string;
  description: string | null;
  product_id: string;
  estimated_labor_cost: number;
  estimated_overhead_cost: number;
  product?: { name: string };
}

interface Product {
  id: string;
  name: string;
}

export default function BOMPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["owner", "manager"]);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BOM | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    product_id: "",
    estimated_labor_cost: 0,
    estimated_overhead_cost: 0,
  });

  const { data: boms = [], isLoading } = useQuery({
    queryKey: ["bill-of-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bill_of_materials")
        .select("*, product:products(name)")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as BOM[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-for-bom"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase
          .from("bill_of_materials")
          .update({
            name: form.name,
            description: form.description || null,
            product_id: form.product_id,
            estimated_labor_cost: form.estimated_labor_cost,
            estimated_overhead_cost: form.estimated_overhead_cost,
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bill_of_materials").insert({
          name: form.name,
          description: form.description || null,
          product_id: form.product_id,
          estimated_labor_cost: form.estimated_labor_cost,
          estimated_overhead_cost: form.estimated_overhead_cost,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "BOM updated" : "BOM created" });
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["bill-of-materials"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bill_of_materials")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "BOM deleted" });
      queryClient.invalidateQueries({ queryKey: ["bill-of-materials"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setForm({ name: "", description: "", product_id: "", estimated_labor_cost: 0, estimated_overhead_cost: 0 });
    setEditing(null);
  };

  const openEdit = (b: BOM) => {
    setEditing(b);
    setForm({
      name: b.name,
      description: b.description || "",
      product_id: b.product_id,
      estimated_labor_cost: b.estimated_labor_cost,
      estimated_overhead_cost: b.estimated_overhead_cost,
    });
    setDialogOpen(true);
  };

  const filtered = boms.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.product?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-full">
      <div className="gradient-hero px-5 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/more")} className="text-primary-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-primary-foreground">Bill of Materials</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 animate-fade-in">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search BOMs..."
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
                  <DialogTitle>{editing ? "Edit BOM" : "New Bill of Materials"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>BOM Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Finished Product *</Label>
                    <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Est. Labor Cost</Label>
                      <Input type="number" value={form.estimated_labor_cost} onChange={(e) => setForm({ ...form, estimated_labor_cost: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Est. Overhead</Label>
                      <Input type="number" value={form.estimated_overhead_cost} onChange={(e) => setForm({ ...form, estimated_overhead_cost: +e.target.value })} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.name || !form.product_id || saveMutation.isPending}>
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
            <FileStack className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No BOMs found</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            {filtered.map((b, i) => (
              <div key={b.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileStack className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0" onClick={() => navigate(`/bom/${b.id}`)} role="button">
                  <p className="text-sm font-semibold truncate">{b.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    → {b.product?.name}
                  </p>
                </div>
                {canManage && (
                  <>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(b)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => { if (confirm("Delete this BOM?")) deleteMutation.mutate(b.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
