import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, formatDate, DEFAULT_BRANCH_ID } from "@/lib/bizkit";
import { ArrowLeft, Plus, ChevronRight, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  total_payable: number;
}

export default function SuppliersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers((data as Supplier[]) || []);
    setLoading(false);
  };

  const filtered = suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search)
  );

  const totalPayable = suppliers.reduce((s, sup) => s + Number(sup.total_payable), 0);

  const handleAdd = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await supabase.from("suppliers").insert({
        branch_id: DEFAULT_BRANCH_ID,
        name: form.name,
        phone: form.phone || null,
        address: form.address || null,
      });
      toast({ title: "Supplier added!" });
      setForm({ name: "", phone: "", address: "" });
      setShowAdd(false);
      fetchSuppliers();
    } catch {
      toast({ variant: "destructive", title: "Error adding supplier" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">Suppliers</h1>
          <Button size="sm" onClick={() => setShowAdd(true)} className="bg-primary text-primary-foreground gap-1 h-9 px-3">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
        <div className="bg-warning/10 rounded-xl px-4 py-3 mb-3">
          <p className="text-xs text-muted-foreground">Total Payables</p>
          <p className="text-2xl font-bold text-warning">{formatNaira(totalPayable)}</p>
        </div>
        <Input
          placeholder="Search suppliers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-10 bg-muted/50 border-0"
        />
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-foreground/20">
          <div className="bg-card rounded-t-3xl p-5 space-y-4 shadow-lg">
            <h2 className="font-bold text-lg">Add Supplier</h2>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Supplier name" className="h-10" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08012345678" className="h-10" type="tel" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City" className="h-10" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAdd} disabled={saving} className="flex-1 bg-primary text-primary-foreground">
                {saving ? "Adding..." : "Add Supplier"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 px-4 py-3">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Truck className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="font-semibold">No suppliers yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add suppliers to track purchases</p>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {filtered.map(s => (
              <button
                key={s.id}
                onClick={() => navigate(`/suppliers/${s.id}`)}
                className="w-full bg-card rounded-xl border border-border shadow-card p-4 text-left active:scale-[0.98] transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center text-warning font-bold flex-shrink-0">
                  {s.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.phone || "No phone"}</p>
                </div>
                {Number(s.total_payable) > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Owe them</p>
                    <p className="text-sm font-bold text-warning">{formatNaira(s.total_payable)}</p>
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
