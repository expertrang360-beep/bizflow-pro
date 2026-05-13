import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira, DEFAULT_BRANCH_ID } from "@/lib/bizkit";
import { ArrowLeft, Plus, Trash2, Search, Check, User, Download, Share2, UserPlus, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { downloadReceipt, shareReceipt, type ReceiptData } from "@/lib/receipt-pdf";
import EmptyDataPrompt from "@/components/EmptyDataPrompt";
import QuickAddContact from "@/components/QuickAddContact";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  sell_price: number;
  cost_price: number;
  stock_qty: number;
  unit: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface CartItem {
  product: Product;
  qty: number;
  price: number;
  discount: number;
}

type PaymentType = "cash" | "transfer" | "pos" | "credit";

export default function NewSalePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProducts, setShowProducts] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomers, setShowCustomers] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<ReceiptData | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showCustomerPrompt, setShowCustomerPrompt] = useState(false);
  const [walkInConfirmed, setWalkInConfirmed] = useState(false);
  const [businessName, setBusinessName] = useState<string>("BizKit Store");

  useEffect(() => {
    supabase.from("products").select("*").eq("active", true).then(({ data }) => setProducts((data as Product[]) || []));
    supabase.from("customers").select("id, name, phone").then(({ data }) => setCustomers((data as Customer[]) || []));
    supabase.from("organizations").select("name").maybeSingle().then(({ data }) => {
      if (data?.name) setBusinessName(data.name);
    });
  }, []);

  const filteredProducts = products.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const filteredCustomers = customers.filter(c =>
    !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch))
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1, price: product.sell_price, discount: 0 }];
    });
    setProductSearch("");
    setShowProducts(false);
  };

  const updateCart = (id: string, field: "qty" | "price" | "discount", value: number) => {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, [field]: value } : i));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.product.id !== id));
  };

  const subtotal = cart.reduce((s, i) => s + (i.price * i.qty - i.discount), 0);
  const total = subtotal - discount + tax;

  const handleSave = async () => {
    if (cart.length === 0) {
      toast({ variant: "destructive", title: "Cart is empty", description: "Add at least one product." });
      return;
    }
    if (paymentType === "credit" && !selectedCustomer) {
      toast({ variant: "destructive", title: "Customer required", description: "Select a customer for credit sales." });
      return;
    }

    setSaving(true);
    try {
      const saleStatus = paymentType === "credit" ? "credit" : "completed";

      const { data: sale, error: saleError } = await supabase.from("sales").insert({
        branch_id: DEFAULT_BRANCH_ID,
        customer_id: selectedCustomer?.id || null,
        subtotal,
        discount,
        tax,
        total,
        payment_type: paymentType,
        status: saleStatus as "completed" | "credit" | "partial" | "cancelled",
        amount_paid: paymentType === "credit" ? 0 : total,
        note: note || null,
        created_by: user?.id,
      }).select().single();
      if (saleError) throw saleError;

      // Insert sale items
      const items = cart.map(i => ({
        sale_id: sale.id,
        product_id: i.product.id,
        product_name: i.product.name,
        qty: i.qty,
        price: i.price,
        cost_at_time: i.product.cost_price,
        discount: i.discount,
        total: i.price * i.qty - i.discount,
      }));
      await supabase.from("sale_items").insert(items);

      // Deduct stock atomically
      for (const item of cart) {
        const { error: stockErr } = await supabase.rpc("update_stock_atomic", {
          p_product_id: item.product.id,
          p_quantity_delta: -item.qty,
        });
        if (stockErr) throw new Error(`Stock update failed for ${item.product.name}: ${stockErr.message}`);
        await supabase.from("inventory_movements").insert({
          product_id: item.product.id,
          type: "sale",
          qty: -item.qty,
          ref_type: "sale",
          ref_id: sale.id,
          user_id: user?.id,
        });
      }

      // Cashbook entry (only if not credit)
      if (paymentType !== "credit") {
        await supabase.from("cashbook_entries").insert({
          branch_id: DEFAULT_BRANCH_ID,
          direction: "in",
          amount: total,
          source_type: "sale",
          source_id: sale.id,
          description: `Sale #${sale.id.slice(0, 8)}`,
          created_by: user?.id,
        });
      }

      // Update customer credit atomically
      if (paymentType === "credit" && selectedCustomer) {
        const { error: creditErr } = await supabase.rpc("update_customer_credit_atomic", {
          p_customer_id: selectedCustomer.id,
          p_credit_delta: total,
        });
        if (creditErr) throw new Error(`Credit update failed: ${creditErr.message}`);
      }

      const receiptData: ReceiptData = {
        saleId: sale.id,
        date: new Date(sale.created_at).toLocaleString("en-NG"),
        items: items.map(i => ({ product_name: i.product_name, qty: i.qty, price: i.price, discount: i.discount, total: i.total })),
        subtotal,
        discount,
        tax,
        total,
        amountPaid: paymentType === "credit" ? 0 : total,
        paymentType,
        status: saleStatus,
        customerName: selectedCustomer?.name,
        note: note || undefined,
      };
      setCompletedReceipt(receiptData);
      toast({ title: "Sale recorded! 🎉", description: `${formatNaira(total)} — ${paymentType.toUpperCase()}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save sale";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setSaving(false);
    }
  };

  const payTypes: { key: PaymentType; label: string; icon: string }[] = [
    { key: "cash", label: "Cash", icon: "💵" },
    { key: "transfer", label: "Transfer", icon: "📱" },
    { key: "pos", label: "POS", icon: "💳" },
    { key: "credit", label: "Credit", icon: "📋" },
  ];

  if (completedReceipt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
        <div className="w-20 h-20 bg-[hsl(var(--success-light))] rounded-full flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-[hsl(var(--success))]" />
        </div>
        <h2 className="text-2xl font-bold mb-1">Sale Complete!</h2>
        <p className="text-muted-foreground text-sm mb-6">{formatNaira(completedReceipt.total)} — {completedReceipt.paymentType.toUpperCase()}</p>

        <div className="flex gap-3 w-full max-w-xs mb-4">
          <Button
            onClick={() => downloadReceipt(completedReceipt)}
            variant="outline"
            className="flex-1 h-12 gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
          <Button
            onClick={() => shareReceipt(completedReceipt)}
            className="flex-1 h-12 gap-2 bg-primary text-primary-foreground"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={() => navigate("/sales")}
          className="text-muted-foreground"
        >
          Back to Sales
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">New Sale</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Product Search */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products to add..."
              value={productSearch}
              onChange={(e) => { setProductSearch(e.target.value); setShowProducts(true); }}
              onFocus={() => setShowProducts(true)}
              className="pl-9 h-11 bg-muted/50 border-0"
            />
          </div>
          {showProducts && productSearch && (
            <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-card-hover mt-1 max-h-64 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No products found</p>
              ) : (
                filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border last:border-0"
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">Stock: {p.stock_qty} {p.unit || ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{formatNaira(p.sell_price)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-sm">Cart ({cart.length} item{cart.length > 1 ? "s" : ""})</h2>
            </div>
            {cart.map(item => (
              <div key={item.product.id} className="px-4 py-3 border-b border-border last:border-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{formatNaira(item.price)} each</p>
                  </div>
                  <button onClick={() => removeFromCart(item.product.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-muted rounded-lg">
                    <button
                      onClick={() => item.qty > 1 ? updateCart(item.product.id, "qty", item.qty - 1) : removeFromCart(item.product.id)}
                      className="w-8 h-8 flex items-center justify-center text-lg font-bold text-foreground"
                    >-</button>
                    <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                    <button
                      onClick={() => updateCart(item.product.id, "qty", item.qty + 1)}
                      className="w-8 h-8 flex items-center justify-center text-lg font-bold text-primary"
                    >+</button>
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateCart(item.product.id, "price", Number(e.target.value))}
                      className="h-8 text-sm"
                      placeholder="Price"
                    />
                  </div>
                  <p className="text-sm font-bold text-primary w-20 text-right">
                    {formatNaira(item.price * item.qty - item.discount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty cart message */}
        {cart.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Search and add products above</p>
          </div>
        )}

        {/* Totals */}
        {cart.length > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-card p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatNaira(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Discount (₦)</span>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="h-8 w-28 text-right text-sm"
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Tax (₦)</span>
              <Input
                type="number"
                value={tax}
                onChange={(e) => setTax(Number(e.target.value))}
                className="h-8 w-28 text-right text-sm"
              />
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-bold">Total</span>
              <span className="font-bold text-xl text-primary">{formatNaira(total)}</span>
            </div>
          </div>
        )}

        {/* Payment Type */}
        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <Label className="text-sm font-semibold mb-3 block">Payment Type</Label>
          <div className="grid grid-cols-4 gap-2">
            {payTypes.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setPaymentType(key)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  paymentType === key ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                }`}
              >
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-medium">{label}</span>
                {paymentType === key && <Check className="w-3 h-3 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Customer (required for credit) */}
        {(paymentType === "credit" || selectedCustomer) && (
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <Label className="text-sm font-semibold mb-2 block">
              Customer {paymentType === "credit" && <span className="text-destructive">*</span>}
            </Label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selectedCustomer.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-xs text-destructive">Remove</button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search customer..."
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomers(true); }}
                  onFocus={() => setShowCustomers(true)}
                  className="pl-9 h-10"
                />
                {showCustomers && customerSearch && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-card-hover mt-1 max-h-48 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); setShowCustomers(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b border-border last:border-0 text-sm"
                      >
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Note */}
        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <Label className="text-sm font-semibold mb-2 block">Note (optional)</Label>
          <Input
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-10"
          />
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving || cart.length === 0}
          className="w-full h-14 bg-primary text-primary-foreground font-bold text-base shadow-primary-btn rounded-2xl"
        >
          {saving ? "Saving..." : `Save Sale — ${formatNaira(total)}`}
        </Button>
      </div>
    </div>
  );
}
