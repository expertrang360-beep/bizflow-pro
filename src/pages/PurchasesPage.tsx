import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, formatDateTime } from "@/lib/bizkit";
import { Plus, Search, ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface Purchase {
  id: string;
  total: number;
  paid_amount: number;
  status: string;
  created_at: string;
  note: string | null;
  suppliers: { name: string } | null;
}

const statusColors: Record<string, string> = {
  paid: "badge-success",
  partial: "badge-warning",
  unpaid: "badge-danger",
};

export default function PurchasesPage() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchPurchases(); }, [filter]);

  const fetchPurchases = async () => {
    setLoading(true);
    let query = supabase
      .from("purchases")
      .select("*, suppliers(name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter !== "all") query = query.eq("status", filter as "paid" | "partial" | "unpaid");

    const { data } = await query;
    setPurchases((data as Purchase[]) || []);
    setLoading(false);
  };

  const filtered = purchases.filter(p => {
    const q = search.toLowerCase();
    return !q || p.id.includes(q) || p.suppliers?.name?.toLowerCase().includes(q);
  });

  const filters = ["all", "paid", "partial", "unpaid"];

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Purchases</h1>
          <Button size="sm" onClick={() => navigate("/purchases/new")} className="bg-primary text-primary-foreground gap-1 h-9 px-3">
            <Plus className="w-4 h-4" />
            New Purchase
          </Button>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search purchases..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 bg-muted/50 border-0" />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-3">
        {loading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No purchases yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Record your first purchase to track restocking</p>
            <Button onClick={() => navigate("/purchases/new")} className="bg-primary text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              New Purchase
            </Button>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {filtered.map(purchase => (
              <div
                key={purchase.id}
                className="w-full bg-card rounded-xl border border-border shadow-card p-4 text-left flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-accent/30 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                  📦
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold text-sm">{purchase.suppliers?.name || "Unknown Supplier"}</p>
                    <p className="font-bold text-primary text-sm">{formatNaira(purchase.total)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xs px-2 py-0.5 rounded-full capitalize ${statusColors[purchase.status] || "bg-muted text-muted-foreground"}`}>
                      {purchase.status}
                    </span>
                    <span className="text-2xs text-muted-foreground">{formatDateTime(purchase.created_at)}</span>
                  </div>
                  {purchase.status !== "paid" && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Paid: {formatNaira(purchase.paid_amount)} / Balance: {formatNaira(purchase.total - purchase.paid_amount)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
