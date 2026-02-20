import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, todayStr } from "@/lib/bizkit";
import { BarChart2, TrendingUp, TrendingDown, Package, Users, Truck, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReportStats {
  totalSales: number; totalExpenses: number; totalProfit: number;
  cashSales: number; transferSales: number; posSales: number; creditSales: number;
  totalDebtors: number; totalPayables: number; stockValue: number; totalOrders: number;
}

export default function ReportsPage() {
  const today = todayStr();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReport(); }, [from, to]);

  const fetchReport = async () => {
    setLoading(true);
    const [salesRes, expensesRes, customersRes, suppliersRes, productsRes] = await Promise.all([
      supabase.from("sales").select("total, payment_type, sale_items(qty, price, cost_at_time)").gte("created_at", `${from}T00:00:00`).lte("created_at", `${to}T23:59:59`).neq("status", "cancelled"),
      supabase.from("expenses").select("amount").gte("expense_date", from).lte("expense_date", to),
      supabase.from("customers").select("total_credit"),
      supabase.from("suppliers").select("total_payable"),
      supabase.from("products").select("cost_price, stock_qty").eq("active", true),
    ]);
    const salesData = salesRes.data || [];
    let totalProfit = 0;
    for (const sale of salesData) {
      const items = (sale as { sale_items: { qty: number; price: number; cost_at_time: number }[] }).sale_items || [];
      totalProfit += items.reduce((s, i) => s + (Number(i.price) - Number(i.cost_at_time)) * Number(i.qty), 0);
    }
    setStats({
      totalSales: salesData.reduce((s, r) => s + Number(r.total), 0),
      totalExpenses: (expensesRes.data || []).reduce((s, r) => s + Number(r.amount), 0),
      totalProfit,
      cashSales: salesData.filter(r => r.payment_type === "cash").reduce((s, r) => s + Number(r.total), 0),
      transferSales: salesData.filter(r => r.payment_type === "transfer").reduce((s, r) => s + Number(r.total), 0),
      posSales: salesData.filter(r => r.payment_type === "pos").reduce((s, r) => s + Number(r.total), 0),
      creditSales: salesData.filter(r => r.payment_type === "credit").reduce((s, r) => s + Number(r.total), 0),
      totalDebtors: (customersRes.data || []).reduce((s, r) => s + Number(r.total_credit), 0),
      totalPayables: (suppliersRes.data || []).reduce((s, r) => s + Number(r.total_payable), 0),
      stockValue: (productsRes.data || []).reduce((s, r) => s + Number(r.cost_price) * Number(r.stock_qty), 0),
      totalOrders: salesData.length,
    });
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <h1 className="text-xl font-bold mb-4">Reports</h1>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 text-sm" />
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 animate-fade-in">
        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : stats && (
          <>
            {/* Hero stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<TrendingUp className="w-5 h-5 text-accent" />} label="Total Revenue" value={formatNaira(stats.totalSales)} color="bg-accent/10" />
              <StatCard icon={<BarChart2 className="w-5 h-5 text-primary" />} label="Net Profit" value={formatNaira(stats.totalProfit)} color="bg-primary/10" />
              <StatCard icon={<TrendingDown className="w-5 h-5 text-destructive" />} label="Total Expenses" value={formatNaira(stats.totalExpenses)} color="bg-destructive/10" />
              <StatCard icon={<Calendar className="w-5 h-5 text-warning" />} label="Total Orders" value={`${stats.totalOrders}`} color="bg-warning/10" />
            </div>

            {/* Payment breakdown */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h2 className="font-semibold text-sm mb-3">💳 Payment Breakdown</h2>
              <div className="space-y-2">
                {[
                  { label: "Cash", val: stats.cashSales, icon: "💵" },
                  { label: "Transfer", val: stats.transferSales, icon: "📱" },
                  { label: "POS", val: stats.posSales, icon: "💳" },
                  { label: "Credit", val: stats.creditSales, icon: "📋" },
                ].map(({ label, val, icon }) => (
                  <div key={label} className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">{icon} {label}</span>
                    <span className="text-sm font-semibold">{formatNaira(val)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Balance sheet */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h2 className="font-semibold text-sm mb-3">📊 Business Overview</h2>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" />Total Debtors</span>
                  <span className="text-sm font-bold text-destructive">{formatNaira(stats.totalDebtors)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><Truck className="w-4 h-4" />Total Payables</span>
                  <span className="text-sm font-bold text-warning">{formatNaira(stats.totalPayables)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" />Stock Value (Cost)</span>
                  <span className="text-sm font-bold text-primary">{formatNaira(stats.stockValue)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-4">
      <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center mb-2`}>{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}
