import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Upload,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { ViewToggle } from "@/components/ui/view-toggle";
import { CardGrid } from "@/components/ui/card-grid";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { getVendors, deleteVendor } from "@/services/vendor";
import {
  downloadVendorTemplate,
  exportVendorsToExcel,
  importVendorsFromExcel,
} from "@/lib/excelUtils";
import { vendorFilters } from "./Vendor.constants";
import VendorFilter from "./VendorFilter";
import { useVendorColumns } from "./useVendorColumns";
import VendorCard from "./VendorCard";

export default function Vendors() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState(
    () => localStorage.getItem("vendorsView") || "card"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  
  // Pagination states
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Sorting state
  const [sorting, setSorting] = useState([]);

  // Filter states
  const [filters, setFilters] = useState(vendorFilters);
  const [tempFilters, setTempFilters] = useState(vendorFilters);
  
  // Vendor data
  const [vendors, setVendors] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle delete vendor click
  const handleDeleteClick = (vendor) => {
    setVendorToDelete(vendor);
    setDeleteDialogOpen(true);
  };

  // Get table columns with delete handler
  const columns = useVendorColumns(navigate, handleDeleteClick);

  // Fetch vendors from API
  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      const sortField = sorting[0]?.id || "createdAt";
      const sortDirection = sorting[0]?.desc ? "desc" : "asc";
      
      const response = await getVendors(
        pageIndex + 1, // Backend uses 1-indexed pages
        pageSize,
        searchQuery,
        filters,
        sortField,
        sortDirection
      );
      
      if (response.success) {
        setVendors(response.data);
        setTotalCount(response.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch vendors",
        variant: "destructive",
      });
      setVendors([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch vendors on mount and when dependencies change
  useEffect(() => {
    fetchVendors();
  }, [pageIndex, pageSize, searchQuery, filters, sorting]);

  // Handle delete vendor
  const handleDeleteConfirm = async () => {
    if (!vendorToDelete) return;

    try {
      setIsDeleting(true);
      await deleteVendor(vendorToDelete.id);
      
      toast({
        title: "Success",
        description: `Vendor "${vendorToDelete.name}" has been deleted successfully.`,
      });
      
      setDeleteDialogOpen(false);
      setVendorToDelete(null);
      
      // Refresh vendor list
      fetchVendors();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete vendor. The vendor may have existing orders.",
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
      filters.category !== "" ||
      filters.city !== ""
    );
  }, [filters]);

  // Save view preference
  const handleViewChange = (newView) => {
    setView(newView);
    localStorage.setItem("vendorsView", newView);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterDialog(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = vendorFilters;
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
    setShowFilterDialog(false);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters);
    setShowFilterDialog(false);
  };

  // For client-side display, we use the vendors directly from API
  // Backend handles filtering, so we just display what we receive
  const displayVendors = vendors;

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const vendors = await importVendorsFromExcel(file);
          console.log("Imported vendors:", vendors);
          alert(`Successfully imported ${vendors.length} vendors!`);
          // Refresh vendor list
          fetchVendors();
        } catch (error) {
          alert("Error importing file: " + error.message);
        }
      }
    };
    input.click();
  };

  const handleDownloadSample = () => {
    downloadVendorTemplate();
  };

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Vendors
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage vendor information and accounts
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
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
          </Button>
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => navigate("/masters/vendors/add")}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Vendor</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <ViewToggle view={view} onViewChange={handleViewChange} />
            <VendorFilter
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
            data={displayVendors}
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
            emptyMessage="No vendors found"
          />
        </div>
      )}

      {/* Card View */}
      {view === "card" && (
        <div className="flex-1 min-h-0">
          <CardGrid
            items={displayVendors}
            renderCard={(vendor) => (
              <VendorCard
                vendor={vendor}
                onView={(id) => navigate(`/masters/vendors/view/${id}`)}
                onDelete={handleDeleteClick}
              />
            )}
            isLoading={isLoading}
            emptyMessage="No vendors found"
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

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Vendor?"
        description={
          vendorToDelete
            ? `Are you sure you want to delete "${vendorToDelete.name}"? This action cannot be undone and will fail if the vendor has existing orders.`
            : "Are you sure you want to delete this vendor?"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
