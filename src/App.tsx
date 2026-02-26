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

const queryClient = new QueryClient();

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
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

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/sales/new" element={<NewSalePage />} />
        <Route path="/sales/:id" element={<SaleDetailPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/new" element={<NewProductPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/expenses/new" element={<NewExpensePage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/purchases/new" element={<NewPurchasePage />} />
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
