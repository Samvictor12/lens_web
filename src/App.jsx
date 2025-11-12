import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SaleOrders from "./pages/SaleOrders";
import CreateSaleOrder from "./pages/CreateSaleOrder";
import Customers from "./pages/Customer/CustomersMain";
import CustomerForm from "./pages/Customer/CustomerForm";
import Inventory from "./pages/Inventory";
import PurchaseOrders from "./pages/PurchaseOrders";
import Dispatch from "./pages/Dispatch";
import Billing from "./pages/Billing";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import VendorsOld from "./pages/Vendors";
import Vendors from "./pages/Vendor/VendorsMain";
import VendorForm from "./pages/Vendor/VendorForm";
import BusinessCategories from "./pages/BusinessCategory/BusinessCategories";
import BusinessCategoryForm from "./pages/BusinessCategory/BusinessCategoryForm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/sales/orders" element={<ProtectedRoute><SaleOrders /></ProtectedRoute>} />
      <Route path="/sales/orders/new" element={<ProtectedRoute><CreateSaleOrder /></ProtectedRoute>} />
      <Route path="/sales/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route path="/sales/customers/:mode" element={<ProtectedRoute><CustomerForm /></ProtectedRoute>} />
      <Route path="/sales/customers/:mode/:id" element={<ProtectedRoute><CustomerForm /></ProtectedRoute>} />
      <Route path="/inventory/stock" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/inventory/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
      <Route path="/dispatch" element={<ProtectedRoute><Dispatch /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
      <Route path="/accounts/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
      <Route path="/accounts/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/masters/vendors" element={<ProtectedRoute><Vendors /></ProtectedRoute>} />
      <Route path="/masters/vendors/:mode" element={<ProtectedRoute><VendorForm /></ProtectedRoute>} />
      <Route path="/masters/vendors/:mode/:id" element={<ProtectedRoute><VendorForm /></ProtectedRoute>} />
      <Route path="/masters/business-categories" element={<ProtectedRoute><BusinessCategories /></ProtectedRoute>} />
      <Route path="/masters/business-categories/:mode" element={<ProtectedRoute><BusinessCategoryForm /></ProtectedRoute>} />
      <Route path="/masters/business-categories/:mode/:id" element={<ProtectedRoute><BusinessCategoryForm /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;




