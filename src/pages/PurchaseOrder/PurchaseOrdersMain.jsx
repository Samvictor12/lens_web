import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Upload,
  Download,
  TrendingUp,
  Package,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { ViewToggle } from "@/components/ui/view-toggle";
import { CardGrid } from "@/components/ui/card-grid";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getPurchaseOrders, deletePurchaseOrder } from "@/services/purchaseOrder";
import { purchaseOrderFilters } from "./PurchaseOrder.constants";
import PurchaseOrderFilter from "./PurchaseOrderFilter";
import { usePurchaseOrderColumns } from "./usePurchaseOrderColumns";
import PurchaseOrderCard from "./PurchaseOrderCard";

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState(
    () => localStorage.getItem("purchaseOrdersView") || "card"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  
  // Pagination states
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Sorting state
  const [sorting, setSorting] = useState([]);

  // Filter states
  const [filters, setFilters] = useState(purchaseOrderFilters);
  const [tempFilters, setTempFilters] = useState(purchaseOrderFilters);
  
  // Purchase Order data
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [poToDelete, setPoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Dashboard statistics
  const [dashboardStats, setDashboardStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalValue: 0,
    avgOrderValue: 0,
    recentActivity: []
  });
  
  // Active tab state
  const [activeTab, setActiveTab] = useState("dashboard");

  // Handle delete purchase order click
  const handleDeleteClick = (po) => {
    setPoToDelete(po);
    setDeleteDialogOpen(true);
  };

  // Handle receive purchase order click
  const handleReceive = (po) => {
    window.open(`/masters/purchase-orders/receive/${po.id}`, "_blank");
  };

  // Get table columns with delete handler
  const columns = usePurchaseOrderColumns(navigate, handleDeleteClick, handleReceive);

  // Fetch purchase orders from API
  const fetchPurchaseOrders = async () => {
    try {
      setIsLoading(true);
      const sortField = sorting[0]?.id || "createdAt";
      const sortDirection = sorting[0]?.desc ? "desc" : "asc";
      
      const response = await getPurchaseOrders(
        pageIndex + 1, // Backend uses 1-indexed pages
        pageSize,
        searchQuery,
        filters,
        sortField,
        sortDirection
      );
      
      if (response.success) {
        setPurchaseOrders(response.data);
        setTotalCount(response.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch purchase orders",
        variant: "destructive",
      });
      setPurchaseOrders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch purchase orders on mount and when dependencies change
  useEffect(() => {
    fetchPurchaseOrders();
  }, [pageIndex, pageSize, searchQuery, filters, sorting]);

  // Calculate dashboard stats when purchase orders change
  useEffect(() => {
    calculateDashboardStats();
  }, [purchaseOrders]);

  // Handle delete purchase order
  const handleDeleteConfirm = async () => {
    if (!poToDelete) return;

    try {
      setIsDeleting(true);
      await deletePurchaseOrder(poToDelete.id);
      
      toast({
        title: "Success",
        description: `Purchase Order "${poToDelete.poNumber}" has been deleted successfully.`,
      });
      
      setDeleteDialogOpen(false);
      setPoToDelete(null);
      
      // Refresh purchase order list
      fetchPurchaseOrders();
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete purchase order.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.active_status !== "all" ||
      filters.status !== null ||
      filters.vendor_id !== null ||
      filters.start_date !== "" ||
      filters.end_date !== ""
    );
  }, [filters]);

  // Save view preference
  const handleViewChange = (newView) => {
    setView(newView);
    localStorage.setItem("purchaseOrdersView", newView);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterDialog(false);
  };

  // Calculate dashboard statistics
  const calculateDashboardStats = () => {
    const totalOrders = purchaseOrders.length;
    const pendingOrders = purchaseOrders.filter(po => po.status === 'DRAFT' || po.status === 'PARTIALLY_RECEIVED').length;
    const completedOrders = purchaseOrders.filter(po => po.status === 'COMPLETED').length;
    const totalValue = purchaseOrders.reduce((sum, po) => sum + parseFloat(po.totalValue || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;
    
    // Get recent activity (last 5 orders)
    const recentActivity = [...purchaseOrders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    
    setDashboardStats({
      totalOrders,
      pendingOrders,
      completedOrders,
      totalValue,
      avgOrderValue,
      recentActivity
    });
  };

  const handleClearFilters = () => {
    const clearedFilters = purchaseOrderFilters;
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
    setShowFilterDialog(false);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters);
    setShowFilterDialog(false);
  };

  // For client-side display, we use the purchase orders directly from API
  // Backend handles filtering, so we just display what we receive
  const displayPurchaseOrders = purchaseOrders;

  const handleUpload = () => {
    toast({
      title: "Coming Soon",
      description: "Excel upload functionality will be available soon.",
    });
  };

  const handleDownloadSample = () => {
    toast({
      title: "Coming Soon",
      description: "Sample template download will be available soon.",
    });
  };

  // Dashboard component
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">All purchase orders</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{dashboardStats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting completion</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardStats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{dashboardStats.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Avg: ₹{Math.round(dashboardStats.avgOrderValue).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardStats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {dashboardStats.recentActivity.map((po) => (
                <div key={po.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                     onClick={() => window.open(`/masters/purchase-orders/view/${po.id}`, "_blank")}>
                  <div className="flex-1">
                    <div className="font-medium">{po.poNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {po.vendor?.name || 'Unknown Vendor'} • ₹{parseFloat(po.totalValue || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      po.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      po.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                      po.status === 'PARTIALLY_RECEIVED' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {po.status === 'DRAFT' ? 'Pending' : po.status === 'PARTIALLY_RECEIVED' ? 'Partially Received' : po.status === 'RECEIVED' ? 'Received' : po.status === 'INVOICE_RECEIVED' ? 'Invoice Received' : po.status === 'CLOSED' ? 'Closed' : po.status === 'CANCELLED' ? 'Cancelled' : po.status}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(po.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Purchase Orders
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage purchase orders and vendor purchases
          </p>
        </div>
        <div className="flex gap-1.5">
          {/* <Button
            variant="outline"
            size="xs"
            className="gap-1.5 h-8"
            onClick={handleDownloadSample}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download Sample</span>
          </Button>
          <Button
            variant="outline"
            size="xs"
            className="gap-1.5 h-8"
            onClick={handleUpload}
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </Button> */}
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => window.open("/masters/purchase-orders/add", "_blank")}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Purchase Order</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="list">Purchase Orders List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="flex-1 mt-0">
          {renderDashboard()}
        </TabsContent>
        
        <TabsContent value="list" className="flex-1 flex flex-col mt-0">

          {/* Search and Filters */}
          <Card className="p-1 sm:p-1 flex-shrink-0 mb-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search purchase orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <ViewToggle view={view} onViewChange={handleViewChange} />
                <PurchaseOrderFilter
                  filters={filters}
                  tempFilters={tempFilters}
                  setTempFilters={setTempFilters}
                  showFilterDialog={showFilterDialog}
                  setShowFilterDialog={setShowFilterDialog}
                  hasActiveFilters={hasActiveFilters}
                  onApplyFilters={handleApplyFilters}
                  onClearFilters={handleClearFilters}
                  onCancelFilters={handleCancelFilters}
                />
              </div>
            </div>
          </Card>

          {/* Table View */}
          {view === "table" && (
            <div className="flex-1 min-h-0">
              <Table
                data={displayPurchaseOrders}
                columns={columns}
                pageIndex={pageIndex}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPageIndex}
                loading={isLoading}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageIndex(0);
                }}
                setSorting={setSorting}
                sorting={sorting}
                pagination={true}
                emptyMessage="No purchase orders found"
              />
            </div>
          )}

          {/* Card View */}
          {view === "card" && (
            <div className="flex-1 min-h-0">
              <CardGrid
                items={displayPurchaseOrders}
                renderCard={(po) => (
                  <PurchaseOrderCard
                    purchaseOrder={po}
                    onView={(id) => window.open(`/masters/purchase-orders/view/${id}`, "_blank")}
                    onDelete={handleDeleteClick}
                    onReceive={handleReceive}
                  />
                )}
                isLoading={isLoading}
                emptyMessage="No purchase orders found"
                pagination={true}
                pageIndex={pageIndex}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPageIndex}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageIndex(0);
                }}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Purchase Order?"
        description={
          poToDelete
            ? `Are you sure you want to delete Purchase Order "${poToDelete.poNumber}"? This action cannot be undone.`
            : "Are you sure you want to delete this purchase order?"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
