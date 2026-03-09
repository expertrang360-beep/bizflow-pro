import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/bizkit";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useBusinessType } from "@/hooks/useBusinessType";

export default function ProfitLossPage() {
  const navigate = useNavigate();
  const { isManufacturer } = useBusinessType();
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = today.toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  const [data, setData] = useState({
    totalRevenue: 0, costOfGoods: 0, grossProfit: 0,
    expenses: 0, payroll: 0, depreciation: 0,
    netProfitBeforeTax: 0, vat: 0, netProfit: 0,
    expenseBreakdown: [] as { category: string; total: number }[],
    productionMaterials: 0, productionLabor: 0, productionOverhead: 0, productionOther: 0,
  });

  const fetchReport = async () => {
    setLoading(true);

    const baseQueries = [
      supabase.from("sales").select("total, subtotal, discount, tax, status").gte("created_at", startDate + "T00:00:00").lte("created_at", endDate + "T23:59:59").neq("status", "cancelled"),
      supabase.from("sale_items").select("qty, cost_at_time, total, sale_id, sales!inner(created_at, status)").gte("sales.created_at", startDate + "T00:00:00").lte("sales.created_at", endDate + "T23:59:59").neq("sales.status", "cancelled"),
      supabase.from("expenses").select("amount, category").gte("expense_date", startDate).lte("expense_date", endDate),
      supabase.from("payroll_runs").select("total_net").gte("period_start", startDate).lte("period_end", endDate),
      supabase.from("assets").select("purchase_cost, salvage_value, useful_life_months, purchase_date, depreciation_method").eq("status", "active"),
      supabase.from("tax_records").select("tax_amount, tax_type").gte("period_start", startDate).lte("period_end", endDate).eq("tax_type", "vat"),
    ] as const;

    const manufacturerQueries = isManufacturer ? [
      supabase.from("production_material_usage").select("total_cost, production_order:production_orders!inner(status, created_at)").gte("production_orders.created_at", startDate + "T00:00:00").lte("production_orders.created_at", endDate + "T23:59:59").eq("production_orders.status", "completed"),
      supabase.from("production_costs").select("amount, cost_type, production_order:production_orders!inner(status, created_at)").gte("production_orders.created_at", startDate + "T00:00:00").lte("production_orders.created_at", endDate + "T23:59:59").eq("production_orders.status", "completed"),
      supabase.from("production_orders").select("quantity, bom:bill_of_materials(estimated_labor_cost, estimated_overhead_cost), status, created_at").gte("created_at", startDate + "T00:00:00").lte("created_at", endDate + "T23:59:59").eq("status", "completed"),
    ] as const : [];

    const [salesRes, saleItemsRes, expensesRes, payrollRes, assetsRes, taxRes, ...mfgResults] = await Promise.all([...baseQueries, ...manufacturerQueries]);

    const totalRevenue = (salesRes.data || []).reduce((s, r) => s + Number(r.total), 0);
    const costOfGoods = (saleItemsRes.data || []).reduce((s, i) => s + (Number(i.cost_at_time) * Number(i.qty)), 0);

    // Expense breakdown
    const expMap: Record<string, number> = {};
    (expensesRes.data || []).forEach(e => {
      expMap[e.category] = (expMap[e.category] || 0) + Number(e.amount);
    });
    const expenseBreakdown = Object.entries(expMap).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
    const totalExpenses = Object.values(expMap).reduce((s, v) => s + v, 0);

    const payroll = (payrollRes.data || []).reduce((s, r) => s + Number(r.total_net), 0);

    // Monthly depreciation for period
    const periodMonths = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
    const depreciation = (assetsRes.data || []).reduce((s, a) => {
      const depreciable = Number(a.purchase_cost) - Number(a.salvage_value);
      const monthlyDep = depreciable / Number(a.useful_life_months);
      return s + (monthlyDep * periodMonths);
    }, 0);

    // Production costs (manufacturer only)
    let productionMaterials = 0;
    let productionLabor = 0;
    let productionOverhead = 0;
    let productionOther = 0;

    if (isManufacturer && mfgResults.length === 3) {
      const [matUsageRes, prodCostsRes, prodOrdersRes] = mfgResults;
      
      productionMaterials = (matUsageRes.data || []).reduce((s: number, m: any) => s + Number(m.total_cost), 0);
      
      (prodCostsRes.data || []).forEach((c: any) => {
        const amt = Number(c.amount);
        if (c.cost_type === "labor") productionLabor += amt;
        else if (c.cost_type === "overhead") productionOverhead += amt;
        else productionOther += amt;
      });

      // Add BOM estimated labor/overhead
      (prodOrdersRes.data || []).forEach((o: any) => {
        const qty = Number(o.quantity);
        productionLabor += (Number(o.bom?.estimated_labor_cost) || 0) * qty;
        productionOverhead += (Number(o.bom?.estimated_overhead_cost) || 0) * qty;
      });
    }

    const totalProductionCosts = productionMaterials + productionLabor + productionOverhead + productionOther;
    const grossProfit = totalRevenue - costOfGoods - totalProductionCosts;

    const netProfitBeforeTax = grossProfit - totalExpenses - payroll - depreciation;
    const vat = (taxRes.data || []).reduce((s, t) => s + Number(t.tax_amount), 0);
    const netProfit = netProfitBeforeTax - vat;

    setData({
      totalRevenue, costOfGoods, grossProfit, expenses: totalExpenses, payroll, depreciation,
      netProfitBeforeTax, vat, netProfit, expenseBreakdown,
      productionMaterials, productionLabor, productionOverhead, productionOther,
    });
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, [startDate, endDate, isManufacturer]);

  const totalProductionCosts = data.productionMaterials + data.productionLabor + data.productionOverhead + data.productionOther;

  const LineItem = ({ label, amount, bold, negative, indent }: { label: string; amount: number; bold?: boolean; negative?: boolean; indent?: boolean }) => (
    <div className={`flex items-center justify-between py-2 ${indent ? "pl-4" : ""} ${bold ? "font-bold border-t border-border pt-3" : ""}`}>
      <span className={`text-sm ${bold ? "font-bold" : ""}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-bold" : ""} ${negative ? "text-destructive" : amount > 0 && bold ? "text-[hsl(var(--success))]" : ""}`}>
        {negative ? "-" : ""}{formatNaira(Math.abs(amount))}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">Profit & Loss</h1>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block text-muted-foreground">From</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs mb-1 block text-muted-foreground">To</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-sm" />
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Summary card */}
            <div className={`rounded-xl p-5 text-center ${data.netProfit >= 0 ? "bg-[hsl(var(--success-light))]" : "bg-destructive/10"}`}>
              <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
              <p className={`text-3xl font-bold ${data.netProfit >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                {formatNaira(data.netProfit)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Margin: {data.totalRevenue > 0 ? ((data.netProfit / data.totalRevenue) * 100).toFixed(1) : "0"}%
              </p>
            </div>

            {/* Revenue section */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Revenue</h3>
              <LineItem label="Sales Revenue" amount={data.totalRevenue} />
              <LineItem label="Cost of Goods Sold" amount={data.costOfGoods} negative />
              {isManufacturer && totalProductionCosts > 0 && (
                <LineItem label="Production Costs" amount={totalProductionCosts} negative />
              )}
              <LineItem label="Gross Profit" amount={data.grossProfit} bold />
            </div>

            {/* Production costs breakdown (manufacturer only) */}
            {isManufacturer && totalProductionCosts > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Production Cost Breakdown</h3>
                {data.productionMaterials > 0 && <LineItem label="Raw Materials" amount={data.productionMaterials} indent negative />}
                {data.productionLabor > 0 && <LineItem label="Labor" amount={data.productionLabor} indent negative />}
                {data.productionOverhead > 0 && <LineItem label="Overhead" amount={data.productionOverhead} indent negative />}
                {data.productionOther > 0 && <LineItem label="Other Production Costs" amount={data.productionOther} indent negative />}
                <LineItem label="Total Production Costs" amount={totalProductionCosts} bold negative />
              </div>
            )}

            {/* Operating expenses */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Operating Expenses</h3>
              {data.expenseBreakdown.map(e => (
                <LineItem key={e.category} label={e.category} amount={e.total} indent negative />
              ))}
              {data.payroll > 0 && <LineItem label="Payroll" amount={data.payroll} indent negative />}
              {data.depreciation > 0 && <LineItem label="Depreciation" amount={data.depreciation} indent negative />}
              <LineItem label="Total Operating Expenses" amount={data.expenses + data.payroll + data.depreciation} bold negative />
            </div>

            {/* Net profit */}
            <div className="bg-card rounded-xl border border-border p-4">
              <LineItem label="Net Profit Before Tax" amount={data.netProfitBeforeTax} bold />
              {data.vat > 0 && <LineItem label="VAT Liability" amount={data.vat} negative />}
              <LineItem label="Net Profit" amount={data.netProfit} bold />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
