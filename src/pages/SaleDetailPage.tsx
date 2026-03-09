import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, formatDateTime } from "@/lib/bizkit";
import { downloadReceipt, shareReceipt, type ReceiptData } from "@/lib/receipt-pdf";
import { ArrowLeft, Download, Share2, Truck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SaleDetail {
  id: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  amount_paid: number;
  payment_type: string;
  status: string;
  note: string | null;
  created_at: string;
  delivered: boolean;
  delivered_at: string | null;
  customers: { name: string } | null;
}

interface SaleItem {
  product_name: string;
  qty: number;
  price: number;
  discount: number;
  total: number;
}

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasAnyRole } = useAuth();
  const { toast } = useToast();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState(false);

  const canDeliver = hasAnyRole(["owner", "manager", "cashier"]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("sales").select("*, customers(name)").eq("id", id).single(),
      supabase.from("sale_items").select("product_name, qty, price, discount, total").eq("sale_id", id),
    ]).then(([{ data: s }, { data: i }]) => {
      setSale(s as SaleDetail | null);
      setItems((i as SaleItem[]) || []);
      setLoading(false);
    });
  }, [id]);

  const handleMarkDelivered = async () => {
    if (!sale || !id) return;
    setDelivering(true);
    try {
      const { error } = await supabase
        .from("sales")
        .update({ delivered: true, delivered_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      setSale({ ...sale, delivered: true, delivered_at: new Date().toISOString() });
      toast({ title: "Marked as delivered 🚚", description: "Products have left the warehouse" });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setDelivering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full gap-4">
        <p className="text-muted-foreground">Sale not found</p>
        <Button variant="outline" onClick={() => navigate("/sales")}>Back to Sales</Button>
      </div>
    );
  }

  const receiptData: ReceiptData = {
    saleId: sale.id,
    date: new Date(sale.created_at).toLocaleString("en-NG"),
    items,
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    total: sale.total,
    amountPaid: sale.amount_paid,
    paymentType: sale.payment_type,
    status: sale.status,
    customerName: sale.customers?.name,
    note: sale.note || undefined,
  };

  const statusColors: Record<string, string> = {
    completed: "badge-success",
    credit: "badge-danger",
    partial: "badge-warning",
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/sales")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Sale #{sale.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-xs text-muted-foreground">{formatDateTime(sale.created_at)}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${statusColors[sale.status] || "bg-muted text-muted-foreground"}`}>
            {sale.status}
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Delivery Status */}
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${sale.delivered ? "bg-[hsl(var(--success-light))] border-[hsl(var(--success))]/30" : "bg-warning/10 border-warning/30"}`}>
          <Truck className={`w-5 h-5 flex-shrink-0 ${sale.delivered ? "text-[hsl(var(--success))]" : "text-warning"}`} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${sale.delivered ? "text-[hsl(var(--success))]" : "text-warning"}`}>
              {sale.delivered ? "Delivered" : "Pending Delivery"}
            </p>
            {sale.delivered && sale.delivered_at && (
              <p className="text-xs text-muted-foreground">{formatDateTime(sale.delivered_at)}</p>
            )}
          </div>
          {!sale.delivered && canDeliver && sale.status !== "cancelled" && (
            <Button
              size="sm"
              onClick={handleMarkDelivered}
              disabled={delivering}
              className="gap-1"
            >
              <Check className="w-3 h-3" />
              {delivering ? "..." : "Deliver"}
            </Button>
          )}
        </div>

        {/* Items */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">Items ({items.length})</h2>
          </div>
          {items.map((item, i) => (
            <div key={i} className="px-4 py-3 border-b border-border last:border-0 flex justify-between">
              <div>
                <p className="text-sm font-medium">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">{item.qty} × {formatNaira(item.price)}</p>
              </div>
              <p className="text-sm font-bold text-primary">{formatNaira(item.total)}</p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="bg-card rounded-xl border border-border shadow-card p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatNaira(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span>-{formatNaira(sale.discount)}</span>
            </div>
          )}
          {sale.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatNaira(sale.tax)}</span>
            </div>
          )}
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-bold">Total</span>
            <span className="font-bold text-xl text-primary">{formatNaira(sale.total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Paid</span>
            <span>{formatNaira(sale.amount_paid)}</span>
          </div>
          {sale.total - sale.amount_paid > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance</span>
              <span className="amount-negative">{formatNaira(sale.total - sale.amount_paid)}</span>
            </div>
          )}
        </div>

        {sale.note && (
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Note</p>
            <p className="text-sm">{sale.note}</p>
          </div>
        )}

        {/* Receipt actions */}
        <div className="flex gap-3">
          <Button onClick={() => downloadReceipt(receiptData)} variant="outline" className="flex-1 h-12 gap-2">
            <Download className="w-4 h-4" />
            Download Receipt
          </Button>
          <Button onClick={() => shareReceipt(receiptData)} className="flex-1 h-12 gap-2 bg-primary text-primary-foreground">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
