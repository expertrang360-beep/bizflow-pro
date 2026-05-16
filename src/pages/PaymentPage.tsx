import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, Building2, Upload, Copy, Loader2, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Plan = { id: string; name: string; price: number; currency: string; billing_period: string };
type Bank = { id: string; bank_name: string; account_name: string; account_number: string; instructions: string | null };

export default function PaymentPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");
  const qc = useQueryClient();
  const { organizationId, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [payerNote, setPayerNote] = useState("");
  const [manualRef, setManualRef] = useState("");

  // Handle Paystack return
  useEffect(() => {
    if (!reference) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("paystack-verify", { body: { reference } });
        if (error) throw error;
        if (data?.status === "approved") {
          toast.success("Payment confirmed — subscription activated 🎉");
          qc.invalidateQueries({ queryKey: ["subscription"] });
          setTimeout(() => navigate("/subscription"), 1200);
        } else {
          toast.error(data?.message || "Payment not confirmed");
        }
      } catch (e: any) {
        toast.error(e.message || "Verification failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [reference]);

  const { data: plan } = useQuery({
    queryKey: ["plan", planId],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").eq("id", planId!).maybeSingle();
      if (error) throw error;
      return data as Plan;
    },
    enabled: !!planId,
  });

  const { data: banks = [] } = useQuery({
    queryKey: ["platform-banks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_bank_accounts").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data as Bank[];
    },
  });

  const fmt = (n: number, cur = "NGN") =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

  const payWithPaystack = async () => {
    if (!plan) return;
    setLoading(true);
    try {
      const callback = `${window.location.origin}/pay/${plan.id}`;
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: { plan_id: plan.id, callback_url: callback },
      });
      if (error) throw error;
      if (data?.authorization_url) window.location.href = data.authorization_url;
    } catch (e: any) {
      toast.error(e.message || "Could not start payment");
      setLoading(false);
    }
  };

  const submitManual = async () => {
    if (!plan || !organizationId || !user) return;
    if (!proofFile && !manualRef.trim()) {
      toast.error("Upload proof or enter the bank reference");
      return;
    }
    setLoading(true);
    try {
      let proof_url: string | null = null;
      if (proofFile) {
        const ext = proofFile.name.split(".").pop() || "jpg";
        const path = `${organizationId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, proofFile, { upsert: false });
        if (upErr) throw upErr;
        proof_url = path;
      }
      const reference = manualRef.trim() || `MAN-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const { error: insErr } = await supabase.from("payment_transactions").insert({
        organization_id: organizationId,
        plan_id: plan.id,
        user_id: user.id,
        provider: "manual_transfer",
        reference,
        amount: plan.price,
        currency: plan.currency,
        status: "submitted",
        proof_url,
        payer_note: payerNote || null,
      });
      if (insErr) throw insErr;
      toast.success("Submitted! We'll activate your plan after confirming the transfer.");
      navigate("/subscription");
    } catch (e: any) {
      toast.error(e.message || "Could not submit payment");
    } finally {
      setLoading(false);
    }
  };

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copied`);
  };

  return (
    <div className="flex flex-col min-h-full pb-8">
      <div className="gradient-hero px-5 pt-12 pb-10">
        <button onClick={() => navigate(-1)} className="text-primary-foreground/80 mb-3 flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-primary-foreground font-display text-2xl font-bold">Pay for plan</h1>
        {plan && (
          <p className="text-primary-foreground/80 text-sm mt-1">
            {plan.name} — {fmt(plan.price, plan.currency)} /{plan.billing_period}
          </p>
        )}
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {reference && loading && (
          <Card className="p-5 shadow-card flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">Verifying payment…</p>
              <p className="text-xs text-muted-foreground">Reference {reference}</p>
            </div>
          </Card>
        )}

        {plan && (
          <Card className="p-2 shadow-card">
            <Tabs defaultValue="paystack">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="paystack" className="gap-2"><CreditCard className="w-4 h-4" /> Card / Bank</TabsTrigger>
                <TabsTrigger value="manual" className="gap-2"><Building2 className="w-4 h-4" /> Transfer</TabsTrigger>
              </TabsList>

              <TabsContent value="paystack" className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Pay instantly with card, bank transfer or USSD via Paystack. Your subscription activates the moment payment succeeds.
                </p>
                <div className="rounded-lg bg-muted p-3 text-sm flex justify-between">
                  <span>Amount</span>
                  <span className="font-semibold">{fmt(plan.price, plan.currency)}</span>
                </div>
                <Button onClick={payWithPaystack} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Pay {fmt(plan.price, plan.currency)} with Paystack</>}
                </Button>
              </TabsContent>

              <TabsContent value="manual" className="p-4 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">1. Transfer to any of these accounts</p>
                  {banks.length === 0 ? (
                    <Card className="p-4 bg-muted">
                      <p className="text-sm text-muted-foreground">
                        Bank details not configured yet. Contact support, or ask the platform admin to add a receiving account.
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {banks.map((b) => (
                        <Card key={b.id} className="p-3 border-border">
                          <p className="font-semibold text-sm">{b.bank_name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <div>
                              <p className="text-xs text-muted-foreground">{b.account_name}</p>
                              <p className="font-mono text-base">{b.account_number}</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => copy(b.account_number, "Account number")}>
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          {b.instructions && <p className="text-xs text-muted-foreground mt-2">{b.instructions}</p>}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-primary/5 p-3 text-sm">
                  Use this reference in your transfer narration so we can match it:
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono font-semibold">BIZ-{organizationId?.slice(0, 8).toUpperCase()}</span>
                    <Button size="sm" variant="ghost" onClick={() => copy(`BIZ-${organizationId?.slice(0, 8).toUpperCase()}`, "Reference")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>2. Bank transaction reference</Label>
                  <Input value={manualRef} onChange={(e) => setManualRef(e.target.value)} placeholder="e.g. FT24050123456" />
                </div>

                <div className="space-y-2">
                  <Label>3. Upload proof (screenshot or PDF)</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/*,.pdf" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                  </div>
                  {proofFile && <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[hsl(var(--success))]" /> {proofFile.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Note (optional)</Label>
                  <Textarea value={payerNote} onChange={(e) => setPayerNote(e.target.value)} placeholder="Any details that help us match the payment" rows={2} />
                </div>

                <Button onClick={submitManual} disabled={loading} className="w-full gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" /> Submit for review</>}
                </Button>

                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Manual transfers are usually verified within a few hours during business days.
                </p>
              </TabsContent>
            </Tabs>
          </Card>
        )}
      </div>
    </div>
  );
}
