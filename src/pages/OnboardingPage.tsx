import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_BRANCH_ID, formatNaira } from "@/lib/bizkit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Rocket,
  Building2,
  Package,
  ShoppingCart,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import DeploymentChecklist from "@/components/DeploymentChecklist";

type Step = 0 | 1 | 2 | 3 | 4;

const STEPS = [
  { label: "Welcome", icon: Rocket },
  { label: "Business", icon: Building2 },
  { label: "Product", icon: Package },
  { label: "Sale", icon: ShoppingCart },
  { label: "Done", icon: CheckCircle2 },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, organizationId, organizationName, hasRole } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(0);
  const [saving, setSaving] = useState(false);

  // Business
  const [bizName, setBizName] = useState(organizationName || "");
  const [bizPhone, setBizPhone] = useState("");

  // Product
  const [productId, setProductId] = useState<string | null>(null);
  const [prod, setProd] = useState({
    name: "",
    sell_price: "",
    cost_price: "",
    stock_qty: "",
    unit: "piece",
  });

  // Sale
  const [saleQty, setSaleQty] = useState("1");

  useEffect(() => {
    if (organizationName && !bizName) setBizName(organizationName);
  }, [organizationName]);

  // Redirect non-owners away
  useEffect(() => {
    if (user && !hasRole("owner")) navigate("/", { replace: true });
  }, [user, hasRole, navigate]);

  const finish = async () => {
    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .eq("key", "onboarding_completed")
      .maybeSingle();
    if (existing) {
      await supabase
        .from("app_settings")
        .update({ value: "true", updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("app_settings")
        .insert({ key: "onboarding_completed", value: "true", organization_id: organizationId });
    }
    navigate("/", { replace: true });
  };

  const saveBusiness = async () => {
    if (!bizName.trim()) {
      toast({ variant: "destructive", title: "Business name required" });
      return;
    }
    setSaving(true);
    try {
      if (organizationId) {
        await supabase.from("organizations").update({ name: bizName.trim() }).eq("id", organizationId);
      }
      if (bizPhone.trim() && user) {
        await supabase.from("profiles").update({ phone: bizPhone.trim() }).eq("id", user.id);
      }
      setStep(2);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e instanceof Error ? e.message : "Failed" });
    } finally {
      setSaving(false);
    }
  };

  const saveProduct = async () => {
    if (!prod.name.trim() || !prod.sell_price) {
      toast({ variant: "destructive", title: "Product name & price required" });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .insert({
          branch_id: DEFAULT_BRANCH_ID,
          organization_id: organizationId,
          name: prod.name.trim(),
          sell_price: Number(prod.sell_price),
          cost_price: Number(prod.cost_price) || 0,
          stock_qty: Number(prod.stock_qty) || 0,
          unit: prod.unit,
          active: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      setProductId(data.id);
      toast({ title: "Product created ✅" });
      setStep(3);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e instanceof Error ? e.message : "Failed" });
    } finally {
      setSaving(false);
    }
  };

  const saveSale = async () => {
    if (!productId) return;
    const qty = Number(saleQty) || 1;
    const price = Number(prod.sell_price);
    const total = qty * price;
    setSaving(true);
    try {
      const { data: sale, error } = await supabase
        .from("sales")
        .insert({
          branch_id: DEFAULT_BRANCH_ID,
          organization_id: organizationId,
          total,
          amount_paid: total,
          payment_type: "cash",
          status: "completed",
          created_by: user?.id,
        })
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("sale_items").insert({
        sale_id: sale.id,
        product_id: productId,
        product_name: prod.name.trim(),
        qty,
        price,
        total,
        cost_at_time: Number(prod.cost_price) || 0,
      });

      await supabase.from("cashbook_entries").insert({
        branch_id: DEFAULT_BRANCH_ID,
        organization_id: organizationId,
        direction: "in",
        amount: total,
        source_type: "sale",
        source_id: sale.id,
        description: "First sale (onboarding)",
        created_by: user?.id,
      });

      toast({ title: "First sale recorded 🎉" });
      setStep(4);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e instanceof Error ? e.message : "Failed" });
    } finally {
      setSaving(false);
    }
  };

  const skipSale = () => setStep(4);

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">BizKit Setup</span>
          </div>
          <button
            onClick={finish}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip setup
          </button>
        </div>
        <Progress value={progress} className="h-1.5" />
        <div className="flex justify-between mt-2">
          {STEPS.map((s, i) => (
            <span
              key={s.label}
              className={`text-[10px] ${i <= step ? "text-primary font-medium" : "text-muted-foreground"}`}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        {step === 0 && (
          <div className="text-center space-y-6 pt-8">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-primary flex items-center justify-center shadow-primary-btn">
              <Rocket className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Welcome to BizKit!</h1>
              <p className="text-muted-foreground text-sm">
                Let's get your business set up in 3 quick steps. It takes less than a minute.
              </p>
            </div>
            <div className="space-y-3 text-left bg-card rounded-2xl border border-border p-4">
              {[
                { i: Building2, t: "Tell us about your business" },
                { i: Package, t: "Add your first product" },
                { i: ShoppingCart, t: "Record your first sale" },
              ].map(({ i: Icon, t }, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm">{t}</span>
                </div>
              ))}
            </div>
            <DeploymentChecklist />
            <Button
              onClick={() => setStep(1)}
              className="w-full h-14 rounded-2xl font-bold text-base shadow-primary-btn"
            >
              Get Started <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <Card title="Business Profile" desc="Used on receipts and reports.">
            <Field label="Business Name *" value={bizName} onChange={setBizName} placeholder="e.g. Mama Tunde Stores" />
            <Field label="Contact Phone" value={bizPhone} onChange={setBizPhone} placeholder="08012345678" type="tel" />
            <NavRow onBack={() => setStep(0)} onNext={saveBusiness} loading={saving} nextLabel="Continue" />
          </Card>
        )}

        {step === 2 && (
          <Card title="Add Your First Product" desc="You can add more anytime from Inventory.">
            <Field label="Product Name *" value={prod.name} onChange={(v) => setProd({ ...prod, name: v })} placeholder="e.g. Indomie Noodles" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cost Price (₦)" value={prod.cost_price} onChange={(v) => setProd({ ...prod, cost_price: v })} placeholder="0" type="number" />
              <Field label="Sell Price (₦) *" value={prod.sell_price} onChange={(v) => setProd({ ...prod, sell_price: v })} placeholder="0" type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Opening Stock" value={prod.stock_qty} onChange={(v) => setProd({ ...prod, stock_qty: v })} placeholder="0" type="number" />
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Unit</Label>
                <select
                  value={prod.unit}
                  onChange={(e) => setProd({ ...prod, unit: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                >
                  {["piece", "kg", "pack", "carton", "litre", "bag"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <NavRow onBack={() => setStep(1)} onNext={saveProduct} loading={saving} nextLabel="Create Product" />
          </Card>
        )}

        {step === 3 && (
          <Card title="Record Your First Sale" desc="Test the flow with the product you just created.">
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Product</p>
              <p className="font-semibold">{prod.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatNaira(Number(prod.sell_price) || 0)} / {prod.unit}
              </p>
            </div>
            <Field label="Quantity Sold" value={saleQty} onChange={setSaleQty} placeholder="1" type="number" />
            <div className="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-3">
              <span className="text-sm text-muted-foreground">Total (Cash)</span>
              <span className="text-lg font-bold text-primary">
                {formatNaira((Number(saleQty) || 0) * (Number(prod.sell_price) || 0))}
              </span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={skipSale} className="flex-1 h-12 rounded-xl">
                Skip
              </Button>
              <Button
                onClick={saveSale}
                disabled={saving}
                className="flex-1 h-12 rounded-xl font-bold shadow-primary-btn"
              >
                {saving ? "Saving..." : "Record Sale"}
              </Button>
            </div>
            <button
              onClick={() => setStep(2)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          </Card>
        )}

        {step === 4 && (
          <div className="text-center space-y-6 pt-8">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-accent flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-accent-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">You're all set! 🎉</h1>
              <p className="text-muted-foreground text-sm">
                Your business is ready. Explore the dashboard to track sales, manage inventory, and grow.
              </p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Next steps</p>
              <ul className="text-sm space-y-1.5 text-muted-foreground">
                <li>• Invite your team from the Team page</li>
                <li>• Add customers and suppliers</li>
                <li>• Set up your subscription plan</li>
              </ul>
            </div>
            <DeploymentChecklist defaultOpen />
            <Button
              onClick={finish}
              className="w-full h-14 rounded-2xl font-bold text-base shadow-primary-btn"
            >
              Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-sm">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-sm font-medium mb-1.5 block">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11"
      />
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  loading,
  nextLabel,
}: {
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
  nextLabel: string;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <Button variant="outline" onClick={onBack} className="h-12 rounded-xl px-4">
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <Button
        onClick={onNext}
        disabled={loading}
        className="flex-1 h-12 rounded-xl font-bold shadow-primary-btn"
      >
        {loading ? "Saving..." : nextLabel}
        {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
      </Button>
    </div>
  );
}
