import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SaleOrders from "./pages/SaleOrder/SaleOrderMain";
import SaleOrderForm from "./pages/SaleOrder/SaleOrderForm";
// import SaleOrderForm from "./components/forms/SaleOrderForm";
import Customers from "./pages/Customer/CustomersMain";
import CustomerForm from "./pages/Customer/CustomerForm";
import InventoryMain from "./pages/Inventory/InventoryMain";
import InventoryItemPage from "./pages/Inventory/InventoryItemPage";
import InventoryTransactionPage from "./pages/Inventory/InventoryTransactionPage";
import PurchaseOrders from "./pages/PurchaseOrder/PurchaseOrdersMain";
import PurchaseOrderForm from "./pages/PurchaseOrder/PurchaseOrderForm";
import PurchaseOrderReceive from "./pages/PurchaseOrder/PurchaseOrderReceive";
import POInwardToInventory from "./pages/PurchaseOrder/POInwardToInventory";
import Dispatch from "./pages/Dispatch/DispatchMain";
import DispatchWindow from "./pages/DispatchWindow/DispatchWindowMain";
import Billing from "./pages/Billing/BillingMain";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
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
import LensIndexMain from "./pages/LensIndexMaster/LensIndexMain";
import LensIndexForm from "./pages/LensIndexMaster/LensIndexForm";
import LensTypeMain from "./pages/LensTypeMaster/LensTypeMain";
import LensTypeForm from "./pages/LensTypeMaster/LensTypeForm";
import LensTintingMain from "./pages/LensTinting/LensTintingMain";
import LensTintingForm from "./pages/LensTinting/LensTintingForm";
import LensOffersMain from "./pages/LensOffers/LensOffersMain";
import LensOffersForm from "./pages/LensOffers/LensOffersForm";
import LensProductMain from "./pages/LensProductMaster/LensProductMain";
import LensProductForm from "./pages/LensProductMaster/LensProductForm";
import LensFittingMain from "./pages/LensFittingMaster/LensFittingMain";
import LensDiaMain from "./pages/LensDiaMaster/LensDiaMain";
import LensDiaForm from "./pages/LensDiaMaster/LensDiaForm";
import LensFittingForm from "./pages/LensFittingMaster/LensFittingForm";
import LocationMain from "./pages/LocationMaster/LocationMain";
import LocationForm from "./pages/LocationMaster/LocationForm";
import TrayMain from "./pages/TrayMaster/TrayMain";
import TrayForm from "./pages/TrayMaster/TrayForm";
import LogsViewer from "./pages/LogsViewer";
import DiscountManagement from "./pages/DiscountManagement/DiscountManagement";
import { FittingOperatorList, FittingOrderDetail } from "./pages/FittingOperator";
import { QualityOperatorList, QualityOrderDetail } from "./pages/QualityOperator";
import { PreQcOperatorList, PreQcOrderDetail } from "./pages/PreQcOperator";
import NotFound from "./pages/NotFound";
import NoAccess from "./pages/NoAccess";
import HomeRedirect from "./components/layout/HomeRedirect";
import CustomerPortalLogin from "./pages/CustomerPortal/CustomerPortalLogin";
import CustomerPortalDashboard from "./pages/CustomerPortal/CustomerPortalDashboard";
import CheckSheetMain from "./pages/CheckSheet/CheckSheetMain";
import CheckSheetForm from "./pages/CheckSheet/CheckSheetForm";
import ChartOfAccounts from "./pages/Accounting/ChartOfAccounts/ChartOfAccountsMain";
import ExpenseCategories from "./pages/ExpenseCategory/ExpenseCategoryMain";
import ExpenseCategoryForm from "./pages/ExpenseCategory/ExpenseCategoryForm";
import ExpensesMain from "./pages/Accounting/Expenses/ExpensesMain";
import VendorPayments from "./pages/Accounting/VendorPayments/VendorPaymentsMain";
import CustomerPayments from "./pages/Accounting/CustomerPayments/CustomerPaymentsMain";
import FinancialReports from "./pages/Accounting/FinancialReports";
import BankReconciliation from "./pages/Accounting/BankReconciliation/BankReconciliationMain";

const queryClient = new QueryClient();

import { RolePermissionsProvider, useRolePermissionsContext } from "@/contexts/RolePermissionsContext";
import PermissionRoute from "@/components/layout/PermissionRoute";
import RoleListPage from "./pages/Role/RoleListPage";
import RoleFormPage from "./pages/Role/RoleFormPage";

const ProtectedRouteInner = ({ allowedPermission, children }) => {
  const { has, loading } = useRolePermissionsContext();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading permissions...</p>
        </div>
      </div>
    );
  }

  const isAllowed = allowedPermission ? has(allowedPermission, "Screen") : true;

  return <PermissionRoute allowed={isAllowed}>{children}</PermissionRoute>;
};

const ProtectedRoute = ({ children, allowedPermission }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <RolePermissionsProvider enabled={!!user}>
      <AppLayout>
        <ProtectedRouteInner allowedPermission={allowedPermission}>
          {children}
        </ProtectedRouteInner>
      </AppLayout>
    </RolePermissionsProvider>
  );
};

const LegacyFittingOperatorRedirect = () => {
  const { id } = useParams();
  return <Navigate to={id ? `/fitting/operator/${id}` : "/fitting/operator"} replace />;
};

const LegacyInventoryInwardRedirect = () => {
  const { id, receiptId } = useParams();
  return <Navigate to={`/inventory/stock/inward/${id}/${receiptId}`} replace />;
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
      <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
      <Route path="/no-access" element={<ProtectedRoute><NoAccess /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute allowedPermission="dashboard"><Dashboard /></ProtectedRoute>} />
      <Route path="/sales/orders" element={<ProtectedRoute><SaleOrders /></ProtectedRoute>} />
      <Route path="/sales/orders/dif/:mode" element={<ProtectedRoute><SaleOrderForm /></ProtectedRoute>} />
      <Route path="/sales/orders/:mode" element={<div className="flex overflow-auto h-svh w-full"><SaleOrderForm /></div>} />
      <Route path="/sales/orders/:mode/:id" element={<div className="flex overflow-auto h-svh w-full"><SaleOrderForm /></div>} />
      <Route path="/sales/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route path="/sales/customers/:customerId/price-mapping" element={<ProtectedRoute><DiscountManagement /></ProtectedRoute>} />
      <Route path="/sales/customers/:mode" element={<ProtectedRoute><CustomerForm /></ProtectedRoute>} />
      <Route path="/sales/customers/:mode/:id" element={<ProtectedRoute><CustomerForm /></ProtectedRoute>} />

      {/* Inventory Routes */}
      <Route path="/inventory/stock" element={<ProtectedRoute><Navigate to="/inventory/stock/dashboard" replace /></ProtectedRoute>} />
      <Route path="/inventory/rx" element={<ProtectedRoute><Navigate to="/inventory/rx/dashboard" replace /></ProtectedRoute>} />
      <Route path="/inventory/stock/dashboard" element={<ProtectedRoute><InventoryMain /></ProtectedRoute>} />
      <Route path="/inventory/stock/inward" element={<ProtectedRoute><InventoryMain /></ProtectedRoute>} />
      <Route path="/inventory/stock/request-queue" element={<ProtectedRoute><InventoryMain /></ProtectedRoute>} />
      <Route path="/inventory/stock/transactions" element={<ProtectedRoute><InventoryMain /></ProtectedRoute>} />
      <Route path="/inventory/stock/stock" element={<ProtectedRoute><InventoryMain /></ProtectedRoute>} />
      <Route path="/inventory/stock/transactions/add" element={<ProtectedRoute><InventoryTransactionPage /></ProtectedRoute>} />
      <Route path="/inventory/stock/inward/:id/:receiptId" element={<ProtectedRoute><POInwardToInventory /></ProtectedRoute>} />
      <Route path="/inventory/rx/dashboard" element={<ProtectedRoute><InventoryMain /></ProtectedRoute>} />
      <Route path="/inventory/rx/inward" element={<ProtectedRoute><InventoryMain /></ProtectedRoute>} />
      <Route path="/inventory/rx/request-queue" element={<ProtectedRoute><InventoryMain /></ProtectedRoute>} />
      <Route path="/inventory/rx/transactions" element={<ProtectedRoute><InventoryMain /></ProtectedRoute>} />
      <Route path="/inventory/rx/stock" element={<ProtectedRoute><InventoryMain /></ProtectedRoute>} />
      <Route path="/inventory/rx/transactions/add" element={<ProtectedRoute><InventoryTransactionPage /></ProtectedRoute>} />
      <Route path="/inventory/rx/inward/:id/:receiptId" element={<ProtectedRoute><POInwardToInventory /></ProtectedRoute>} />
      {/* Legacy inventory URLs → Stock Godown */}
      <Route path="/inventory/dashboard" element={<ProtectedRoute><Navigate to="/inventory/stock/dashboard" replace /></ProtectedRoute>} />
      <Route path="/inventory/items" element={<ProtectedRoute><Navigate to="/inventory/stock/dashboard" replace /></ProtectedRoute>} />
      <Route path="/inventory/inward" element={<ProtectedRoute><Navigate to="/inventory/stock/inward" replace /></ProtectedRoute>} />
      <Route path="/inventory/request-queue" element={<ProtectedRoute><Navigate to="/inventory/stock/request-queue" replace /></ProtectedRoute>} />
      <Route path="/inventory/transactions" element={<ProtectedRoute><Navigate to="/inventory/stock/transactions" replace /></ProtectedRoute>} />
      <Route path="/inventory/reports" element={<ProtectedRoute><Navigate to="/inventory/stock/dashboard" replace /></ProtectedRoute>} />
      <Route path="/inventory/items/add" element={<ProtectedRoute><InventoryItemPage /></ProtectedRoute>} />
      <Route path="/inventory/items/edit/:id" element={<ProtectedRoute><InventoryItemPage /></ProtectedRoute>} />
      <Route path="/inventory/items/view/:id" element={<ProtectedRoute><InventoryItemPage /></ProtectedRoute>} />
      <Route path="/inventory/transactions/add" element={<ProtectedRoute><Navigate to="/inventory/stock/transactions/add" replace /></ProtectedRoute>} />
      <Route path="/inventory/inward/:id/:receiptId" element={<ProtectedRoute><LegacyInventoryInwardRedirect /></ProtectedRoute>} />
      <Route path="/masters/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
      <Route path="/masters/purchase-orders/:mode" element={<div className="flex overflow-auto h-svh w-full"><PurchaseOrderForm /></div>} />
      <Route path="/masters/purchase-orders/:mode/:id" element={<div className="flex overflow-auto h-svh w-full"><PurchaseOrderForm /></div>} />
      <Route path="/masters/purchase-orders/receive/:id" element={<div className="flex overflow-auto h-svh w-full"><PurchaseOrderReceive /></div>} />
      <Route path="/masters/purchase-orders/receive/:id/edit/:receiptId" element={<div className="flex overflow-auto h-svh w-full"><PurchaseOrderReceive /></div>} />
      <Route path="/masters/purchase-orders/receive/:id/inward/:receiptId" element={<div className="flex overflow-auto h-svh w-full"><POInwardToInventory /></div>} />
      <Route path="/dispatch" element={<ProtectedRoute><Dispatch /></ProtectedRoute>} />
      <Route path="/dispatch/window" element={<ProtectedRoute allowedPermission="dispatch_window"><DispatchWindow /></ProtectedRoute>} />
      <Route path="/production/operator" element={<LegacyFittingOperatorRedirect />} />
      <Route path="/production/operator/:id" element={<LegacyFittingOperatorRedirect />} />
      <Route path="/fitting/operator" element={<ProtectedRoute><FittingOperatorList /></ProtectedRoute>} />
      <Route path="/fitting/operator/:id" element={<ProtectedRoute><FittingOrderDetail /></ProtectedRoute>} />
      <Route path="/pre-qc/operator" element={<ProtectedRoute><PreQcOperatorList /></ProtectedRoute>} />
      <Route path="/pre-qc/operator/:id" element={<ProtectedRoute><PreQcOrderDetail /></ProtectedRoute>} />
      <Route path="/quality/operator" element={<ProtectedRoute><QualityOperatorList title="Post-QC" /></ProtectedRoute>} />
      <Route path="/quality/operator/:id" element={<ProtectedRoute><QualityOrderDetail /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />

      <Route path="/accounts/expenses" element={<ProtectedRoute><ExpensesMain /></ProtectedRoute>} />
      <Route path="/accounts/customer-payments" element={<ProtectedRoute><CustomerPayments /></ProtectedRoute>} />
      <Route path="/accounts/vendor-payments" element={<ProtectedRoute><VendorPayments /></ProtectedRoute>} />
      <Route path="/accounts/bank-reconciliation" element={<ProtectedRoute><BankReconciliation /></ProtectedRoute>} />
      <Route path="/accounts/ledgers" element={<ProtectedRoute><ChartOfAccounts /></ProtectedRoute>} />
      <Route path="/masters/expense-categories" element={<ProtectedRoute><ExpenseCategories /></ProtectedRoute>} />
      <Route path="/masters/expense-categories/:mode" element={<ProtectedRoute><ExpenseCategoryForm /></ProtectedRoute>} />
      <Route path="/masters/expense-categories/:mode/:id" element={<ProtectedRoute><ExpenseCategoryForm /></ProtectedRoute>} />
      <Route path="/accounts/reports" element={<ProtectedRoute><FinancialReports /></ProtectedRoute>} />
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
      <Route path="/masters/users" element={<ProtectedRoute allowedPermission="users"><UsersMain /></ProtectedRoute>} />
      <Route path="/masters/users/:mode" element={<ProtectedRoute allowedPermission="users"><UserForm /></ProtectedRoute>} />
      <Route path="/masters/users/:mode/:id" element={<ProtectedRoute allowedPermission="users"><UserForm /></ProtectedRoute>} />
      <Route path="/masters/roles" element={<ProtectedRoute allowedPermission="users"><RoleListPage /></ProtectedRoute>} />
      <Route path="/masters/roles/:mode" element={<ProtectedRoute allowedPermission="users"><RoleFormPage /></ProtectedRoute>} />
      <Route path="/masters/roles/:mode/:id" element={<ProtectedRoute allowedPermission="users"><RoleFormPage /></ProtectedRoute>} />
      <Route path="/masters/lens-category" element={<ProtectedRoute><LensCategoryMain /></ProtectedRoute>} />
      <Route path="/masters/lens-category/:mode" element={<ProtectedRoute><LensCategoryForm /></ProtectedRoute>} />
      <Route path="/masters/lens-category/:mode/:id" element={<ProtectedRoute><LensCategoryForm /></ProtectedRoute>} />
      <Route path="/masters/lens-material" element={<ProtectedRoute><LensMaterialMain /></ProtectedRoute>} />
      <Route path="/masters/lens-material/:mode" element={<ProtectedRoute><LensMaterialForm /></ProtectedRoute>} />
      <Route path="/masters/lens-material/:mode/:id" element={<ProtectedRoute><LensMaterialForm /></ProtectedRoute>} />
      <Route path="/masters/lens-coating" element={<ProtectedRoute><LensCoatingMain /></ProtectedRoute>} />
      <Route path="/masters/lens-coating/:mode" element={<ProtectedRoute><LensCoatingForm /></ProtectedRoute>} />
      <Route path="/masters/lens-coating/:mode/:id" element={<ProtectedRoute><LensCoatingForm /></ProtectedRoute>} />
      <Route path="/masters/check-sheets" element={<ProtectedRoute><CheckSheetMain /></ProtectedRoute>} />
      <Route path="/masters/check-sheets/:mode" element={<ProtectedRoute><CheckSheetForm /></ProtectedRoute>} />
      <Route path="/masters/check-sheets/:mode/:id" element={<ProtectedRoute><CheckSheetForm /></ProtectedRoute>} />
      <Route path="/masters/lens-brand" element={<ProtectedRoute><LensBrandMain /></ProtectedRoute>} />
      <Route path="/masters/lens-brand/:mode" element={<ProtectedRoute><LensBrandForm /></ProtectedRoute>} />
      <Route path="/masters/lens-brand/:mode/:id" element={<ProtectedRoute><LensBrandForm /></ProtectedRoute>} />
      <Route path="/masters/lens-index" element={<ProtectedRoute><LensIndexMain /></ProtectedRoute>} />
      <Route path="/masters/lens-index/:mode" element={<ProtectedRoute><LensIndexForm /></ProtectedRoute>} />
      <Route path="/masters/lens-index/:mode/:id" element={<ProtectedRoute><LensIndexForm /></ProtectedRoute>} />
      <Route path="/masters/lens-type" element={<ProtectedRoute><LensTypeMain /></ProtectedRoute>} />
      <Route path="/masters/lens-type/:mode" element={<ProtectedRoute><LensTypeForm /></ProtectedRoute>} />
      <Route path="/masters/lens-type/:mode/:id" element={<ProtectedRoute><LensTypeForm /></ProtectedRoute>} />
      <Route path="/masters/lens-tinting" element={<ProtectedRoute><LensTintingMain /></ProtectedRoute>} />
      <Route path="/masters/lens-tinting/:mode" element={<ProtectedRoute><LensTintingForm /></ProtectedRoute>} />
      <Route path="/masters/lens-tinting/:mode/:id" element={<ProtectedRoute><LensTintingForm /></ProtectedRoute>} />
      <Route path="/masters/lens-offers" element={<ProtectedRoute><LensOffersMain /></ProtectedRoute>} />
      <Route path="/masters/lens-offers/:mode" element={<ProtectedRoute><LensOffersForm /></ProtectedRoute>} />
      <Route path="/masters/lens-offers/:mode/:id" element={<ProtectedRoute><LensOffersForm /></ProtectedRoute>} />
      <Route path="/masters/lens-product" element={<ProtectedRoute><LensProductMain /></ProtectedRoute>} />
      <Route path="/masters/lens-product/:mode" element={<ProtectedRoute><LensProductForm /></ProtectedRoute>} />
      <Route path="/masters/lens-product/:mode/:id" element={<ProtectedRoute><LensProductForm /></ProtectedRoute>} />
      <Route path="/masters/lens-fitting" element={<ProtectedRoute><LensFittingMain /></ProtectedRoute>} />
      <Route path="/masters/lens-fitting/:mode" element={<ProtectedRoute><LensFittingForm /></ProtectedRoute>} />
      <Route path="/masters/lens-fitting/:mode/:id" element={<ProtectedRoute><LensFittingForm /></ProtectedRoute>} />
      <Route path="/masters/lens-dia" element={<ProtectedRoute><LensDiaMain /></ProtectedRoute>} />
      <Route path="/masters/lens-dia/:mode" element={<ProtectedRoute><LensDiaForm /></ProtectedRoute>} />
      <Route path="/masters/lens-dia/:mode/:id" element={<ProtectedRoute><LensDiaForm /></ProtectedRoute>} />
      <Route path="/masters/location" element={<ProtectedRoute><LocationMain /></ProtectedRoute>} />
      <Route path="/masters/location/:mode" element={<ProtectedRoute><LocationForm /></ProtectedRoute>} />
      <Route path="/masters/location/:mode/:id" element={<ProtectedRoute><LocationForm /></ProtectedRoute>} />
      <Route path="/masters/tray" element={<ProtectedRoute><TrayMain /></ProtectedRoute>} />
      <Route path="/masters/tray/:mode" element={<ProtectedRoute><TrayForm /></ProtectedRoute>} />
      <Route path="/masters/tray/:mode/:id" element={<ProtectedRoute><TrayForm /></ProtectedRoute>} />
      <Route path="/system/logs" element={<ProtectedRoute><LogsViewer /></ProtectedRoute>} />
      <Route path="/masters/price-mapping" element={<ProtectedRoute><DiscountManagement /></ProtectedRoute>} />
      {/* Public Customer Portal */}
      <Route path="/portal/:token" element={<CustomerPortalLogin />} />
      <Route path="/portal/:token/dashboard" element={<CustomerPortalDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CompanyProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </CompanyProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

