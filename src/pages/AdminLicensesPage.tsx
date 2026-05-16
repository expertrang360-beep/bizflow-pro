import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Copy, Loader2, ShieldCheck, Ban, FileText, CheckCircle2, XCircle, Building2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Plan = { id: string; name: string; price: number; billing_period: string };
type LicenseKey = {
  id: string; key: string; plan_id: string; status: string;
  assigned_org_id: string | null; activated_at: string | null;
  expires_at: string | null; notes: string | null; created_at: string;
};
type Payment = {
  id: string; organization_id: string; plan_id: string; provider: string;
  reference: string; amount: number; currency: string; status: string;
  proof_url: string | null; payer_note: string | null; admin_note: string | null;
  created_at: string;
};
type Bank = {
  id: string; bank_name: string; account_name: string; account_number: string;
  instructions: string | null; active: boolean; sort_order: number;
};

export default function AdminLicensesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { roles } = useAuth();
  const isSuperAdmin = roles.includes("super_admin" as any);

  const [open, setOpen] = useState(false);
  const [batchSize, setBatchSize] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("id,name,price,billing_period").order("sort_order");
      if (error) throw error;
      return data as Plan[];
    },
    enabled: isSuperAdmin,
  });

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["license-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("license_keys").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as LicenseKey[];
    },
    enabled: isSuperAdmin,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_transactions").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as Payment[];
    },
    enabled: isSuperAdmin,
    refetchInterval: 30000,
  });

  const { data: banks = [] } = useQuery({
    queryKey: ["admin-banks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_bank_accounts").select("*").order("sort_order");
      if (error) throw error;
      return data as Bank[];
    },
    enabled: isSuperAdmin,
  });

  if (!isSuperAdmin) {
    return (
      <div className="px-4 py-12 text-center">
        <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h2 className="font-display text-lg font-semibold">Super-admin only</h2>
        <p className="text-sm text-muted-foreground mt-1">You don't have access to this page.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>Go home</Button>
      </div>
    );
  }

  const generate = async () => {
    if (!selectedPlan) return toast.error("Pick a plan");
    setGenerating(true);
    try {
      const generated: { key: string }[] = [];
      for (let i = 0; i < batchSize; i++) {
        const { data: keyData, error: keyErr } = await supabase.rpc("generate_license_key");
        if (keyErr) throw keyErr;
        generated.push({ key: keyData as string });
      }
      const { error: insErr } = await supabase.from("license_keys").insert(
        generated.map((g) => ({ key: g.key, plan_id: selectedPlan, notes: notes || null, status: "unused" }))
      );
      if (insErr) throw insErr;
      toast.success(`Generated ${batchSize} key${batchSize === 1 ? "" : "s"}`);
      setOpen(false); setNotes(""); setBatchSize(1);
      qc.invalidateQueries({ queryKey: ["license-keys"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to generate");
    } finally { setGenerating(false); }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this license key?")) return;
    const { error } = await supabase.from("license_keys").update({ status: "revoked" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Key revoked");
    qc.invalidateQueries({ queryKey: ["license-keys"] });
  };

  const copy = (key: string) => { navigator.clipboard.writeText(key); toast.success("Copied"); };
  const planMap = Object.fromEntries(plans.map((p) => [p.id, p.name]));
  const filterByStatus = (s: string) => keys.filter((k) => k.status === s);

  const approvePayment = async (id: string) => {
    const note = prompt("Optional note (e.g. 'Confirmed in GTB statement')") ?? undefined;
    const { error } = await supabase.rpc("approve_manual_payment", { p_payment_id: id, p_admin_note: note ?? null });
    if (error) return toast.error(error.message);
    toast.success("Approved & subscription activated");
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
  };
  const rejectPayment = async (id: string) => {
    const note = prompt("Reason for rejecting") ?? "";
    if (!note) return;
    const { error } = await supabase.rpc("reject_manual_payment", { p_payment_id: id, p_admin_note: note });
    if (error) return toast.error(error.message);
    toast.success("Rejected");
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
  };
  const viewProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return toast.error("Could not load proof");
    window.open(data.signedUrl, "_blank");
  };

  const pendingPayments = payments.filter((p) => p.status === "submitted" || p.status === "pending");
  const processedPayments = payments.filter((p) => !["submitted", "pending"].includes(p.status));

  return (
    <div className="flex flex-col min-h-full pb-8">
      <div className="gradient-hero px-5 pt-12 pb-10">
        <button onClick={() => navigate(-1)} className="text-primary-foreground/80 mb-3 flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-primary-foreground font-display text-2xl font-bold">Platform Admin</h1>
        <p className="text-primary-foreground/70 text-sm">Licenses, payments & receiving accounts</p>
      </div>

      <div className="px-4 -mt-6">
        <Tabs defaultValue="payments">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="payments">Payments {pendingPayments.length > 0 && <span className="ml-1 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px]">{pendingPayments.length}</span>}</TabsTrigger>
            <TabsTrigger value="licenses">Licenses</TabsTrigger>
            <TabsTrigger value="banks">Banks</TabsTrigger>
          </TabsList>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments" className="mt-4 space-y-4">
            <Card className="p-4 shadow-card">
              <h3 className="font-display font-semibold mb-3">Pending review</h3>
              {pendingPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No pending payments</p>
              ) : (
                <div className="space-y-2">
                  {pendingPayments.map((p) => (
                    <div key={p.id} className="p-3 rounded-lg border border-border space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{planMap[p.plan_id] ?? "?"} · ₦{Number(p.amount).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{p.provider.replace("_", " ")} · {new Date(p.created_at).toLocaleString()}</p>
                          <p className="text-xs font-mono mt-1">{p.reference}</p>
                          {p.payer_note && <p className="text-xs italic mt-1">"{p.payer_note}"</p>}
                        </div>
                        {p.proof_url && (
                          <Button size="sm" variant="outline" onClick={() => viewProof(p.proof_url!)} className="gap-1">
                            <FileText className="w-3 h-3" /> Proof
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 gap-1" onClick={() => approvePayment(p.id)}>
                          <CheckCircle2 className="w-3 h-3" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => rejectPayment(p.id)}>
                          <XCircle className="w-3 h-3" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4 shadow-card">
              <h3 className="font-display font-semibold mb-3">Recent history</h3>
              {processedPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No processed payments yet</p>
              ) : (
                <div className="space-y-2">
                  {processedPayments.slice(0, 20).map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded border border-border text-sm">
                      <div className="min-w-0">
                        <p className="font-mono text-xs truncate">{p.reference}</p>
                        <p className="text-xs text-muted-foreground">₦{Number(p.amount).toLocaleString()} · {p.provider.replace("_", " ")}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "approved" ? "bg-[hsl(var(--success-light))] text-[hsl(var(--success-text))]" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* LICENSES TAB */}
          <TabsContent value="licenses" className="mt-4">
            <Card className="p-4 shadow-card">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display font-semibold">License keys</h3>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Generate</Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Generate license keys</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Plan</Label>
                        <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                          <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                          <SelectContent>
                            {plans.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name} — ₦{p.price.toLocaleString()}/{p.billing_period}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quantity (1-100)</Label>
                        <Input type="number" min={1} max={100} value={batchSize}
                          onChange={(e) => setBatchSize(Math.max(1, Math.min(100, +e.target.value || 1)))} />
                      </div>
                      <div>
                        <Label>Notes (optional)</Label>
                        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. For Lagos sales batch" />
                      </div>
                      <Button onClick={generate} disabled={generating} className="w-full">
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Tabs defaultValue="unused">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="unused">Unused ({filterByStatus("unused").length})</TabsTrigger>
                  <TabsTrigger value="active">Active ({filterByStatus("active").length})</TabsTrigger>
                  <TabsTrigger value="expired">Expired ({filterByStatus("expired").length})</TabsTrigger>
                  <TabsTrigger value="revoked">Revoked ({filterByStatus("revoked").length})</TabsTrigger>
                </TabsList>
                {["unused", "active", "expired", "revoked"].map((s) => (
                  <TabsContent key={s} value={s} className="mt-4">
                    {isLoading ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
                    ) : filterByStatus(s).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">No {s} keys</p>
                    ) : (
                      <div className="space-y-2">
                        {filterByStatus(s).map((k) => (
                          <div key={k.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-background">
                            <div className="min-w-0 flex-1">
                              <p className="font-mono text-sm font-medium truncate">{k.key}</p>
                              <p className="text-xs text-muted-foreground">
                                {planMap[k.plan_id] ?? "Unknown plan"}
                                {k.expires_at && ` · expires ${new Date(k.expires_at).toLocaleDateString()}`}
                                {k.notes && ` · ${k.notes}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" onClick={() => copy(k.key)}><Copy className="w-4 h-4" /></Button>
                              {k.status !== "revoked" && (
                                <Button size="icon" variant="ghost" onClick={() => revoke(k.id)}>
                                  <Ban className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </Card>
          </TabsContent>

          {/* BANKS TAB */}
          <TabsContent value="banks" className="mt-4">
            <BanksManager banks={banks} onChange={() => qc.invalidateQueries({ queryKey: ["admin-banks"] })} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function BanksManager({ banks, onChange }: { banks: Bank[]; onChange: () => void }) {
  const [form, setForm] = useState({ bank_name: "", account_name: "", account_number: "", instructions: "" });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!form.bank_name || !form.account_name || !form.account_number) return toast.error("Fill bank, name, account #");
    setSaving(true);
    const { error } = await supabase.from("platform_bank_accounts").insert({
      bank_name: form.bank_name, account_name: form.account_name, account_number: form.account_number,
      instructions: form.instructions || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setForm({ bank_name: "", account_name: "", account_number: "", instructions: "" });
    toast.success("Bank account added"); onChange();
  };
  const toggle = async (b: Bank) => {
    const { error } = await supabase.from("platform_bank_accounts").update({ active: !b.active }).eq("id", b.id);
    if (error) return toast.error(error.message);
    onChange();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this bank account?")) return;
    const { error } = await supabase.from("platform_bank_accounts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); onChange();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 shadow-card">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Building2 className="w-4 h-4" /> Add receiving account</h3>
        <div className="space-y-2">
          <Input placeholder="Bank name (e.g. GTBank)" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
          <Input placeholder="Account name" value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
          <Input placeholder="Account number" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
          <Textarea placeholder="Instructions for the customer (optional)" rows={2} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
          <Button onClick={add} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add account"}</Button>
        </div>
      </Card>

      <Card className="p-4 shadow-card">
        <h3 className="font-display font-semibold mb-3">All accounts</h3>
        {banks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No bank accounts yet</p>
        ) : (
          <div className="space-y-2">
            {banks.map((b) => (
              <div key={b.id} className="p-3 rounded-lg border border-border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm">{b.bank_name}</p>
                    <p className="text-xs text-muted-foreground">{b.account_name}</p>
                    <p className="font-mono text-sm mt-1">{b.account_number}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => toggle(b)}>{b.active ? "Active" : "Inactive"}</Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
