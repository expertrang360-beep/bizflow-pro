import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Settings, Building2, Globe, Plus, Pencil, Trash2, Image, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const currencies = [
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
];

function useSetting(key: string) {
  return useQuery({
    queryKey: ["app-setting", key],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      return data?.value || null;
    },
  });
}

function useUpsertSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      // Try update first, then insert
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert({ key, value });
        if (error) throw error;
      }
    },
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: ["app-setting", key] });
      toast({ title: "Setting saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = hasRole("owner");

  // Settings
  const { data: businessName } = useSetting("business_name");
  const { data: businessLogo } = useSetting("business_logo");
  const { data: currencyCode } = useSetting("currency");
  const { data: businessType } = useSetting("business_type");
  const upsertSetting = useUpsertSetting();

  const [nameInput, setNameInput] = useState("");
  const [logoInput, setLogoInput] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("NGN");
  const [selectedBusinessType, setSelectedBusinessType] = useState("trader");

  // Branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [editingBranch, setEditingBranch] = useState<string | null>(null);

  // Sync state when data loads
  useEffect(() => { if (businessName) setNameInput(businessName); }, [businessName]);
  useEffect(() => { if (businessLogo) setLogoInput(businessLogo); }, [businessLogo]);
  useEffect(() => { if (currencyCode) setSelectedCurrency(currencyCode); }, [currencyCode]);
  useEffect(() => { if (businessType) setSelectedBusinessType(businessType); }, [businessType]);

  const saveBranchMutation = useMutation({
    mutationFn: async () => {
      if (editingBranch) {
        const { error } = await supabase.from("branches").update({ name: branchName, address: branchAddress || null }).eq("id", editingBranch);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("branches").insert({ name: branchName, address: branchAddress || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingBranch ? "Branch updated" : "Branch created" });
      setBranchDialogOpen(false);
      setBranchName("");
      setBranchAddress("");
      setEditingBranch(null);
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Branch deleted" });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openEditBranch = (branch: { id: string; name: string; address: string | null }) => {
    setEditingBranch(branch.id);
    setBranchName(branch.name);
    setBranchAddress(branch.address || "");
    setBranchDialogOpen(true);
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="gradient-hero px-5 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/more")} className="text-primary-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-primary-foreground">Settings</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-5 animate-fade-in">
        {/* Business Identity */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-3">Business Identity</h2>
          <div className="bg-card rounded-2xl border border-border shadow-card p-4 space-y-4">
            <div>
              <Label>Business Name</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. BizKit Stores"
                  disabled={!isOwner}
                />
                {isOwner && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => upsertSetting.mutate({ key: "business_name", value: nameInput })}
                    disabled={!nameInput || upsertSetting.isPending}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label>Logo URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={logoInput}
                  onChange={(e) => setLogoInput(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  disabled={!isOwner}
                />
                {isOwner && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => upsertSetting.mutate({ key: "business_logo", value: logoInput })}
                    disabled={upsertSetting.isPending}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {logoInput && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center">
                    <img src={logoInput} alt="Logo preview" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                  <span className="text-xs text-muted-foreground">Logo preview</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Currency */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-3">Currency</h2>
          <div className="bg-card rounded-2xl border border-border shadow-card p-4">
            <Label>Default Currency</Label>
            <div className="flex gap-2 mt-1">
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency} disabled={!isOwner}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} — {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isOwner && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => upsertSetting.mutate({ key: "currency", value: selectedCurrency })}
                  disabled={upsertSetting.isPending}
                >
                  <Save className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Business Type */}
        {isOwner && (
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-3">Business Type</h2>
            <div className="bg-card rounded-2xl border border-border shadow-card p-4">
              <Label>Select your business model</Label>
              <p className="text-xs text-muted-foreground mb-2">Manufacturers get extra modules: Raw Materials, BOM, Production Orders & Cost Tracking</p>
              <div className="flex gap-2 mt-1">
                <Select value={selectedBusinessType} onValueChange={setSelectedBusinessType}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trader">Trader / E-Commerce</SelectItem>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => upsertSetting.mutate({ key: "business_type", value: selectedBusinessType })}
                  disabled={upsertSetting.isPending}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Branches */}
        {isOwner && (
          <section>
            <div className="flex items-center justify-between px-1 mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Branches</h2>
              <Dialog open={branchDialogOpen} onOpenChange={(o) => { setBranchDialogOpen(o); if (!o) { setEditingBranch(null); setBranchName(""); setBranchAddress(""); } }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingBranch ? "Edit Branch" : "New Branch"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label>Branch Name</Label>
                      <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="e.g. Main Store" />
                    </div>
                    <div>
                      <Label>Address (optional)</Label>
                      <Input value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} placeholder="e.g. 12 Marina, Lagos" />
                    </div>
                    <Button className="w-full" onClick={() => saveBranchMutation.mutate()} disabled={!branchName || saveBranchMutation.isPending}>
                      {saveBranchMutation.isPending ? "Saving..." : editingBranch ? "Update Branch" : "Create Branch"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
              {branchesLoading ? (
                <div className="p-4 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ) : branches.length === 0 ? (
                <div className="p-6 text-center">
                  <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No branches yet</p>
                </div>
              ) : (
                branches.map((branch, i) => (
                  <div key={branch.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                    <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{branch.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{branch.address || "No address"}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditBranch(branch)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => { if (confirm("Delete this branch?")) deleteBranchMutation.mutate(branch.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
