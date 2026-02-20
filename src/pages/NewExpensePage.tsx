import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_BRANCH_ID, todayStr } from "@/lib/bizkit";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const EXPENSE_CATEGORIES = [
  "Rent", "Salary & Wages", "Electricity", "Transport", "Marketing",
  "Equipment", "Maintenance", "Inventory Purchase", "Food & Refreshment",
  "Internet & Phone", "Tax & Levies", "Others"
];

type PaymentType = "cash" | "transfer" | "pos";

export default function NewExpensePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    category: "", amount: "", payment_type: "cash" as PaymentType,
    note: "", expense_date: todayStr(),
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.category || !form.amount) {
      toast({ variant: "destructive", title: "Missing fields", description: "Category and amount are required." });
      return;
    }
    setSaving(true);
    try {
      const { data: expense, error } = await supabase.from("expenses").insert({
        branch_id: DEFAULT_BRANCH_ID,
        category: form.category,
        amount: Number(form.amount),
        payment_type: form.payment_type,
        note: form.note || null,
        expense_date: form.expense_date,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;

      // Cashbook entry
      await supabase.from("cashbook_entries").insert({
        branch_id: DEFAULT_BRANCH_ID,
        direction: "out",
        amount: Number(form.amount),
        source_type: "expense",
        source_id: expense.id,
        description: form.category,
        entry_date: form.expense_date,
        created_by: user?.id,
      });

      toast({ title: "Expense recorded! ✅" });
      navigate("/more/expenses");
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

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Add Expense</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Category *</Label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            >
              <option value="">Select category</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Amount (₦) *</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="h-11 text-lg font-bold"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Date</Label>
            <Input
              type="date"
              value={form.expense_date}
              onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
              className="h-10"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Note (optional)</Label>
            <Input
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="What was this expense for?"
              className="h-10"
            />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
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

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14 bg-destructive text-destructive-foreground font-bold text-base rounded-2xl"
        >
          {saving ? "Saving..." : "Record Expense"}
        </Button>
      </div>
    </div>
  );
}
