import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, ClipboardList, Search, Trash2, Package, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { formatNumber } from "@/lib/bizkit";

interface MaterialEntry {
  raw_material_id: string;
  quantity_used: number;
}

interface DailyLog {
  id: string;
  log_date: string;
  quantity_produced: number;
  quantity_packaged: number;
  quantity_unpackaged: number;
  notes: string | null;
  created_at: string;
  product?: { name: string };
  daily_material_usage?: { id: string; quantity_used: number; raw_material: { name: string; unit: string | null } }[];
}

export default function DailyProductionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasAnyRole } = useAuth();
  const canDelete = hasAnyRole(["owner", "manager"]);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    log_date: todayStr,
    product_id: "",
    quantity_produced: "",
    quantity_packaged: "",
    quantity_unpackaged: "",
    notes: "",
    materials: [] as MaterialEntry[],
  });

  // Fetch logs
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["daily-production-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_production_logs")
        .select("*, product:products(name), daily_material_usage(id, quantity_used, raw_material:raw_materials(name, unit))")
        .order("log_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DailyLog[];
    },
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["products-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name").eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch raw materials
  const { data: rawMaterials = [] } = useQuery({
    queryKey: ["raw-materials-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("raw_materials").select("id, name, unit").eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  // Create log
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: log, error: logError } = await supabase
        .from("daily_production_logs")
        .insert({
          log_date: form.log_date,
          product_id: form.product_id,
          quantity_produced: parseFloat(form.quantity_produced) || 0,
          quantity_packaged: parseFloat(form.quantity_packaged) || 0,
          quantity_unpackaged: parseFloat(form.quantity_unpackaged) || 0,
          notes: form.notes || null,
          created_by: user?.id,
        })
        .select("id")
        .single();
      if (logError) throw logError;

      // Insert material usage entries
      const materialsToInsert = form.materials.filter((m) => m.raw_material_id && m.quantity_used > 0);
      if (materialsToInsert.length > 0) {
        const { error: matError } = await supabase.from("daily_material_usage").insert(
          materialsToInsert.map((m) => ({
            daily_log_id: log.id,
            raw_material_id: m.raw_material_id,
            quantity_used: m.quantity_used,
          }))
        );
        if (matError) throw matError;
      }
    },
    onSuccess: () => {
      toast({ title: "Daily record saved" });
      setDialogOpen(false);
      setForm({ log_date: todayStr, product_id: "", quantity_produced: "", quantity_packaged: "", quantity_unpackaged: "", notes: "", materials: [] });
      queryClient.invalidateQueries({ queryKey: ["daily-production-logs"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Delete log
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_production_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Record deleted" });
      queryClient.invalidateQueries({ queryKey: ["daily-production-logs"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addMaterialRow = () => {
    setForm({ ...form, materials: [...form.materials, { raw_material_id: "", quantity_used: 0 }] });
  };

  const updateMaterial = (index: number, field: keyof MaterialEntry, value: string | number) => {
    const updated = [...form.materials];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, materials: updated });
  };

  const removeMaterial = (index: number) => {
    setForm({ ...form, materials: form.materials.filter((_, i) => i !== index) });
  };

  const filtered = logs.filter(
    (l) =>
      l.product?.name.toLowerCase().includes(search.toLowerCase()) ||
      l.log_date.includes(search)
  );

  // Group by date
  const grouped = filtered.reduce<Record<string, DailyLog[]>>((acc, log) => {
    const date = log.log_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-full">
      <div className="gradient-hero px-5 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/more")} className="text-primary-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-primary-foreground">Daily Production Log</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 animate-fade-in">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by product or date..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon"><Plus className="w-4 h-4" /></Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Daily Record</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={form.log_date} onChange={(e) => setForm({ ...form, log_date: e.target.value })} />
                </div>
                <div>
                  <Label>Product *</Label>
                  <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Produced</Label>
                    <Input type="number" min={0} placeholder="0" value={form.quantity_produced} onChange={(e) => setForm({ ...form, quantity_produced: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Packaged</Label>
                    <Input type="number" min={0} placeholder="0" value={form.quantity_packaged} onChange={(e) => setForm({ ...form, quantity_packaged: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Unpackaged</Label>
                    <Input type="number" min={0} placeholder="0" value={form.quantity_unpackaged} onChange={(e) => setForm({ ...form, quantity_unpackaged: e.target.value })} />
                  </div>
                </div>

                {/* Materials used */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">Materials Used</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addMaterialRow} className="gap-1">
                      <Plus className="w-3 h-3" /> Add
                    </Button>
                  </div>
                  {form.materials.length === 0 && (
                    <p className="text-xs text-muted-foreground">No materials added yet</p>
                  )}
                  {form.materials.map((m, i) => (
                    <div key={i} className="flex gap-2 items-end mb-2">
                      <div className="flex-1">
                        {i === 0 && <Label className="text-xs">Material</Label>}
                        <Select value={m.raw_material_id} onValueChange={(v) => updateMaterial(i, "raw_material_id", v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {rawMaterials.map((rm) => (
                              <SelectItem key={rm.id} value={rm.id}>{rm.name} ({rm.unit || "pcs"})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-20">
                        {i === 0 && <Label className="text-xs">Qty</Label>}
                        <Input type="number" min={0} className="h-9" value={m.quantity_used || ""} onChange={(e) => updateMaterial(i, "quantity_used", parseFloat(e.target.value) || 0)} />
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => removeMaterial(i)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div>
                  <Label>Notes</Label>
                  <Input placeholder="Optional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>

                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate()}
                  disabled={!form.product_id || createMutation.isPending}
                >
                  {createMutation.isPending ? "Saving..." : "Save Record"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No daily records yet</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([date, dateLogs]) => (
              <div key={date}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                  {format(new Date(date + "T00:00:00"), "EEEE, MMM d, yyyy")}
                </h3>
                <div className="space-y-2">
                  {dateLogs.map((log) => {
                    const isExpanded = expandedId === log.id;
                    return (
                      <div key={log.id} className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
                        <button
                          className="w-full p-4 text-left"
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{log.product?.name}</p>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div className="bg-muted/50 rounded-lg p-2 text-center">
                              <p className="text-[10px] text-muted-foreground">Produced</p>
                              <p className="text-sm font-bold">{formatNumber(log.quantity_produced)}</p>
                            </div>
                            <div className="bg-[hsl(var(--success-light))] rounded-lg p-2 text-center">
                              <p className="text-[10px] text-muted-foreground">Packaged</p>
                              <p className="text-sm font-bold text-[hsl(var(--success))]">{formatNumber(log.quantity_packaged)}</p>
                            </div>
                            <div className="bg-warning/10 rounded-lg p-2 text-center">
                              <p className="text-[10px] text-muted-foreground">Unpackaged</p>
                              <p className="text-sm font-bold text-warning">{formatNumber(log.quantity_unpackaged)}</p>
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                            {/* Materials used */}
                            {log.daily_material_usage && log.daily_material_usage.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Materials Used</span>
                                </div>
                                {log.daily_material_usage.map((m) => (
                                  <div key={m.id} className="flex justify-between text-sm py-1">
                                    <span>{m.raw_material?.name}</span>
                                    <span className="font-medium">{formatNumber(m.quantity_used)} {m.raw_material?.unit || "pcs"}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {log.notes && (
                              <p className="text-xs text-muted-foreground italic">{log.notes}</p>
                            )}

                            {canDelete && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="w-full gap-1"
                                onClick={() => deleteMutation.mutate(log.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-3 h-3" /> Delete Record
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}