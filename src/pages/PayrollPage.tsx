import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, formatDate } from "@/lib/bizkit";
import { ArrowLeft, Plus, Users, UserPlus, Banknote, CreditCard, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_BRANCH_ID } from "@/lib/bizkit";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StaffSalary {
  id: string;
  staff_name: string;
  role: string | null;
  base_salary: number;
  bank_name: string | null;
  account_number: string | null;
  active: boolean;
}

interface PayrollRun {
  id: string;
  pay_period: string;
  period_start: string;
  period_end: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  status: string;
  payment_method: string;
  paid_date: string | null;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  draft: "badge-warning",
  approved: "badge-info",
  paid: "badge-success",
};

const statusIcons: Record<string, typeof Clock> = {
  draft: Clock,
  approved: AlertCircle,
  paid: CheckCircle2,
};

export default function PayrollPage() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const isOwner = hasRole("owner");
  const [activeTab, setActiveTab] = useState("staff");
  const [staff, setStaff] = useState<StaffSalary[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffDialog, setStaffDialog] = useState(false);
  const [runDialog, setRunDialog] = useState(false);
  const [payDialog, setPayDialog] = useState<PayrollRun | null>(null);
  const [saving, setSaving] = useState(false);

  const [staffForm, setStaffForm] = useState({ staff_name: "", role: "", base_salary: "", bank_name: "", account_number: "" });
  const [runForm, setRunForm] = useState({ pay_period: "", period_start: "", period_end: "", payment_method: "cash" as string });

  const fetchData = async () => {
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("staff_salaries").select("*").order("staff_name"),
      supabase.from("payroll_runs").select("*").order("period_end", { ascending: false }),
    ]);
    setStaff((s as StaffSalary[]) || []);
    setRuns((r as PayrollRun[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddStaff = async () => {
    if (!staffForm.staff_name || !staffForm.base_salary) {
      toast({ variant: "destructive", title: "Name and salary required" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("staff_salaries").insert({
        branch_id: DEFAULT_BRANCH_ID,
        staff_name: staffForm.staff_name,
        role: staffForm.role || null,
        base_salary: Number(staffForm.base_salary),
        bank_name: staffForm.bank_name || null,
        account_number: staffForm.account_number || null,
      });
      if (error) throw error;
      toast({ title: "Staff added! ✅" });
      setStaffDialog(false);
      setStaffForm({ staff_name: "", role: "", base_salary: "", bank_name: "", account_number: "" });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally { setSaving(false); }
  };

  const handleRunPayroll = async () => {
    if (!runForm.pay_period || !runForm.period_start || !runForm.period_end) {
      toast({ variant: "destructive", title: "All fields required" });
      return;
    }
    const activeStaff = staff.filter(s => s.active);
    if (activeStaff.length === 0) {
      toast({ variant: "destructive", title: "No active staff", description: "Add staff members first" });
      return;
    }

    // Validate bank details for bank transfer
    if (runForm.payment_method === "bank_transfer") {
      const missingBank = activeStaff.filter(s => !s.bank_name || !s.account_number);
      if (missingBank.length > 0) {
        toast({
          variant: "destructive",
          title: "Missing bank details",
          description: `${missingBank.map(s => s.staff_name).join(", ")} need bank details for transfers`,
        });
        return;
      }
    }

    setSaving(true);
    try {
      let totalGross = 0, totalDeductions = 0, totalNet = 0;
      const items = activeStaff.map(s => {
        const paye = s.base_salary * 0.07;
        const pension = s.base_salary * 0.08;
        const net = s.base_salary - paye - pension;
        totalGross += s.base_salary;
        totalDeductions += paye + pension;
        totalNet += net;
        return { staff_salary_id: s.id, staff_name: s.staff_name, base_salary: s.base_salary, allowances: 0, paye_tax: paye, pension, other_deductions: 0, net_pay: net };
      });

      const { data: run, error } = await supabase.from("payroll_runs").insert({
        branch_id: DEFAULT_BRANCH_ID,
        pay_period: runForm.pay_period,
        period_start: runForm.period_start,
        period_end: runForm.period_end,
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet,
        payment_method: runForm.payment_method,
        created_by: user?.id,
      } as any).select().single();
      if (error) throw error;

      const { error: itemsError } = await supabase.from("payroll_items").insert(
        items.map(i => ({ ...i, payroll_run_id: run.id }))
      );
      if (itemsError) throw itemsError;

      toast({ title: "Payroll run created! ✅" });
      setRunDialog(false);
      setRunForm({ pay_period: "", period_start: "", period_end: "", payment_method: "cash" });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally { setSaving(false); }
  };

  const handleApprove = async (run: PayrollRun) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("payroll_runs")
        .update({ status: "approved", approved_by: user?.id } as any)
        .eq("id", run.id);
      if (error) throw error;
      toast({ title: "Payroll approved ✅" });
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally { setSaving(false); }
  };

  const handlePayCash = async (run: PayrollRun) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("payroll_runs")
        .update({ status: "paid", paid_date: new Date().toISOString().split("T")[0] } as any)
        .eq("id", run.id);
      if (error) throw error;
      toast({ title: "Payroll marked as paid (Cash) ✅" });
      setPayDialog(null);
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Failed" });
    } finally { setSaving(false); }
  };

  const handlePayPaystack = async (run: PayrollRun) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("payroll-paystack-transfer", {
        body: { payroll_run_id: run.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Bank transfers initiated! 🏦", description: "Paystack is processing the transfers" });
      setPayDialog(null);
      fetchData();
    } catch (err) {
      toast({ variant: "destructive", title: "Transfer failed", description: err instanceof Error ? err.message : "Failed" });
    } finally { setSaving(false); }
  };

  const totalMonthly = staff.filter(s => s.active).reduce((s, st) => s + st.base_salary, 0);

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-card border-b border-border px-4 pt-12 pb-4 sticky top-0 z-30">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">Payroll</h1>
          {activeTab === "staff" ? (
            <Dialog open={staffDialog} onOpenChange={setStaffDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 h-9 px-3"><UserPlus className="w-4 h-4" /> Add Staff</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div><Label className="text-sm mb-1.5 block">Name *</Label>
                    <Input value={staffForm.staff_name} onChange={e => setStaffForm(f => ({ ...f, staff_name: e.target.value }))} className="h-10" /></div>
                  <div><Label className="text-sm mb-1.5 block">Role</Label>
                    <Input value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Sales Rep" className="h-10" /></div>
                  <div><Label className="text-sm mb-1.5 block">Monthly Salary (₦) *</Label>
                    <Input type="number" value={staffForm.base_salary} onChange={e => setStaffForm(f => ({ ...f, base_salary: e.target.value }))} className="h-11 font-bold" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-sm mb-1.5 block">Bank Name</Label>
                      <Input value={staffForm.bank_name} onChange={e => setStaffForm(f => ({ ...f, bank_name: e.target.value }))} className="h-10" /></div>
                    <div><Label className="text-sm mb-1.5 block">Account No.</Label>
                      <Input value={staffForm.account_number} onChange={e => setStaffForm(f => ({ ...f, account_number: e.target.value }))} className="h-10" /></div>
                  </div>
                  <Button onClick={handleAddStaff} disabled={saving} className="w-full h-12 font-bold rounded-2xl">
                    {saving ? "Saving..." : "Add Staff"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={runDialog} onOpenChange={setRunDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 h-9 px-3"><Plus className="w-4 h-4" /> Run Payroll</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Run Payroll</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div><Label className="text-sm mb-1.5 block">Pay Period Label *</Label>
                    <Input value={runForm.pay_period} onChange={e => setRunForm(f => ({ ...f, pay_period: e.target.value }))} placeholder="e.g. March 2026" className="h-10" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-sm mb-1.5 block">Start Date *</Label>
                      <Input type="date" value={runForm.period_start} onChange={e => setRunForm(f => ({ ...f, period_start: e.target.value }))} className="h-10" /></div>
                    <div><Label className="text-sm mb-1.5 block">End Date *</Label>
                      <Input type="date" value={runForm.period_end} onChange={e => setRunForm(f => ({ ...f, period_end: e.target.value }))} className="h-10" /></div>
                  </div>

                  <div>
                    <Label className="text-sm mb-1.5 block">Payment Method</Label>
                    <Select value={runForm.payment_method} onValueChange={v => setRunForm(f => ({ ...f, payment_method: v }))}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">
                          <span className="flex items-center gap-2"><Banknote className="w-4 h-4" /> Cash</span>
                        </SelectItem>
                        <SelectItem value="bank_transfer">
                          <span className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Bank Transfer (Paystack)</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-muted rounded-xl p-3 text-sm">
                    <p>Active staff: <strong>{staff.filter(s => s.active).length}</strong></p>
                    <p>Estimated gross: <strong>{formatNaira(totalMonthly)}</strong></p>
                    <p className="text-xs text-muted-foreground mt-1">PAYE (7%) and Pension (8%) will be auto-calculated</p>
                    {runForm.payment_method === "bank_transfer" && (
                      <p className="text-xs text-primary mt-1 font-medium">💳 Paystack will transfer to employee bank accounts</p>
                    )}
                  </div>
                  <Button onClick={handleRunPayroll} disabled={saving} className="w-full h-12 font-bold rounded-2xl">
                    {saving ? "Processing..." : "Run Payroll"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="mt-3 bg-primary/10 rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">Monthly Payroll Cost</p>
          <p className="text-2xl font-bold">{formatNaira(totalMonthly)}</p>
          <p className="text-xs text-muted-foreground">{staff.filter(s => s.active).length} active staff</p>
        </div>
      </div>

      <div className="px-4 pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="staff" className="flex-1">Staff</TabsTrigger>
            <TabsTrigger value="runs" className="flex-1">Payroll Runs</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 px-4 py-3">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : activeTab === "staff" ? (
          staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="font-semibold">No staff registered</p>
              <p className="text-sm text-muted-foreground mb-4">Add staff members to manage payroll</p>
            </div>
          ) : (
            <div className="space-y-2 animate-fade-in">
              {staff.map(s => (
                <div key={s.id} className="bg-card rounded-xl border border-border shadow-card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold">
                    {s.staff_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{s.staff_name}</p>
                      <p className="font-bold text-sm">{formatNaira(s.base_salary)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.role || "Staff"} {!s.active && "• Inactive"}
                      {s.bank_name && ` • ${s.bank_name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="font-semibold">No payroll runs yet</p>
              <p className="text-sm text-muted-foreground mb-4">Run your first payroll to get started</p>
            </div>
          ) : (
            <div className="space-y-2 animate-fade-in">
              {runs.map(r => {
                const StatusIcon = statusIcons[r.status] || Clock;
                return (
                  <div key={r.id} className="bg-card rounded-xl border border-border shadow-card p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{r.pay_period}</p>
                        {r.payment_method === "bank_transfer" ? (
                          <CreditCard className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Banknote className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <Badge variant="outline" className={`text-2xs ${statusStyles[r.status] || ""}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {r.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(r.period_start)} — {formatDate(r.period_end)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Gross</p>
                        <p className="text-sm font-medium">{formatNaira(r.total_gross)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Deductions</p>
                        <p className="text-sm font-medium text-destructive">-{formatNaira(r.total_deductions)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Net Pay</p>
                        <p className="text-sm font-bold">{formatNaira(r.total_net)}</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {isOwner && r.status === "draft" && (
                      <Button
                        size="sm"
                        className="w-full mt-3 h-9 gap-1.5 rounded-xl"
                        onClick={() => handleApprove(r)}
                        disabled={saving}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve Payroll
                      </Button>
                    )}

                    {isOwner && r.status === "approved" && (
                      <Button
                        size="sm"
                        className="w-full mt-3 h-9 gap-1.5 rounded-xl"
                        variant={r.payment_method === "bank_transfer" ? "default" : "outline"}
                        onClick={() => setPayDialog(r)}
                        disabled={saving}
                      >
                        {r.payment_method === "bank_transfer" ? (
                          <><CreditCard className="w-4 h-4" /> Pay via Paystack</>
                        ) : (
                          <><Banknote className="w-4 h-4" /> Mark as Paid (Cash)</>
                        )}
                      </Button>
                    )}

                    {r.status === "paid" && r.paid_date && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[hsl(var(--success))]" />
                        Paid on {formatDate(r.paid_date)}
                        {r.payment_method === "bank_transfer" && " via Paystack"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Payment confirmation dialog */}
      <Dialog open={!!payDialog} onOpenChange={open => !open && setPayDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {payDialog?.payment_method === "bank_transfer" ? "Confirm Bank Transfer" : "Confirm Cash Payment"}
            </DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4 pt-2">
              <div className="bg-muted rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-medium">{payDialog.pay_period}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Net Amount</span>
                  <span className="font-bold text-lg">{formatNaira(payDialog.total_net)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium flex items-center gap-1">
                    {payDialog.payment_method === "bank_transfer" ? (
                      <><CreditCard className="w-3.5 h-3.5" /> Bank Transfer</>
                    ) : (
                      <><Banknote className="w-3.5 h-3.5" /> Cash</>
                    )}
                  </span>
                </div>
              </div>

              {payDialog.payment_method === "bank_transfer" && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-primary">
                  <p className="font-semibold mb-1">💳 Paystack Transfer</p>
                  <p>Funds will be sent directly to each employee's bank account. Ensure your Paystack balance is sufficient.</p>
                </div>
              )}

              <Button
                className="w-full h-12 font-bold rounded-2xl gap-2"
                onClick={() => payDialog.payment_method === "bank_transfer"
                  ? handlePayPaystack(payDialog)
                  : handlePayCash(payDialog)
                }
                disabled={saving}
              >
                {saving ? "Processing..." : payDialog.payment_method === "bank_transfer" ? (
                  <><CreditCard className="w-4 h-4" /> Initiate Transfer</>
                ) : (
                  <><Banknote className="w-4 h-4" /> Confirm Cash Payment</>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
