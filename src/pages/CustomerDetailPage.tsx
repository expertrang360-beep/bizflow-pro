import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira, formatDate, formatDateTime, DEFAULT_BRANCH_ID } from "@/lib/bizkit";
import { ArrowLeft, Check, CreditCard, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type PaymentType = "cash" | "transfer" | "pos";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  total_credit: number;
}

interface DebtPayment {
  id: string;
  amount: number;
  payment_type: string;
  note: string | null;
  created_at: string;
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);
  const [form, setForm] = useState({ amount: "", payment_type: "cash" as PaymentType, note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const [custRes, payRes] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id!).single(),
      supabase.from("debt_payments").select("*").eq("customer_id", id!).order("created_at", { ascending: false }),
    ]);
    setCustomer(custRes.data as Customer | null);
    setPayments((payRes.data as DebtPayment[]) || []);
    setLoading(false);
  };

  const handlePay = async () => {
    if (!form.amount || Number(form.amount) <= 0 || !customer) return;
    const payAmount = Number(form.amount);
    if (payAmount > Number(customer.total_credit)) {
      toast({ variant: "destructive", title: "Amount exceeds outstanding balance" });
      return;
    }
    setSaving(true);
    try {
      // 1. Insert debt_payment
      const { data: dp, error } = await supabase.from("debt_payments").insert({
        customer_id: customer.id,
        amount: payAmount,
        payment_type: form.payment_type,
        note: form.note || null,
        branch_id: DEFAULT_BRANCH_ID,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;

      // 2. Reduce customer total_credit atomically
      const { error: creditErr } = await supabase.rpc("update_customer_credit_atomic", {
        p_customer_id: customer.id,
        p_credit_delta: -payAmount,
      });
      if (creditErr) throw new Error(`Credit update failed: ${creditErr.message}`);

      // 3. Cashbook inflow
      await supabase.from("cashbook_entries").insert({
        branch_id: DEFAULT_BRANCH_ID,
        direction: "in",
        amount: payAmount,
        source_type: "debt_payment",
        source_id: dp.id,
        description: `Debt payment from ${customer.name}`,
        created_by: user?.id,
      });

      // 4. Audit log
      await supabase.from("audit_logs").insert({
        action: "debt_payment",
        entity: "debt_payments",
        entity_id: dp.id,
        user_id: user?.id,
        after_json: { amount: payAmount, customer_id: customer.id, payment_type: form.payment_type },
      });

      toast({ title: "Payment recorded! ✅" });
      setForm({ amount: "", payment_type: "cash", note: "" });
      setShowPay(false);
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSaving(false);
    }
  };

  const payTypes: { key: PaymentType; label: string; icon: string }[] = [
    { key: "cash", label: "Cash", icon: "💵" },
    { key: "transfer", label: "Transfer", icon: "📱" },
    { key: "pos", label: "POS", icon: "💳" },
  ];

  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <div className="bg-card border-b border-border px-4 pt-12 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full py-20">
        <p className="text-muted-foreground">Customer not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/customers")}>Back to Customers</Button>
      </div>
    );
  }

  const credit = Number(customer.total_credit);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold flex-1 truncate">{customer.name}</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Customer info card */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
              {customer.name[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-bold">{customer.name}</p>
              <p className="text-sm text-muted-foreground">{customer.phone || "No phone"}</p>
              {customer.address && <p className="text-xs text-muted-foreground">{customer.address}</p>}
            </div>
          </div>
        </div>

        {/* Credit balance */}
        <div className={`rounded-xl p-4 ${credit > 0 ? "bg-destructive/10" : "bg-emerald-500/10"}`}>
          <p className="text-xs text-muted-foreground mb-1">Outstanding Balance</p>
          <p className={`text-3xl font-bold ${credit > 0 ? "text-destructive" : "text-emerald-600"}`}>
            {formatNaira(credit)}
          </p>
          {credit > 0 && (
            <Button
              onClick={() => setShowPay(true)}
              className="mt-3 bg-primary text-primary-foreground gap-2 w-full h-12 font-bold text-base rounded-xl"
            >
              <CreditCard className="w-5 h-5" />
              Record Payment
            </Button>
          )}
        </div>

        {/* Payment history */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-bold text-sm">Payment History</h2>
          </div>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No payments recorded yet</div>
          ) : (
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 text-lg">
                    💰
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-600">+{formatNaira(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.payment_type} · {formatDateTime(p.created_at)}
                    </p>
                    {p.note && <p className="text-xs text-muted-foreground truncate">{p.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment bottom sheet */}
      {showPay && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-foreground/20" onClick={() => setShowPay(false)}>
          <div className="bg-card rounded-t-3xl p-5 space-y-4 shadow-lg max-h-[85vh] overflow-y-auto pb-safe" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg">Record Debt Payment</h2>
            <p className="text-sm text-muted-foreground">
              Outstanding: <span className="font-bold text-destructive">{formatNaira(credit)}</span>
            </p>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Amount (₦) *</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="h-11 text-lg font-bold"
                max={credit}
              />
            </div>

            <div>
              <Label className="text-sm font-semibold mb-3 block">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {payTypes.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setForm(f => ({ ...f, payment_type: key }))}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      form.payment_type === key ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                    }`}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span className="text-xs font-medium">{label}</span>
                    {form.payment_type === key && <Check className="w-3 h-3 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Note (optional)</Label>
              <Input
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Payment reference or note"
                className="h-10"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowPay(false)} className="flex-1">Cancel</Button>
              <Button
                onClick={handlePay}
                disabled={saving || !form.amount || Number(form.amount) <= 0}
                className="flex-1 bg-primary text-primary-foreground font-bold"
              >
                {saving ? "Saving..." : "Confirm Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
