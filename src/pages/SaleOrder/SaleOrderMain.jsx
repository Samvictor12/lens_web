import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getSaleOrders,
  deleteSaleOrder,
  getCustomersDropdown,
} from "@/services/saleOrder";
import { saleOrderFilters } from "./SaleOrder.constants";
import { useSaleOrderColumns } from "./useSaleOrderColumns";
import SaleOrderFilter from "./SaleOrderFilter";

export default function SaleOrderMain() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  // Pagination states
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Sorting state
  const [sorting, setSorting] = useState([]);

  // Filter states
  const [filters, setFilters] = useState(saleOrderFilters);
  const [tempFilters, setTempFilters] = useState(saleOrderFilters);

  // Sale order data
  const [saleOrders, setSaleOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // Customers for filter dropdown
  const [customers, setCustomers] = useState([]);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle delete order click
  const handleDeleteClick = (order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  // Get table columns with delete handler
  const columns = useSaleOrderColumns(navigate, handleDeleteClick);

  // Fetch customers for filter dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await getCustomersDropdown();
        if (response.success) {
          setCustomers(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };
    fetchCustomers();
  }, []);

  // Fetch sale orders from API
  const fetchSaleOrders = async () => {
    try {
      setIsLoading(true);
      const sortField = sorting[0]?.id || "createdAt";
      const sortDirection = sorting[0]?.desc ? "desc" : "asc";

      const response = await getSaleOrders(
        pageIndex + 1, // Backend uses 1-indexed pages
        pageSize,
        searchQuery,
        filters,
        sortField,
        sortDirection
      );

      if (response.success) {
        setSaleOrders(response.data || []);
        setTotalCount(response.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Error fetching sale orders:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch sale orders",
        variant: "destructive",
      });
      setSaleOrders([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch sale orders on mount and when dependencies change
  useEffect(() => {
    fetchSaleOrders();
  }, [pageIndex, pageSize, searchQuery, filters, sorting]);

  // Handle delete sale order
  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    try {
      setIsDeleting(true);
      await deleteSaleOrder(orderToDelete.id);

      toast({
        title: "Success",
        description: `Sale order "${orderToDelete.orderNo}" has been deleted successfully.`,
        success: true,
      });

      setDeleteDialogOpen(false);
      setOrderToDelete(null);

      // Refresh sale orders list
      fetchSaleOrders();
    } catch (error) {
      console.error("Error deleting sale order:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete sale order.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.status !== "all" ||
      filters.customerId !== null ||
      filters.startDate !== null ||
      filters.endDate !== null
    );
  }, [filters]);

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterDialog(false);
    setPageIndex(0); // Reset to first page
  };

  const handleClearFilters = () => {
    const clearedFilters = saleOrderFilters;
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
    setShowFilterDialog(false);
    setPageIndex(0);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters);
    setShowFilterDialog(false);
  };

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Sale Orders
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage all customer orders
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => navigate("/sales/orders/add")}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Order</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search orders by order number, customer..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(0); // Reset to first page on search
              }}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <SaleOrderFilter
              filters={filters}
              tempFilters={tempFilters}
              setTempFilters={setTempFilters}
              showFilterDialog={showFilterDialog}
              setShowFilterDialog={setShowFilterDialog}
              hasActiveFilters={hasActiveFilters}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              onCancelFilters={handleCancelFilters}
              customers={customers}
            />
          </div>
        </div>
      </Card>

      {/* Table View */}
      <div className="flex-1 min-h-0">
        <Table
          data={saleOrders}
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
          emptyMessage="No sale orders found"
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Sale Order?"
        description={
          orderToDelete
            ? `Are you sure you want to delete order "${orderToDelete.orderNo}"? This action cannot be undone.`
            : "Are you sure you want to delete this sale order?"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
