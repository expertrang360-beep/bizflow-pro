import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart2,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "owner" | "manager" | "cashier" | "accountant";

const navItems: { to: string; icon: typeof LayoutDashboard; label: string; roles?: AppRole[] }[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/sales", icon: ShoppingCart, label: "Sales" },
  { to: "/inventory", icon: Package, label: "Inventory" },
  { to: "/reports", icon: BarChart2, label: "Reports", roles: ["owner", "manager", "accountant"] },
  { to: "/more", icon: MoreHorizontal, label: "More" },
];

export default function BottomNav() {
  const location = useLocation();
  const { hasAnyRole, roles } = useAuth();

  const visibleItems = navItems.filter(
    (item) => !item.roles || roles.length === 0 || hasAnyRole(item.roles)
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-[4.25rem] max-w-lg mx-auto">
        {visibleItems.map(({ to, icon: Icon, label }) => {
          const isActive =
            to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 relative"
            >
              <div
                className={`flex flex-col items-center gap-0.5 transition-all duration-200 ${
                  isActive ? "scale-105" : "scale-100"
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-colors duration-200 ${
                    isActive
                      ? "bg-primary/10"
                      : "bg-transparent"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                <span
                  className={`text-2xs font-medium transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
