import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, formatDate } from "@/lib/bizkit";
import { ArrowLeft, Plus, Receipt, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_BRANCH_ID, todayStr } from "@/lib/bizkit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TaxRecord {
  id: string;
  tax_type: string;
  period_start: string;
  period_end: string;
  taxable_amount: number;
  tax_amount: number;
  status: string;
  filed_date: string | null;
  paid_date: string | null;
  reference_number: string | null;
  note: string | null;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  open: "badge-warning",
  filed: "badge-info",
  paid: "badge-success",
};

export default function TaxPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("vat");

  const [form, setForm] = useState({
    tax_type: "vat" as "vat" | "cit",
    period_start: "", period_end: "",
    taxable_amount: "", tax_amount: "",
    status: "open" as "open" | "filed" | "paid",
    reference_number: "", note: "",
  });

  const fetchRecords = async () => {
    const { data } = await supabase.from("tax_records").select("*").order("period_end", { ascending: false });
    setRecords((data as TaxRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleSave = async () => {
    if (!form.period_start || !form.period_end || !form.taxable_amount) {
      toast({ variant: "destructive", title: "Missing fields" });
      return;
    }
    setSaving(true);
    try {
      const taxAmt = form.tax_amount ? Number(form.tax_amount) :
        form.tax_type === "vat" ? Number(form.taxable_amount) * 0.075 : Number(form.taxable_amount) * 0.3;

      const { error } = await supabase.from("tax_records").insert({
        branch_id: DEFAULT_BRANCH_ID,
        tax_type: form.tax_type,
        period_start: form.period_start,
        period_end: form.period_end,
        taxable_amount: Number(form.taxable_amount),
        tax_amount: taxAmt,
        status: form.status,
        reference_number: form.reference_number || null,
        note: form.note || null,
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: "Tax record added! ✅" });
      setDialogOpen(false);
      setForm({ tax_type: "vat", period_start: "", period_end: "", taxable_amount: "", tax_amount: "", status: "open", reference_number: "", note: "" });
      fetchRecords();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSaving(false);
    }
  };

  const filtered = records.filter(r => r.tax_type === activeTab);
  const totalOwed = filtered.filter(r => r.status !== "paid").reduce((s, r) => s + r.tax_amount, 0);
  const totalPaid = filtered.filter(r => r.status === "paid").reduce((s, r) => s + r.tax_amount, 0);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">Tax Management</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 h-9 px-3"><Plus className="w-4 h-4" /> Add</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Tax Record</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Tax Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {([["vat", "VAT (7.5%)"], ["cit", "CIT (30%)"]] as const).map(([k, l]) => (
                      <button key={k} onClick={() => set("tax_type", k)}
                        className={`p-3 rounded-xl border-2 text-sm font-medium ${form.tax_type === k ? "border-primary bg-primary/5" : "border-border"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-sm mb-1.5 block">Period Start *</Label>
                    <Input type="date" value={form.period_start} onChange={e => set("period_start", e.target.value)} className="h-10" /></div>
                  <div><Label className="text-sm mb-1.5 block">Period End *</Label>
                    <Input type="date" value={form.period_end} onChange={e => set("period_end", e.target.value)} className="h-10" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-sm mb-1.5 block">Taxable Amount (₦) *</Label>
                    <Input type="number" value={form.taxable_amount} onChange={e => set("taxable_amount", e.target.value)} className="h-10" /></div>
                  <div><Label className="text-sm mb-1.5 block">Tax Amount (₦)</Label>
                    <Input type="number" value={form.tax_amount} onChange={e => set("tax_amount", e.target.value)}
                      placeholder={form.tax_type === "vat" ? "Auto: 7.5%" : "Auto: 30%"} className="h-10" /></div>
                </div>
                <div>
                  <Label className="text-sm mb-2 block">Status</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["open", "filed", "paid"] as const).map(s => (
                      <button key={s} onClick={() => set("status", s)}
                        className={`p-2 rounded-xl border-2 text-sm font-medium capitalize ${form.status === s ? "border-primary bg-primary/5" : "border-border"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div><Label className="text-sm mb-1.5 block">Reference No.</Label>
                  <Input value={form.reference_number} onChange={e => set("reference_number", e.target.value)} placeholder="Optional" className="h-10" /></div>
                <div><Label className="text-sm mb-1.5 block">Note</Label>
                  <Input value={form.note} onChange={e => set("note", e.target.value)} placeholder="Optional" className="h-10" /></div>
                <Button onClick={handleSave} disabled={saving} className="w-full h-12 font-bold rounded-2xl">
                  {saving ? "Saving..." : "Add Tax Record"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="px-4 pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="vat" className="flex-1">VAT (7.5%)</TabsTrigger>
            <TabsTrigger value="cit" className="flex-1">CIT (30%)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4 pt-3 grid grid-cols-2 gap-2">
        <div className="bg-[hsl(var(--warning-light))] rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-lg font-bold text-[hsl(var(--warning))]">{formatNaira(totalOwed)}</p>
        </div>
        <div className="bg-[hsl(var(--success-light))] rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-lg font-bold text-[hsl(var(--success))]">{formatNaira(totalPaid)}</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-3">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="font-semibold">No {activeTab.toUpperCase()} records</p>
            <p className="text-sm text-muted-foreground mb-4">Add tax period records to track obligations</p>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {filtered.map(r => (
              <div key={r.id} className="bg-card rounded-xl border border-border shadow-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm">{formatDate(r.period_start)} — {formatDate(r.period_end)}</p>
                  <Badge variant="outline" className={`text-2xs ${statusStyles[r.status] || ""}`}>{r.status}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Taxable: {formatNaira(r.taxable_amount)}</p>
                  </div>
                  <p className="font-bold text-sm">{formatNaira(r.tax_amount)}</p>
                </div>
                {r.reference_number && <p className="text-xs text-muted-foreground mt-1">Ref: {r.reference_number}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
