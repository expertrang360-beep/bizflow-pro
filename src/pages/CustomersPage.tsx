import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, formatDate, DEFAULT_BRANCH_ID } from "@/lib/bizkit";
import { ArrowLeft, Plus, ChevronRight, Users, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  total_credit: number;
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data } = await supabase.from("customers").select("*").order("name");
    setCustomers((data as Customer[]) || []);
    setLoading(false);
  };

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  const totalDebt = customers.reduce((s, c) => s + Number(c.total_credit), 0);

  const handleAdd = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await supabase.from("customers").insert({
        branch_id: DEFAULT_BRANCH_ID,
        name: form.name,
        phone: form.phone || null,
        address: form.address || null,
      });
      toast({ title: "Customer added!" });
      setForm({ name: "", phone: "", address: "" });
      setShowAdd(false);
      fetchCustomers();
    } catch {
      toast({ variant: "destructive", title: "Error adding customer" });
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
          <h1 className="text-xl font-bold flex-1">Customers & Debts</h1>
          <Button size="sm" onClick={() => setShowAdd(true)} className="bg-primary text-primary-foreground gap-1 h-9 px-3">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
        <div className="bg-destructive/10 rounded-xl px-4 py-3 mb-3">
          <p className="text-xs text-muted-foreground">Total Outstanding Debts</p>
          <p className="text-2xl font-bold text-destructive">{formatNaira(totalDebt)}</p>
        </div>
        <div className="relative">
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 bg-muted/50 border-0"
          />
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-foreground/20" onClick={() => setShowAdd(false)}>
          <div className="bg-card rounded-t-3xl p-5 space-y-4 shadow-lg max-h-[85vh] overflow-y-auto pb-safe" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg">Add Customer</h2>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Customer name" className="h-10" />
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
                {saving ? "Adding..." : "Add Customer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 px-4 py-3">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="font-semibold">No customers yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add customers to track credit sales</p>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/customers/${c.id}`)}
                className="w-full bg-card rounded-xl border border-border shadow-card p-4 text-left active:scale-[0.98] transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold flex-shrink-0">
                  {c.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone || "No phone"}</p>
                </div>
                {Number(c.total_credit) > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Owes</p>
                    <p className="text-sm font-bold text-destructive">{formatNaira(c.total_credit)}</p>
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
