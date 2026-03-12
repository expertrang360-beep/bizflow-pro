import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Shield, UserPlus, Crown, Briefcase, Calculator, ShoppingCart, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type AppRole = "owner" | "manager" | "cashier" | "accountant";

const roleConfig: Record<AppRole, { label: string; icon: typeof Crown; color: string; bg: string }> = {
  owner: { label: "Owner", icon: Crown, color: "text-warning", bg: "bg-warning/10" },
  manager: { label: "Manager", icon: Briefcase, color: "text-primary", bg: "bg-primary/10" },
  accountant: { label: "Accountant", icon: Calculator, color: "text-accent", bg: "bg-accent/10" },
  cashier: { label: "Cashier", icon: ShoppingCart, color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success-light))]" },
};

interface TeamMember {
  id: string;
  name: string;
  phone: string | null;
  branch_id: string | null;
  roles: AppRole[];
}

export default function TeamPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = hasRole("owner");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("cashier");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("cashier");

  // Fetch all team members (profiles + roles)
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, name, phone, branch_id");
      if (pErr) throw pErr;

      const { data: allRoles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;

      const roleMap = new Map<string, AppRole[]>();
      allRoles?.forEach((r) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role as AppRole);
        roleMap.set(r.user_id, existing);
      });

      return (profiles || []).map((p) => ({
        ...p,
        roles: roleMap.get(p.id) || [],
      })) as TeamMember[];
    },
  });

  // Invite new user via edge function
  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("invite-team-member", {
        body: { name: inviteName, phone: invitePhone, email: inviteEmail, password: invitePassword, role: inviteRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Team member invited", description: `${inviteName} has been added as ${roleConfig[inviteRole].label}` });
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInvitePhone("");
      setInvitePassword("");
      setInviteRole("cashier");
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Add role to user
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role added" });
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Remove role from user
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role removed" });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Sort: owners first, then managers, then others
  const sortedMembers = [...members].sort((a, b) => {
    const priority = (roles: AppRole[]) => {
      if (roles.includes("owner")) return 0;
      if (roles.includes("manager")) return 1;
      return 2;
    };
    return priority(a.roles) - priority(b.roles);
  });

  return (
    <div className="flex flex-col min-h-full">
      <div className="gradient-hero px-5 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/more")} className="text-primary-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-primary-foreground">Team</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-primary-foreground">{members.length}</p>
            <p className="text-primary-foreground/60 text-xs">Team Members</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 animate-fade-in">
        {/* Invite button - owner only */}
        {isOwner && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2">
                <UserPlus className="w-4 h-4" />
                Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Full Name</Label>
                  <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. John Doe" />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="e.g. john@example.com" />
                </div>
                <div>
                  <Label>Phone Number (optional)</Label>
                  <Input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="e.g. 08012345678" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} placeholder="Set a password" />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => inviteMutation.mutate()}
                  disabled={!inviteName || !invitePhone || !invitePassword || inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Team list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
                <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : sortedMembers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No team members yet</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            {sortedMembers.map((member, i) => {
              const primaryRole = member.roles[0] as AppRole | undefined;
              const config = primaryRole ? roleConfig[primaryRole] : null;
              const RoleIcon = config?.icon || Shield;

              return (
                <div key={member.id} className={`px-4 py-4 ${i > 0 ? "border-t border-border" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${config?.bg || "bg-muted"} rounded-full flex items-center justify-center`}>
                      <span className={`font-bold text-sm ${config?.color || "text-muted-foreground"}`}>
                        {member.name[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.phone || "No phone"}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {member.roles.map((role) => {
                        const rc = roleConfig[role];
                        return (
                          <span key={role} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rc.bg} ${rc.color}`}>
                            {rc.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Role management for owners */}
                  {isOwner && !member.roles.includes("owner") && (
                    <div className="mt-3 flex items-center gap-2">
                      {editingUser === member.id ? (
                        <>
                          <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(["manager", "cashier", "accountant"] as AppRole[])
                                .filter((r) => !member.roles.includes(r))
                                .map((r) => (
                                  <SelectItem key={r} value={r}>{roleConfig[r].label}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => addRoleMutation.mutate({ userId: member.id, role: newRole })}>
                            Add
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingUser(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <div className="flex gap-2 w-full">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setEditingUser(member.id); setNewRole("cashier"); }}>
                            <Shield className="w-3 h-3" /> Edit Roles
                          </Button>
                          {member.roles.map((role) => (
                            <Button
                              key={role}
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive gap-1"
                              onClick={() => removeRoleMutation.mutate({ userId: member.id, role })}
                            >
                              <Trash2 className="w-3 h-3" /> {roleConfig[role].label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
