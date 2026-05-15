import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Copy, Loader2, ShieldCheck, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Plan = { id: string; name: string; price: number; billing_period: string };
type LicenseKey = {
  id: string;
  key: string;
  plan_id: string;
  status: string;
  assigned_org_id: string | null;
  activated_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
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
      const { data, error } = await supabase
        .from("license_keys")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as LicenseKey[];
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
      setOpen(false);
      setNotes("");
      setBatchSize(1);
      qc.invalidateQueries({ queryKey: ["license-keys"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this license key? This cannot be undone.")) return;
    const { error } = await supabase.from("license_keys").update({ status: "revoked" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Key revoked");
    qc.invalidateQueries({ queryKey: ["license-keys"] });
  };

  const copy = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Key copied");
  };

  const planMap = Object.fromEntries(plans.map((p) => [p.id, p.name]));

  const filterByStatus = (s: string) => keys.filter((k) => k.status === s);

  return (
    <div className="flex flex-col min-h-full pb-8">
      <div className="gradient-hero px-5 pt-12 pb-10">
        <button onClick={() => navigate(-1)} className="text-primary-foreground/80 mb-3 flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-primary-foreground font-display text-2xl font-bold">License Keys</h1>
            <p className="text-primary-foreground/70 text-sm">Generate and manage subscription keys</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-1"><Plus className="w-4 h-4" /> New</Button>
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
      </div>

      <div className="px-4 -mt-6">
        <Card className="p-4 shadow-card">
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
                          <Button size="icon" variant="ghost" onClick={() => copy(k.key)}>
                            <Copy className="w-4 h-4" />
                          </Button>
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
      </div>
    </div>
  );
}
