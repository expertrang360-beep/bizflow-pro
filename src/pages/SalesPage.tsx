import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, formatDateTime, DEFAULT_BRANCH_ID } from "@/lib/bizkit";
import { Plus, Search, Filter, ChevronRight, Check, Clock, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface Sale {
  id: string;
  total: number;
  payment_type: string;
  status: string;
  amount_paid: number;
  created_at: string;
  customer_id: string | null;
  delivered: boolean;
  customers?: { name: string } | null;
}

const statusColors: Record<string, string> = {
  completed: "badge-success",
  credit: "badge-danger",
  partial: "badge-warning",
  cancelled: "bg-muted text-muted-foreground",
};

const paymentIcons: Record<string, string> = {
  cash: "💵", transfer: "📱", pos: "💳", credit: "📋",
};

export default function SalesPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => { fetchSales(); }, [filter]);

  const fetchSales = async () => {
    setLoading(true);
    let query = supabase
      .from("sales")
      .select("*, customers(name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter !== "all") query = query.eq("payment_type", filter as "cash" | "transfer" | "pos" | "credit");

    const { data } = await query;
    setSales((data as Sale[]) || []);
    setLoading(false);
  };

  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    return !q || s.id.includes(q) || s.customers?.name?.toLowerCase().includes(q) || s.payment_type.includes(q);
  });

  const filters = ["all", "cash", "transfer", "pos", "credit"];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Sales</h1>
          <Button
            size="sm"
            onClick={() => navigate("/sales/new")}
            className="bg-primary text-primary-foreground gap-1 h-9 px-3"
          >
            <Plus className="w-4 h-4" />
            New Sale
          </Button>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search sales..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-muted/50 border-0"
          />
        </div>
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {f === "all" ? "All" : paymentIcons[f]} {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-3">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <ShoppingCartEmpty />
            </div>
            <h3 className="font-semibold text-lg mb-1">No sales yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Record your first sale to get started</p>
            <Button onClick={() => navigate("/sales/new")} className="bg-primary text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              New Sale
            </Button>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {filtered.map(sale => (
              <button
                key={sale.id}
                onClick={() => navigate(`/sales/${sale.id}`)}
                className="w-full bg-card rounded-xl border border-border shadow-card p-4 text-left active:scale-[0.98] transition-all duration-150 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                  {paymentIcons[sale.payment_type] || "🧾"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold text-sm">
                      {sale.customers?.name || "Walk-in Customer"}
                    </p>
                    <p className="font-bold text-primary text-sm">{formatNaira(sale.total)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xs px-2 py-0.5 rounded-full capitalize ${statusColors[sale.status] || "bg-muted text-muted-foreground"}`}>
                      {sale.status}
                    </span>
                    <span className="text-2xs text-muted-foreground">{formatDateTime(sale.created_at)}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShoppingCartEmpty() {
  return (
    <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}
