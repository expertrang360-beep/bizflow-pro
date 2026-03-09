import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/bizkit";
import { ArrowLeft, Edit2, Trash2, Package, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CATEGORIES = ["Food & Beverages", "Electronics", "Clothing", "Health & Beauty", "Stationery", "Hardware", "Others"];
const UNITS = ["piece", "kg", "g", "litre", "ml", "pack", "carton", "dozen", "bag", "roll"];

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

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "", sku: "", category: "", unit: "piece",
    cost_price: "", sell_price: "", stock_qty: "", reorder_level: "",
  });

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id!)
      .single();

    if (error || !data) {
      toast({ variant: "destructive", title: "Product not found" });
      navigate("/inventory");
      return;
    }

    const p = data as Product;
    setProduct(p);
    setForm({
      name: p.name,
      sku: p.sku || "",
      category: p.category || "",
      unit: p.unit || "piece",
      cost_price: String(p.cost_price),
      sell_price: String(p.sell_price),
      stock_qty: String(p.stock_qty),
      reorder_level: String(p.reorder_level || 0),
    });
    setLoading(false);
  };

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.sell_price) {
      toast({ variant: "destructive", title: "Missing fields", description: "Name and selling price are required." });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("products").update({
        name: form.name,
        sku: form.sku || null,
        category: form.category || null,
        unit: form.unit,
        cost_price: Number(form.cost_price) || 0,
        sell_price: Number(form.sell_price),
        stock_qty: Number(form.stock_qty) || 0,
        reorder_level: Number(form.reorder_level) || 0,
      }).eq("id", id!);

      if (error) throw error;
      toast({ title: "Product updated! ✅" });
      setEditing(false);
      fetchProduct();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed to update" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", id!);
      if (error) throw error;
      toast({ title: "Product deleted 🗑️" });
      navigate("/inventory");
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed to delete" });
    } finally {
      setDeleting(false);
    }
  };

  const margin = form.sell_price && form.cost_price
    ? ((Number(form.sell_price) - Number(form.cost_price)) / Number(form.sell_price) * 100).toFixed(1)
    : null;

  const getStockStatus = (p: Product) => {
    if (p.stock_qty <= 0) return { label: "Out of Stock", cls: "badge-danger" };
    if (p.stock_qty <= (p.reorder_level || 0)) return { label: "Low Stock", cls: "badge-warning" };
    return { label: "In Stock", cls: "badge-success" };
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <div className="bg-card border-b border-border px-4 pt-12 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="px-4 py-4 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!product) return null;

  const status = getStockStatus(product);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold truncate max-w-[200px]">{product.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); fetchProduct(); }}>
                  <X className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1">
                  <Edit2 className="w-4 h-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="gap-1">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{product.name}". This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
                        {deleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {!editing ? (
          /* View Mode */
          <>
            {/* Status Card */}
            <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Package className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">{product.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-2xs px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                  {product.sku && <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>}
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pricing</h2>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="Cost Price" value={formatNaira(product.cost_price)} />
                <InfoItem label="Selling Price" value={formatNaira(product.sell_price)} />
              </div>
              {margin && (
                <div className="bg-accent/10 rounded-lg px-3 py-2">
                  <p className="text-sm text-accent font-medium">Profit Margin: {margin}%</p>
                </div>
              )}
            </div>

            {/* Stock */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Stock</h2>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="Current Stock" value={`${product.stock_qty} ${product.unit || ""}`} />
                <InfoItem label="Reorder Level" value={String(product.reorder_level || 0)} />
              </div>
            </div>

            {/* Details */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Details</h2>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="Category" value={product.category || "—"} />
                <InfoItem label="Unit" value={product.unit || "piece"} />
              </div>
            </div>
          </>
        ) : (
          /* Edit Mode */
          <>
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
              <Field label="Stock Quantity" value={form.stock_qty} onChange={v => update("stock_qty", v)} placeholder="0" type="number" />
              <Field label="Reorder Level" value={form.reorder_level} onChange={v => update("reorder_level", v)} placeholder="0" type="number" />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-14 font-bold text-base shadow-primary-btn rounded-2xl"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <Label className="text-sm font-medium mb-1.5 block">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10" />
    </div>
  );
}
