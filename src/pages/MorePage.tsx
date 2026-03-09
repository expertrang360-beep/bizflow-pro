import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessType } from "@/hooks/useBusinessType";
import { TrendingDown, Users, Truck, BookOpen, Settings, LogOut, ChevronRight, Briefcase, Building2, Receipt, DollarSign, FileText, UsersRound, Package, FileStack, Factory, Calculator, ClipboardList } from "lucide-react";

type AppRole = "owner" | "manager" | "cashier" | "accountant";

interface MenuItem {
  label: string;
  icon: typeof TrendingDown;
  to: string;
  color: string;
  bg: string;
  roles?: AppRole[];
  manufacturerOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { label: "Expenses", icon: TrendingDown, to: "/expenses", color: "text-destructive", bg: "bg-destructive/10", roles: ["owner", "manager", "accountant"] },
  { label: "Customers & Debts", icon: Users, to: "/customers", color: "text-primary", bg: "bg-primary/10" },
  { label: "Suppliers", icon: Truck, to: "/suppliers", color: "text-warning", bg: "bg-warning/10", roles: ["owner", "manager", "accountant"] },
  { label: "Purchases", icon: BookOpen, to: "/purchases", color: "text-accent", bg: "bg-accent/10", roles: ["owner", "manager", "accountant"] },
  { label: "Assets", icon: Building2, to: "/assets", color: "text-primary", bg: "bg-primary/10", roles: ["owner", "manager"] },
  { label: "Tax Management", icon: Receipt, to: "/tax", color: "text-warning", bg: "bg-warning/10", roles: ["owner", "manager", "accountant"] },
  { label: "Payroll", icon: DollarSign, to: "/payroll", color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success-light))]", roles: ["owner"] },
  { label: "Profit & Loss", icon: FileText, to: "/profit-loss", color: "text-primary", bg: "bg-primary/10", roles: ["owner", "manager", "accountant"] },
  { label: "Team", icon: UsersRound, to: "/team", color: "text-accent", bg: "bg-accent/10", roles: ["owner", "manager"] },
  // Manufacturing modules
  { label: "Raw Materials", icon: Package, to: "/raw-materials", color: "text-warning", bg: "bg-warning/10", roles: ["owner", "manager"], manufacturerOnly: true },
  { label: "Bill of Materials", icon: FileStack, to: "/bom", color: "text-primary", bg: "bg-primary/10", roles: ["owner", "manager"], manufacturerOnly: true },
  { label: "Production Orders", icon: Factory, to: "/production-orders", color: "text-accent", bg: "bg-accent/10", roles: ["owner", "manager"], manufacturerOnly: true },
  { label: "Production Costs", icon: Calculator, to: "/production-costs", color: "text-destructive", bg: "bg-destructive/10", roles: ["owner", "manager"], manufacturerOnly: true },
];

export default function MorePage() {
  const navigate = useNavigate();
  const { user, signOut, hasAnyRole, roles } = useAuth();
  const { isManufacturer } = useBusinessType();

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.manufacturerOnly && !isManufacturer) return false;
    return !item.roles || roles.length === 0 || hasAnyRole(item.roles);
  });

  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "User";

  return (
    <div className="flex flex-col min-h-full">
      <div className="gradient-hero px-5 pt-12 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg">
            {userName[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-primary-foreground font-semibold">{userName}</p>
            <p className="text-primary-foreground/60 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3 animate-fade-in">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Modules</h2>
        <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          {visibleMenuItems.map(({ label, icon: Icon, to, color, bg }, i) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={`w-full flex items-center gap-3 px-4 py-4 active:bg-muted transition-colors ${i > 0 ? "border-t border-border" : ""}`}
            >
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <span className="flex-1 text-sm font-medium text-left">{label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 pt-2">Account</h2>
        <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          <button
            onClick={() => navigate("/settings")}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-muted transition-colors"
          >
            <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="flex-1 text-sm font-medium text-left">Settings</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-muted transition-colors text-destructive border-t border-border"
          >
            <div className="w-9 h-9 bg-destructive/10 rounded-xl flex items-center justify-center">
              <LogOut className="w-4 h-4 text-destructive" />
            </div>
            <span className="flex-1 text-sm font-medium text-left text-destructive">Sign Out</span>
          </button>
        </div>

        <div className="text-center pt-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Briefcase className="w-4 h-4" />
            <span className="text-sm font-semibold">BizKit</span>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Nigerian SME Business Suite v1.0</p>
        </div>
      </div>
    </div>
  );
}
