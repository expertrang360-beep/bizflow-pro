import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira, DEFAULT_BRANCH_ID } from "@/lib/bizkit";
import { ArrowLeft, Plus, Trash2, Search, Check, Truck, UserPlus, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import EmptyDataPrompt from "@/components/EmptyDataPrompt";
import QuickAddContact from "@/components/QuickAddContact";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  cost_price: number;
  stock_qty: number;
  unit: string | null;
}

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
}

interface PurchaseItem {
  product: Product;
  qty: number;
  cost_price: number;
}

type PaymentStatus = "paid" | "partial" | "unpaid";

export default function NewPurchasePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProducts, setShowProducts] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSuppliers, setShowSuppliers] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");
  const [paidAmount, setPaidAmount] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  useEffect(() => {
    supabase.from("products").select("id, name, sku, cost_price, stock_qty, unit").eq("active", true).then(({ data }) => setProducts((data as Product[]) || []));
    supabase.from("suppliers").select("id, name, phone").then(({ data }) => setSuppliers((data as Supplier[]) || []));
  }, []);

  const filteredProducts = products.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const filteredSuppliers = suppliers.filter(s =>
    !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()) || (s.phone && s.phone.includes(supplierSearch))
  );

  const addItem = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1, cost_price: product.cost_price }];
    });
    setProductSearch("");
    setShowProducts(false);
  };

  const updateItem = (id: string, field: "qty" | "cost_price", value: number) => {
    setItems(prev => prev.map(i => i.product.id === id ? { ...i, [field]: value } : i));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.product.id !== id));
  };

  const total = items.reduce((s, i) => s + i.cost_price * i.qty, 0);

  // Auto-set paidAmount when status changes
  useEffect(() => {
    if (paymentStatus === "paid") setPaidAmount(total);
    else if (paymentStatus === "unpaid") setPaidAmount(0);
  }, [paymentStatus, total]);

  const handleSave = async () => {
    if (items.length === 0) {
      toast({ variant: "destructive", title: "No items", description: "Add at least one product." });
      return;
    }
    if (!selectedSupplier) {
      toast({ variant: "destructive", title: "Supplier required", description: "Select a supplier for this purchase." });
      return;
    }
    if (paymentStatus === "partial" && (paidAmount <= 0 || paidAmount >= total)) {
      toast({ variant: "destructive", title: "Invalid partial amount", description: "Paid amount must be between 0 and the total." });
      return;
    }

    setSaving(true);
    try {
      const { data: purchase, error } = await supabase.from("purchases").insert({
        branch_id: DEFAULT_BRANCH_ID,
        supplier_id: selectedSupplier.id,
        total,
        paid_amount: paidAmount,
        status: paymentStatus as "paid" | "partial" | "unpaid",
        note: note || null,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;

      // Insert purchase items
      const purchaseItems = items.map(i => ({
        purchase_id: purchase.id,
        product_id: i.product.id,
        product_name: i.product.name,
        qty: i.qty,
        cost_price: i.cost_price,
        total: i.cost_price * i.qty,
      }));
      await supabase.from("purchase_items").insert(purchaseItems);

      // Increase stock atomically + inventory movements
      for (const item of items) {
        const { error: stockErr } = await supabase.rpc("update_stock_atomic", {
          p_product_id: item.product.id,
          p_quantity_delta: item.qty,
        });
        if (stockErr) throw new Error(`Stock update failed for ${item.product.name}: ${stockErr.message}`);
        await supabase.from("inventory_movements").insert({
          product_id: item.product.id,
          type: "purchase",
          qty: item.qty,
          ref_type: "purchase",
          ref_id: purchase.id,
          user_id: user?.id,
        });
      }

      // Cashbook entry (only if paid or partial)
      if (paidAmount > 0) {
        await supabase.from("cashbook_entries").insert({
          branch_id: DEFAULT_BRANCH_ID,
          direction: "out",
          amount: paidAmount,
          source_type: "purchase",
          source_id: purchase.id,
          description: `Purchase from ${selectedSupplier.name}`,
          created_by: user?.id,
        });
      }

      // Update supplier payable atomically if not fully paid
      if (paymentStatus !== "paid") {
        const balance = total - paidAmount;
        const { error: payableErr } = await supabase.rpc("update_supplier_payable_atomic", {
          p_supplier_id: selectedSupplier.id,
          p_payable_delta: balance,
        });
        if (payableErr) throw new Error(`Supplier payable update failed: ${payableErr.message}`);
      }

      toast({ title: "Purchase recorded! 📦", description: `${formatNaira(total)} from ${selectedSupplier.name}` });
      navigate("/purchases");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save purchase";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setSaving(false);
    }
  };

  const statuses: { key: PaymentStatus; label: string; icon: string }[] = [
    { key: "paid", label: "Paid", icon: "✅" },
    { key: "partial", label: "Partial", icon: "⚡" },
    { key: "unpaid", label: "Unpaid", icon: "📋" },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">New Purchase</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Empty data prompts */}
        {suppliers.length === 0 && (
          <EmptyDataPrompt
            icon={<UserPlus className="w-6 h-6" />}
            title="No suppliers yet"
            description="Add a supplier so you can record where this stock came from."
            primaryLabel="Add supplier"
            onPrimary={() => setShowAddSupplier(true)}
          />
        )}
        {products.length === 0 && (
          <EmptyDataPrompt
            icon={<PackagePlus className="w-6 h-6" />}
            title="No products yet"
            description="Create a product before recording a restock purchase."
            primaryLabel="Add product"
            onPrimary={() => navigate("/products/new")}
          />
        )}

        {/* Supplier Selection */}
        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">
              Supplier <span className="text-destructive">*</span>
            </Label>
            <button
              type="button"
              onClick={() => setShowAddSupplier(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add new
            </button>
          </div>
          {selectedSupplier ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-warning/10 rounded-full flex items-center justify-center">
                  <Truck className="w-4 h-4 text-[hsl(var(--warning))]" />
                </div>
                <div>
                  <p className="text-sm font-medium">{selectedSupplier.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedSupplier.phone || "No phone"}</p>
                </div>
              </div>
              <button onClick={() => setSelectedSupplier(null)} className="text-xs text-destructive">Change</button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={suppliers.length === 0 ? "No suppliers yet — tap 'Add new'" : "Search supplier..."}
                value={supplierSearch}
                onChange={e => { setSupplierSearch(e.target.value); setShowSuppliers(true); }}
                onFocus={() => setShowSuppliers(true)}
                className="pl-9 h-10"
                disabled={suppliers.length === 0}
              />
              {showSuppliers && supplierSearch && filteredSuppliers.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-card-hover mt-1 max-h-48 overflow-y-auto">
                  {filteredSuppliers.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedSupplier(s); setSupplierSearch(""); setShowSuppliers(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b border-border last:border-0 text-sm"
                    >
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.phone}</p>
                    </button>
                  ))}
                </div>
              )}
              {showSuppliers && supplierSearch && filteredSuppliers.length === 0 && suppliers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddSupplier(true)}
                  className="mt-2 w-full text-left px-3 py-2 rounded-lg border border-dashed border-primary/40 text-sm text-primary hover:bg-primary/5"
                >
                  + Add "{supplierSearch}" as new supplier
                </button>
              )}
            </div>
          )}
        </div>

        {/* Product Search */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products to add..."
              value={productSearch}
              onChange={e => { setProductSearch(e.target.value); setShowProducts(true); }}
              onFocus={() => setShowProducts(true)}
              className="pl-9 h-11 bg-muted/50 border-0"
            />
          </div>
          {showProducts && productSearch && (
            <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-card-hover mt-1 max-h-64 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No products found</p>
              ) : filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => addItem(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border last:border-0"
                >
                  <div className="text-left">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Stock: {p.stock_qty} {p.unit || ""}</p>
                  </div>
                  <p className="text-sm font-bold text-primary">{formatNaira(p.cost_price)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-sm">Items ({items.length})</h2>
            </div>
            {items.map(item => (
              <div key={item.product.id} className="px-4 py-3 border-b border-border last:border-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{formatNaira(item.cost_price)} each</p>
                  </div>
                  <button onClick={() => removeItem(item.product.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-muted rounded-lg">
                    <button
                      onClick={() => item.qty > 1 ? updateItem(item.product.id, "qty", item.qty - 1) : removeItem(item.product.id)}
                      className="w-8 h-8 flex items-center justify-center text-lg font-bold text-foreground"
                    >-</button>
                    <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                    <button
                      onClick={() => updateItem(item.product.id, "qty", item.qty + 1)}
                      className="w-8 h-8 flex items-center justify-center text-lg font-bold text-primary"
                    >+</button>
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={item.cost_price}
                      onChange={e => updateItem(item.product.id, "cost_price", Number(e.target.value))}
                      className="h-8 text-sm"
                      placeholder="Cost price"
                    />
                  </div>
                  <p className="text-sm font-bold text-primary w-20 text-right">
                    {formatNaira(item.cost_price * item.qty)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Search and add products above</p>
          </div>
        )}

        {/* Total */}
        {items.length > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <div className="flex justify-between">
              <span className="font-bold">Total</span>
              <span className="font-bold text-xl text-primary">{formatNaira(total)}</span>
            </div>
          </div>
        )}

        {/* Payment Status */}
        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <Label className="text-sm font-semibold mb-3 block">Payment Status</Label>
          <div className="grid grid-cols-3 gap-2">
            {statuses.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setPaymentStatus(key)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  paymentStatus === key ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                }`}
              >
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-medium">{label}</span>
                {paymentStatus === key && <Check className="w-3 h-3 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Partial amount */}
        {paymentStatus === "partial" && (
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <Label className="text-sm font-semibold mb-2 block">Amount Paid (₦)</Label>
            <Input
              type="number"
              value={paidAmount}
              onChange={e => setPaidAmount(Number(e.target.value))}
              className="h-10"
              placeholder="Enter amount paid"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Balance: {formatNaira(Math.max(0, total - paidAmount))}
            </p>
          </div>
        )}

        {/* Note */}
        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <Label className="text-sm font-semibold mb-2 block">Note (optional)</Label>
          <Input placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} className="h-10" />
        </div>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={saving || items.length === 0}
          className="w-full h-14 bg-primary text-primary-foreground font-bold text-base shadow-primary-btn rounded-2xl"
        >
          {saving ? "Saving..." : `Save Purchase — ${formatNaira(total)}`}
        </Button>
      </div>

      <QuickAddContact
        open={showAddSupplier}
        onOpenChange={setShowAddSupplier}
        kind="supplier"
        initialName={supplierSearch}
        onAdded={(s) => {
          setSuppliers(prev => [...prev, s]);
          setSelectedSupplier(s);
          setSupplierSearch("");
          setShowSuppliers(false);
        }}
      />
    </div>
  );
}
