import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira, todayStr } from "@/lib/bizkit";
import { useBusinessType } from "@/hooks/useBusinessType";
import {
  TrendingUp, TrendingDown, ShoppingCart, Package, Users,
  Truck, Plus, ArrowRight, Wallet, CreditCard, AlertCircle,
  RefreshCw, Factory, Boxes, ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  todaySales: number;
  todayExpenses: number;
  todayProfit: number;
  cashSales: number;
  transferSales: number;
  posSales: number;
  creditSales: number;
  totalDebtors: number;
  totalPayables: number;
  lowStockCount: number;
  deliveredCount: number;
  pendingDeliveryCount: number;
}

interface MfgStats {
  todayProduced: number;
  todayPackaged: number;
  todayUnpackaged: number;
  lowRawMaterialCount: number;
  activeOrderCount: number;
}

const DEFAULT_STATS: DashboardStats = {
  todaySales: 0, todayExpenses: 0, todayProfit: 0,
  cashSales: 0, transferSales: 0, posSales: 0, creditSales: 0,
  totalDebtors: 0, totalPayables: 0, lowStockCount: 0,
  deliveredCount: 0, pendingDeliveryCount: 0,
};

const DEFAULT_MFG: MfgStats = {
  todayProduced: 0, todayPackaged: 0, todayUnpackaged: 0,
  lowRawMaterialCount: 0, activeOrderCount: 0,
};

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isManufacturer } = useBusinessType();
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [mfgStats, setMfgStats] = useState<MfgStats>(DEFAULT_MFG);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing">("synced");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setSyncStatus("syncing");
    setLoading(true);
    const today = todayStr();

    const [salesRes, expensesRes, customersRes, suppliersRes, productsRes, deliveryRes] = await Promise.all([
      supabase.from("sales").select("total, payment_type, subtotal, discount, tax, sale_items(qty, price, cost_at_time)").gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`).neq("status", "cancelled"),
      supabase.from("expenses").select("amount").eq("expense_date", today),
      supabase.from("customers").select("total_credit"),
      supabase.from("suppliers").select("total_payable"),
      supabase.from("products").select("stock_qty, reorder_level").eq("active", true),
      supabase.from("sales").select("delivered").gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`).neq("status", "cancelled"),
    ]);

    const salesData = salesRes.data || [];
    const totalSales = salesData.reduce((s, r) => s + Number(r.total), 0);
    const cashSales = salesData.filter(r => r.payment_type === "cash").reduce((s, r) => s + Number(r.total), 0);
    const transferSales = salesData.filter(r => r.payment_type === "transfer").reduce((s, r) => s + Number(r.total), 0);
    const posSales = salesData.filter(r => r.payment_type === "pos").reduce((s, r) => s + Number(r.total), 0);
    const creditSales = salesData.filter(r => r.payment_type === "credit").reduce((s, r) => s + Number(r.total), 0);

    // Profit = sum of (price - cost_at_time) * qty for all sale items today
    let todayProfit = 0;
    for (const sale of salesData) {
      const items = (sale as { sale_items: { qty: number; price: number; cost_at_time: number }[] }).sale_items || [];
      todayProfit += items.reduce((s, item) => s + (Number(item.price) - Number(item.cost_at_time)) * Number(item.qty), 0);
    }

    const totalExpenses = (expensesRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
    const totalDebtors = (customersRes.data || []).reduce((s, r) => s + Number(r.total_credit), 0);
    const totalPayables = (suppliersRes.data || []).reduce((s, r) => s + Number(r.total_payable), 0);
    const lowStockCount = (productsRes.data || []).filter(p => Number(p.stock_qty) <= Number(p.reorder_level || 0)).length;
    const deliveryData = deliveryRes.data || [];
    const deliveredCount = deliveryData.filter(d => d.delivered).length;
    const pendingDeliveryCount = deliveryData.filter(d => !d.delivered).length;

    setStats({ todaySales: totalSales, todayExpenses: totalExpenses, todayProfit, cashSales, transferSales, posSales, creditSales, totalDebtors, totalPayables, lowStockCount, deliveredCount, pendingDeliveryCount });

    // Fetch manufacturer stats
    const [dailyLogsRes, rawMatsRes, activeOrdersRes] = await Promise.all([
      supabase.from("daily_production_logs").select("quantity_produced, quantity_packaged, quantity_unpackaged").eq("log_date", today),
      supabase.from("raw_materials").select("stock_qty, reorder_level").eq("active", true),
      supabase.from("production_orders").select("id").in("status", ["draft", "in_progress"]),
    ]);

    const logs = dailyLogsRes.data || [];
    const todayProduced = logs.reduce((s, r) => s + Number(r.quantity_produced), 0);
    const todayPackaged = logs.reduce((s, r) => s + Number(r.quantity_packaged), 0);
    const todayUnpackaged = logs.reduce((s, r) => s + Number(r.quantity_unpackaged), 0);
    const lowRawMaterialCount = (rawMatsRes.data || []).filter(m => Number(m.stock_qty) <= Number(m.reorder_level || 0)).length;
    const activeOrderCount = (activeOrdersRes.data || []).length;

    setMfgStats({ todayProduced, todayPackaged, todayUnpackaged, lowRawMaterialCount, activeOrderCount });
    setLoading(false);
    setSyncStatus("synced");
  };

  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "User";

  const quickActions = [
    { label: "New Sale", icon: ShoppingCart, color: "bg-primary text-primary-foreground", to: "/sales/new" },
    { label: "Add Expense", icon: TrendingDown, color: "bg-destructive/10 text-destructive", to: "/expenses/new" },
    { label: "Restock", icon: Truck, color: "bg-warning/10 text-warning", to: "/purchases/new" },
    { label: "Add Product", icon: Package, color: "bg-accent/10 text-accent", to: "/inventory/new" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="gradient-hero px-5 pt-12 pb-8">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-primary-foreground/70 text-sm">{greeting} 👋</p>
            <h1 className="text-2xl font-bold text-primary-foreground">{userName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              className="w-9 h-9 bg-primary-foreground/15 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            >
              <RefreshCw className={`w-4 h-4 text-primary-foreground ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Sync status */}
        <div className="mt-2 flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${syncStatus === "synced" ? "bg-accent" : "bg-warning animate-pulse"}`} />
          <span className="text-primary-foreground/60 text-xs">{syncStatus === "synced" ? "✅ Synced" : "⏳ Syncing..."}</span>
        </div>

        {/* Today's Sales Hero Card */}
        <div className="mt-5 bg-primary-foreground/10 rounded-2xl p-5 border border-primary-foreground/10">
          <p className="text-primary-foreground/70 text-xs font-medium uppercase tracking-wide mb-1">Today's Revenue</p>
          {loading ? (
            <div className="h-8 w-40 bg-primary-foreground/10 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-primary-foreground">{formatNaira(stats.todaySales)}</p>
          )}
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-primary-foreground/50 text-xs">Profit</p>
              <p className="text-sm font-semibold text-primary-foreground">{formatNaira(stats.todayProfit)}</p>
            </div>
            <div className="w-px bg-primary-foreground/20" />
            <div>
              <p className="text-primary-foreground/50 text-xs">Expenses</p>
              <p className="text-sm font-semibold text-primary-foreground">{formatNaira(stats.todayExpenses)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 animate-fade-in">
        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map(({ label, icon: Icon, color, to }) => (
              <button
                key={label}
                onClick={() => navigate(to)}
                className="flex flex-col items-center gap-2 p-3 bg-card rounded-2xl border border-border shadow-card active:scale-95 transition-all duration-150"
              >
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-foreground text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-4">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Payment Breakdown
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Cash", amount: stats.cashSales, icon: "💵" },
              { label: "Transfer", amount: stats.transferSales, icon: "📱" },
              { label: "POS", amount: stats.posSales, icon: "💳" },
              { label: "Credit", amount: stats.creditSales, icon: "📋" },
            ].map(({ label, amount, icon }) => (
              <div key={label} className="bg-muted/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span>{icon}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <p className="text-sm font-bold text-foreground">{formatNaira(amount)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Summary */}
        <button
          onClick={() => navigate("/sales")}
          className="w-full bg-card rounded-2xl border border-border shadow-card p-4 text-left active:scale-95 transition-transform"
        >
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            Today's Deliveries
            <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-warning/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-warning">{stats.pendingDeliveryCount}</p>
              <p className="text-xs text-warning/80 font-medium">Pending</p>
            </div>
            <div className="bg-accent/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-accent">{stats.deliveredCount}</p>
              <p className="text-xs text-accent/80 font-medium">Delivered</p>
            </div>
          </div>
        </button>

        {/* Manufacturing Widget */}
        {isManufacturer && (
          <div className="bg-card rounded-2xl border border-border shadow-card p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Factory className="w-4 h-4 text-primary" />
              Today's Production
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Produced", value: mfgStats.todayProduced, icon: "🏭" },
                { label: "Packaged", value: mfgStats.todayPackaged, icon: "📦" },
                { label: "Unpackaged", value: mfgStats.todayUnpackaged, icon: "📋" },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-muted/50 rounded-xl p-3 text-center">
                  <span className="text-lg">{icon}</span>
                  <p className="text-lg font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {mfgStats.lowRawMaterialCount > 0 && (
                <button
                  onClick={() => navigate("/raw-materials")}
                  className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-xl p-3 active:scale-95 transition-transform"
                >
                  <Boxes className="w-4 h-4 text-warning flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-warning">{mfgStats.lowRawMaterialCount} Low</p>
                    <p className="text-xs text-warning/70">Raw Materials</p>
                  </div>
                </button>
              )}
              {mfgStats.activeOrderCount > 0 && (
                <button
                  onClick={() => navigate("/production-orders")}
                  className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-xl p-3 active:scale-95 transition-transform"
                >
                  <ClipboardList className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-primary">{mfgStats.activeOrderCount} Active</p>
                    <p className="text-xs text-primary/70">Prod. Orders</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Alerts row */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/customers")}
            className="bg-card rounded-2xl border border-border shadow-card p-4 text-left active:scale-95 transition-transform"
          >
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-destructive" />
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Total Debtors</p>
            <p className="text-base font-bold text-destructive mt-0.5">{formatNaira(stats.totalDebtors)}</p>
          </button>

          <button
            onClick={() => navigate("/suppliers")}
            className="bg-card rounded-2xl border border-border shadow-card p-4 text-left active:scale-95 transition-transform"
          >
            <div className="flex items-center justify-between mb-2">
              <Truck className="w-5 h-5 text-warning" />
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Total Payables</p>
            <p className="text-base font-bold text-warning mt-0.5">{formatNaira(stats.totalPayables)}</p>
          </button>
        </div>

        {/* Low stock alert */}
        {stats.lowStockCount > 0 && (
          <button
            onClick={() => navigate("/inventory")}
            className="w-full flex items-center gap-3 bg-warning/10 border border-warning/30 rounded-2xl p-4 active:scale-95 transition-transform"
          >
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-warning">{stats.lowStockCount} Low Stock Item{stats.lowStockCount > 1 ? "s" : ""}</p>
              <p className="text-xs text-warning/70">Tap to review inventory</p>
            </div>
            <ArrowRight className="w-4 h-4 text-warning" />
          </button>
        )}

        {/* FAB - New Sale */}
        <button
          onClick={() => navigate("/sales/new")}
          className="w-full flex items-center justify-center gap-2 h-14 bg-primary text-primary-foreground rounded-2xl shadow-primary-btn font-semibold text-base active:scale-95 transition-all duration-150"
        >
          <Plus className="w-5 h-5" />
          New Sale
        </button>
      </div>
    </div>
  );
}
