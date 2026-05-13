import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_BRANCH_ID } from "@/lib/bizkit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Kind = "customer" | "supplier";

interface QuickAddContactProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: Kind;
  initialName?: string;
  onAdded: (record: { id: string; name: string; phone: string | null }) => void;
}

export default function QuickAddContact({ open, onOpenChange, kind, initialName, onAdded }: QuickAddContactProps) {
  const { toast } = useToast();
  const [name, setName] = useState(initialName || "");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const label = kind === "customer" ? "Customer" : "Supplier";
  const table = kind === "customer" ? "customers" : "suppliers";

  const reset = () => { setName(""); setPhone(""); };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ variant: "destructive", title: `${label} name is required` });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from(table)
        .insert({ branch_id: DEFAULT_BRANCH_ID, name: trimmed, phone: phone.trim() || null })
        .select("id, name, phone")
        .single();
      if (error) throw error;
      toast({ title: `${label} added` });
      onAdded(data as { id: string; name: string; phone: string | null });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast({ variant: "destructive", title: `Could not add ${label.toLowerCase()}`, description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add {label}</DialogTitle>
          <DialogDescription>Quickly add a new {label.toLowerCase()} without leaving this screen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="qa-name" className="text-sm">Name</Label>
            <Input id="qa-name" value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder={`${label} name`} autoFocus />
          </div>
          <div>
            <Label htmlFor="qa-phone" className="text-sm">Phone (optional)</Label>
            <Input id="qa-phone" value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} placeholder="080..." inputMode="tel" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="flex-1 bg-primary text-primary-foreground" disabled={saving} onClick={handleSave}>
              {saving ? "Adding…" : `Add ${label}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
