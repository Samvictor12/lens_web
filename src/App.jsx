import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SaleOrders from "./pages/SaleOrder/SaleOrderMain";
import SaleOrderForm from "./pages/SaleOrder/SaleOrderForm";
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
import Departments from "./pages/Department/Departments";
import DepartmentForm from "./pages/Department/DepartmentForm";
import UsersMain from "./pages/User/UsersMain";
import UserForm from "./pages/User/UserForm";
import LensCategoryMain from "./pages/LensCategory/LensCategoryMain";
import LensCategoryForm from "./pages/LensCategory/LensCategoryForm";
import LensMaterialMain from "./pages/LensMaterial/LensMaterialMain";
import LensMaterialForm from "./pages/LensMaterial/LensMaterialForm";
import LensCoatingMain from "./pages/LensCoating/LensCoatingMain";
import LensCoatingForm from "./pages/LensCoating/LensCoatingForm";
import LensBrandMain from "./pages/LensBrandMaster/LensBrandMain";
import LensBrandForm from "./pages/LensBrandMaster/LensBrandForm";
import LensTypeMain from "./pages/LensTypeMaster/LensTypeMain";
import LensTypeForm from "./pages/LensTypeMaster/LensTypeForm";
import LensProductMain from "./pages/LensProductMaster/LensProductMain";
import LensProductForm from "./pages/LensProductMaster/LensProductForm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  // const { toast } = useToast();
  // const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;

  // ROLE ACCESS DISABLED - Enable later for production
  // If allowedRoles is specified, check if user has permission
  // if (allowedRoles && !hasPermission(allowedRoles)) {
  //   useEffect(() => {
  //     toast({
  //       title: "Access Denied",
  //       description: "You don't have permission to access this page.",
  //       variant: "destructive",
  //     });
  //     navigate("/dashboard", { replace: true });
  //   }, []);
  //   return null;
  // }

  return <AppLayout>{children}</AppLayout>;
};

const SessionExpiryHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();

  useEffect(() => {
    const handleSessionExpired = () => {
      logout();
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please login again.",
        variant: "destructive",
      });
      navigate("/login", { replace: true });
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [navigate, toast, logout]);

  return null;
};

const AppRoutes = () => (
  <BrowserRouter>
    <SessionExpiryHandler />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/sales/orders" element={<ProtectedRoute><SaleOrders /></ProtectedRoute>} />
      <Route path="/sales/orders/:mode" element={<ProtectedRoute><SaleOrderForm /></ProtectedRoute>} />
      <Route path="/sales/orders/:mode/:id" element={<ProtectedRoute><SaleOrderForm /></ProtectedRoute>} />
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
      <Route path="/masters/departments" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
      <Route path="/masters/departments/:mode" element={<ProtectedRoute><DepartmentForm /></ProtectedRoute>} />
      <Route path="/masters/departments/:mode/:id" element={<ProtectedRoute><DepartmentForm /></ProtectedRoute>} />
      <Route path="/masters/users" element={<ProtectedRoute><UsersMain /></ProtectedRoute>} />
      <Route path="/masters/users/:mode" element={<ProtectedRoute><UserForm /></ProtectedRoute>} />
      <Route path="/masters/users/:mode/:id" element={<ProtectedRoute><UserForm /></ProtectedRoute>} />
      <Route path="/masters/lens-category" element={<ProtectedRoute><LensCategoryMain /></ProtectedRoute>} />
      <Route path="/masters/lens-category/:mode" element={<ProtectedRoute><LensCategoryForm /></ProtectedRoute>} />
      <Route path="/masters/lens-category/:mode/:id" element={<ProtectedRoute><LensCategoryForm /></ProtectedRoute>} />
      <Route path="/masters/lens-material" element={<ProtectedRoute><LensMaterialMain /></ProtectedRoute>} />
      <Route path="/masters/lens-material/:mode" element={<ProtectedRoute><LensMaterialForm /></ProtectedRoute>} />
      <Route path="/masters/lens-material/:mode/:id" element={<ProtectedRoute><LensMaterialForm /></ProtectedRoute>} />
      <Route path="/masters/lens-coating" element={<ProtectedRoute><LensCoatingMain /></ProtectedRoute>} />
      <Route path="/masters/lens-coating/:mode" element={<ProtectedRoute><LensCoatingForm /></ProtectedRoute>} />
      <Route path="/masters/lens-coating/:mode/:id" element={<ProtectedRoute><LensCoatingForm /></ProtectedRoute>} />
      <Route path="/masters/lens-brand" element={<ProtectedRoute><LensBrandMain /></ProtectedRoute>} />
      <Route path="/masters/lens-brand/:mode" element={<ProtectedRoute><LensBrandForm /></ProtectedRoute>} />
      <Route path="/masters/lens-brand/:mode/:id" element={<ProtectedRoute><LensBrandForm /></ProtectedRoute>} />
      <Route path="/masters/lens-type" element={<ProtectedRoute><LensTypeMain /></ProtectedRoute>} />
      <Route path="/masters/lens-type/:mode" element={<ProtectedRoute><LensTypeForm /></ProtectedRoute>} />
      <Route path="/masters/lens-type/:mode/:id" element={<ProtectedRoute><LensTypeForm /></ProtectedRoute>} />
      <Route path="/masters/lens-product" element={<ProtectedRoute><LensProductMain /></ProtectedRoute>} />
      <Route path="/masters/lens-product/:mode" element={<ProtectedRoute><LensProductForm /></ProtectedRoute>} />
      <Route path="/masters/lens-product/:mode/:id" element={<ProtectedRoute><LensProductForm /></ProtectedRoute>} />
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




