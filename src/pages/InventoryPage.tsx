import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, formatDate } from "@/lib/bizkit";
import { Plus, Search, Package, AlertCircle, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string | null;
  cost_price: number;
  sell_price: number;
  stock_qty: number;
  reorder_level: number | null;
  active: boolean;
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low">("all");

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").eq("active", true).order("name");
    setProducts((data as Product[]) || []);
    setLoading(false);
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q));
    const matchFilter = filter === "all" || (filter === "low" && p.stock_qty <= (p.reorder_level || 0));
    return matchSearch && matchFilter;
  });

  const lowStockCount = products.filter(p => p.stock_qty <= (p.reorder_level || 0)).length;

  const getStockStatus = (p: Product) => {
    if (p.stock_qty <= 0) return { label: "Out of Stock", cls: "badge-danger" };
    if (p.stock_qty <= (p.reorder_level || 0)) return { label: "Low Stock", cls: "badge-warning" };
    return { label: "In Stock", cls: "badge-success" };
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Inventory</h1>
          <Button size="sm" onClick={() => navigate("/inventory/new")} className="bg-primary text-primary-foreground gap-1 h-9 px-3">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-muted/50 border-0"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >All ({products.length})</button>
          <button
            onClick={() => setFilter("low")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === "low" ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"}`}
          >⚠️ Low Stock ({lowStockCount})</button>
        </div>
      </div>

      <div className="flex-1 px-4 py-3">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No products found</h3>
            <p className="text-muted-foreground text-sm mb-4">Add your first product to track inventory</p>
            <Button onClick={() => navigate("/inventory/new")} className="bg-primary text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {filtered.map(product => {
              const status = getStockStatus(product);
              const margin = product.sell_price > 0 ? ((product.sell_price - product.cost_price) / product.sell_price * 100).toFixed(0) : "0";
              return (
                <button
                  key={product.id}
                  onClick={() => navigate(`/inventory/${product.id}`)}
                  className="w-full bg-card rounded-xl border border-border shadow-card p-4 text-left active:scale-[0.98] transition-all duration-150 flex items-center gap-3"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-semibold text-sm truncate">{product.name}</p>
                      <p className="font-bold text-primary text-sm ml-2">{formatNaira(product.sell_price)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-2xs px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                      <span className="text-2xs text-muted-foreground">Qty: {product.stock_qty} {product.unit || ""}</span>
                      {product.category && <span className="text-2xs text-muted-foreground">• {product.category}</span>}
                      <span className="text-2xs text-accent">+{margin}% margin</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
