import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_BRANCH_ID, todayStr } from "@/lib/bizkit";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const ASSET_CATEGORIES = [
  "Equipment", "Vehicle", "Furniture", "Electronics", "Building",
  "Machinery", "Tools", "Office Supplies", "Other"
];

export default function NewAssetPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", category: "Equipment", description: "",
    purchase_date: todayStr(), purchase_cost: "", salvage_value: "0",
    useful_life_months: "60", depreciation_method: "straight_line" as "straight_line" | "declining_balance",
    location: "", serial_number: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name || !form.purchase_cost) {
      toast({ variant: "destructive", title: "Missing fields", description: "Name and purchase cost are required." });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("assets").insert({
        branch_id: DEFAULT_BRANCH_ID,
        name: form.name,
        category: form.category,
        description: form.description || null,
        purchase_date: form.purchase_date,
        purchase_cost: Number(form.purchase_cost),
        salvage_value: Number(form.salvage_value),
        useful_life_months: Number(form.useful_life_months),
        depreciation_method: form.depreciation_method,
        location: form.location || null,
        serial_number: form.serial_number || null,
        created_by: user?.id,
      });
      if (error) throw error;

      // Audit log
      await supabase.from("audit_logs").insert({
        action: "create", entity: "asset", user_id: user?.id,
        after_json: { name: form.name, cost: form.purchase_cost },
      });

      toast({ title: "Asset registered! ✅" });
      navigate("/assets");
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Register Asset</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Asset Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Generator" className="h-11" />
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Category</Label>
            <select value={form.category} onChange={e => set("category", e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
              {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Description</Label>
            <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional details" className="h-10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Purchase Cost (₦) *</Label>
              <Input type="number" value={form.purchase_cost} onChange={e => set("purchase_cost", e.target.value)} placeholder="0" className="h-11 font-bold" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Salvage Value (₦)</Label>
              <Input type="number" value={form.salvage_value} onChange={e => set("salvage_value", e.target.value)} className="h-10" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Purchase Date</Label>
              <Input type="date" value={form.purchase_date} onChange={e => set("purchase_date", e.target.value)} className="h-10" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Useful Life (months)</Label>
              <Input type="number" value={form.useful_life_months} onChange={e => set("useful_life_months", e.target.value)} className="h-10" />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Depreciation Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {([["straight_line", "Straight Line"], ["declining_balance", "Declining Balance"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => set("depreciation_method", key)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.depreciation_method === key ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Location</Label>
              <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Office" className="h-10" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Serial No.</Label>
              <Input value={form.serial_number} onChange={e => set("serial_number", e.target.value)} placeholder="Optional" className="h-10" />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full h-14 font-bold text-base rounded-2xl">
          {saving ? "Saving..." : "Register Asset"}
        </Button>
      </div>
    </div>
  );
}
