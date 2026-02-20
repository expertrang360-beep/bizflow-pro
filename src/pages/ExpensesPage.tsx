import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, formatDate } from "@/lib/bizkit";
import { ArrowLeft, Plus, ChevronRight, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Expense {
  id: string;
  category: string;
  amount: number;
  payment_type: string;
  note: string | null;
  expense_date: string;
  created_at: string;
}

export default function ExpensesPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalToday, setTotalToday] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }).order("created_at", { ascending: false }).limit(100).then(({ data }) => {
      const list = (data as Expense[]) || [];
      setExpenses(list);
      setTotalToday(list.filter(e => e.expense_date === today).reduce((s, e) => s + Number(e.amount), 0));
      setLoading(false);
    });
  }, []);

  const payIcons: Record<string, string> = { cash: "💵", transfer: "📱", pos: "💳" };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">Expenses</h1>
          <Button size="sm" onClick={() => navigate("/expenses/new")} className="bg-destructive text-destructive-foreground gap-1 h-9 px-3">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
        <div className="mt-3 bg-destructive/10 rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">Today's Expenses</p>
          <p className="text-2xl font-bold text-destructive">{formatNaira(totalToday)}</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-3">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingDown className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="font-semibold">No expenses yet</p>
            <p className="text-sm text-muted-foreground mb-4">Record business expenses here</p>
            <Button onClick={() => navigate("/expenses/new")} className="bg-destructive text-destructive-foreground gap-2">
              <Plus className="w-4 h-4" /> Add Expense
            </Button>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {expenses.map(e => (
              <div key={e.id} className="bg-card rounded-xl border border-border shadow-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                  {payIcons[e.payment_type] || "💸"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{e.category}</p>
                    <p className="font-bold text-destructive text-sm">-{formatNaira(e.amount)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.note && <p className="text-xs text-muted-foreground truncate">{e.note}</p>}
                    <p className="text-xs text-muted-foreground ml-auto">{formatDate(e.expense_date)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
