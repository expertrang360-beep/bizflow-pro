import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_BRANCH_ID } from "@/lib/bizkit";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Food & Beverages", "Electronics", "Clothing", "Health & Beauty", "Stationery", "Hardware", "Others"];
const UNITS = ["piece", "kg", "g", "litre", "ml", "pack", "carton", "dozen", "bag", "roll"];

export default function NewProductPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", sku: "", category: "", unit: "piece",
    cost_price: "", sell_price: "", stock_qty: "", reorder_level: "",
  });
  const [saving, setSaving] = useState(false);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.sell_price) {
      toast({ variant: "destructive", title: "Missing fields", description: "Name and selling price are required." });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("products").insert({
        branch_id: DEFAULT_BRANCH_ID,
        name: form.name,
        sku: form.sku || null,
        category: form.category || null,
        unit: form.unit,
        cost_price: Number(form.cost_price) || 0,
        sell_price: Number(form.sell_price),
        stock_qty: Number(form.stock_qty) || 0,
        reorder_level: Number(form.reorder_level) || 0,
        active: true,
      });
      if (error) throw error;
      toast({ title: "Product added! ✅" });
      navigate("/inventory");
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSaving(false);
    }
  };

  const margin = form.sell_price && form.cost_price
    ? ((Number(form.sell_price) - Number(form.cost_price)) / Number(form.sell_price) * 100).toFixed(1)
    : null;

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Add Product</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Product Info</h2>
          <Field label="Product Name *" value={form.name} onChange={v => update("name", v)} placeholder="e.g. Indomie Noodles" />
          <Field label="SKU / Barcode" value={form.sku} onChange={v => update("sku", v)} placeholder="e.g. NDL-001" />
          <div>
            <Label className="text-sm font-medium mb-2 block">Category</Label>
            <select
              value={form.category}
              onChange={e => update("category", e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            >
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Unit of Measure</Label>
            <select
              value={form.unit}
              onChange={e => update("unit", e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            >
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pricing</h2>
          <Field label="Cost Price (₦)" value={form.cost_price} onChange={v => update("cost_price", v)} placeholder="0.00" type="number" />
          <Field label="Selling Price (₦) *" value={form.sell_price} onChange={v => update("sell_price", v)} placeholder="0.00" type="number" />
          {margin && (
            <div className="bg-accent/10 rounded-lg px-3 py-2">
              <p className="text-sm text-accent font-medium">Profit Margin: {margin}%</p>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Stock</h2>
          <Field label="Opening Stock Quantity" value={form.stock_qty} onChange={v => update("stock_qty", v)} placeholder="0" type="number" />
          <Field label="Reorder Level (Low stock alert)" value={form.reorder_level} onChange={v => update("reorder_level", v)} placeholder="0" type="number" />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14 bg-primary text-primary-foreground font-bold text-base shadow-primary-btn rounded-2xl"
        >
          {saving ? "Saving..." : "Add Product"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <Label className="text-sm font-medium mb-1.5 block">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10"
      />
    </div>
  );
}
