import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import SalesPage from "@/pages/SalesPage";
import NewSalePage from "@/pages/NewSalePage";
import SaleDetailPage from "@/pages/SaleDetailPage";
import InventoryPage from "@/pages/InventoryPage";
import NewProductPage from "@/pages/NewProductPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import ReportsPage from "@/pages/ReportsPage";
import MorePage from "@/pages/MorePage";
import ExpensesPage from "@/pages/ExpensesPage";
import NewExpensePage from "@/pages/NewExpensePage";
import CustomersPage from "@/pages/CustomersPage";
import CustomerDetailPage from "@/pages/CustomerDetailPage";
import SuppliersPage from "@/pages/SuppliersPage";
import PurchasesPage from "@/pages/PurchasesPage";
import NewPurchasePage from "@/pages/NewPurchasePage";
import NotFound from "@/pages/NotFound";
import AssetsPage from "@/pages/AssetsPage";
import NewAssetPage from "@/pages/NewAssetPage";
import TaxPage from "@/pages/TaxPage";
import PayrollPage from "@/pages/PayrollPage";
import ProfitLossPage from "@/pages/ProfitLossPage";
import TeamPage from "@/pages/TeamPage";
import SettingsPage from "@/pages/SettingsPage";
import RawMaterialsPage from "@/pages/RawMaterialsPage";
import BOMPage from "@/pages/BOMPage";
import ProductionOrdersPage from "@/pages/ProductionOrdersPage";
import ProductionCostsPage from "@/pages/ProductionCostsPage";
import ProductionCostDetailPage from "@/pages/ProductionCostDetailPage";
import DailyProductionPage from "@/pages/DailyProductionPage";
import AdvisorPage from "@/pages/AdvisorPage";
import SubscriptionPage from "@/pages/SubscriptionPage";
import AdminLicensesPage from "@/pages/AdminLicensesPage";
import PaymentPage from "@/pages/PaymentPage";
import OnboardingPage from "@/pages/OnboardingPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import FeatureGate from "@/components/FeatureGate";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function AppRoutes() {
  const { session, loading, hasRole, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (!session || !user || !hasRole("owner")) {
      setOnboardingChecked(true);
      return;
    }
    if (location.pathname === "/onboarding") {
      setOnboardingChecked(true);
      return;
    }
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "onboarding_completed")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value !== "true") {
          navigate("/onboarding", { replace: true });
        }
        setOnboardingChecked(true);
      });
  }, [session, user, hasRole, location.pathname, navigate]);

  if (loading || (session && !onboardingChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center animate-pulse">
            <span className="text-primary-foreground font-bold text-xl">B</span>
          </div>
          <p className="text-muted-foreground text-sm">Loading BizKit...</p>
        </div>
      </div>
    );
  }

  if (!session) return <AuthPage />;

  if (location.pathname === "/onboarding") {
    return <OnboardingPage />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/sales/new" element={<NewSalePage />} />
        <Route path="/sales/:id" element={<SaleDetailPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/new" element={
          <ProtectedRoute allowedRoles={["owner", "manager"]}>
            <NewProductPage />
          </ProtectedRoute>
        } />
        <Route path="/inventory/:id" element={
          <ProtectedRoute allowedRoles={["owner", "manager"]}>
            <ProductDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={["owner", "manager", "accountant"]}>
            <ReportsPage />
          </ProtectedRoute>
        } />
        <Route path="/more" element={<MorePage />} />
        <Route path="/expenses" element={
          <ProtectedRoute allowedRoles={["owner", "manager", "accountant"]}>
            <ExpensesPage />
          </ProtectedRoute>
        } />
        <Route path="/expenses/new" element={
          <ProtectedRoute allowedRoles={["owner", "manager", "accountant"]}>
            <NewExpensePage />
          </ProtectedRoute>
        } />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/suppliers" element={
          <ProtectedRoute allowedRoles={["owner", "manager", "accountant"]}>
            <SuppliersPage />
          </ProtectedRoute>
        } />
        <Route path="/purchases" element={
          <ProtectedRoute allowedRoles={["owner", "manager", "accountant"]}>
            <PurchasesPage />
          </ProtectedRoute>
        } />
        <Route path="/purchases/new" element={
          <ProtectedRoute allowedRoles={["owner", "manager", "accountant"]}>
            <NewPurchasePage />
          </ProtectedRoute>
        } />
        <Route path="/assets" element={
          <ProtectedRoute allowedRoles={["owner", "manager"]}>
            <AssetsPage />
          </ProtectedRoute>
        } />
        <Route path="/assets/new" element={
          <ProtectedRoute allowedRoles={["owner", "manager"]}>
            <NewAssetPage />
          </ProtectedRoute>
        } />
        <Route path="/tax" element={
          <ProtectedRoute allowedRoles={["owner", "manager", "accountant"]}>
            <TaxPage />
          </ProtectedRoute>
        } />
        <Route path="/profit-loss" element={
          <ProtectedRoute allowedRoles={["owner", "manager", "accountant"]}>
            <ProfitLossPage />
          </ProtectedRoute>
        } />
        <Route path="/team" element={
          <ProtectedRoute allowedRoles={["owner", "manager"]}>
            <TeamPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/raw-materials" element={
          <ProtectedRoute allowedRoles={["owner", "manager"]}>
            <RawMaterialsPage />
          </ProtectedRoute>
        } />
        <Route path="/bom" element={
          <ProtectedRoute allowedRoles={["owner", "manager"]}>
            <BOMPage />
          </ProtectedRoute>
        } />
        <Route path="/production-orders" element={
          <ProtectedRoute allowedRoles={["owner", "manager"]}>
            <ProductionOrdersPage />
          </ProtectedRoute>
        } />
        <Route path="/production-costs" element={
          <ProtectedRoute allowedRoles={["owner", "manager"]}>
            <ProductionCostsPage />
          </ProtectedRoute>
        } />
        <Route path="/production-costs/:id" element={
          <ProtectedRoute allowedRoles={["owner", "manager"]}>
            <ProductionCostDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/daily-production" element={<DailyProductionPage />} />
        <Route path="/advisor" element={
          <ProtectedRoute allowedRoles={["owner", "manager"]}>
            <FeatureGate feature="ai_advisor">
              <AdvisorPage />
            </FeatureGate>
          </ProtectedRoute>
        } />
        <Route path="/payroll" element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <FeatureGate feature="payroll">
              <PayrollPage />
            </FeatureGate>
          </ProtectedRoute>
        } />
        <Route path="/subscription" element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <SubscriptionPage />
          </ProtectedRoute>
        } />
        <Route path="/pay/:planId" element={
          <ProtectedRoute allowedRoles={["owner"]}>
            <PaymentPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/licenses" element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <AdminLicensesPage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
