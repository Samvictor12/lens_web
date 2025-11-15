import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { getLensTypes, deleteLensType } from "@/services/lensType";
import { lensTypeFilters } from "./LensType.constants";
import { useLensTypeColumns } from "./useLensTypeColumns";
import LensTypeFilter from "./LensTypeFilter";

export default function LensTypes() {
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
  const [filters, setFilters] = useState(lensTypeFilters);
  const [tempFilters, setTempFilters] = useState(lensTypeFilters);

  // Type data
  const [types, setTypes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle delete type click
  const handleDeleteClick = (type) => {
    setTypeToDelete(type);
    setDeleteDialogOpen(true);
  };

  // Get table columns with delete handler
  const columns = useLensTypeColumns(navigate, handleDeleteClick);

  // Fetch types from API
  const fetchTypes = async () => {
    try {
      setIsLoading(true);
      const sortField = sorting[0]?.id || "createdAt";
      const sortDirection = sorting[0]?.desc ? "desc" : "asc";

      const params = {
        page: pageIndex + 1,
        limit: pageSize,
        search: searchQuery,
        sortBy: sortField,
        sortOrder: sortDirection,
        activeStatus: filters.activeStatus,
      };

      const response = await getLensTypes(params);
      setTypes(response.data);
      setTotalCount(response.pagination.total);
    } catch (error) {
      console.error("Error fetching lens types:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch lens types",
        variant: "destructive",
      });
      setTypes([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch types on mount and when dependencies change
  useEffect(() => {
    fetchTypes();
  }, [pageIndex, pageSize, searchQuery, filters, sorting]);

  // Handle delete type
  const handleDeleteConfirm = async () => {
    if (!typeToDelete) return;

    try {
      setIsDeleting(true);
      await deleteLensType(typeToDelete.id);

      toast({
        title: "Success",
        description: `Lens type "${typeToDelete.name}" has been deleted successfully.`,
      });

      setDeleteDialogOpen(false);
      setTypeToDelete(null);

      // Refresh type list
      fetchTypes();
    } catch (error) {
      console.error("Error deleting lens type:", error);
      toast({
        title: "Error",
        description:
          error.message ||
          "Failed to delete lens type. The type may have existing products.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.activeStatus !== "all";
  }, [filters]);

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterDialog(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = lensTypeFilters;
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
    setShowFilterDialog(false);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters);
    setShowFilterDialog(false);
  };

  // For client-side display, we use the types directly from API
  // Backend handles filtering, so we just display what we receive
  const displayTypes = types;

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Lens Types
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage lens type master data
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => navigate("/masters/lens-type/add")}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Type</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search lens types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <LensTypeFilter
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
      <div className="flex-1 min-h-0">
        <Table
          data={displayTypes}
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
          emptyMessage="No lens types found"
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Lens Type?"
        description={
          typeToDelete
            ? `Are you sure you want to delete "${typeToDelete.name}"? This action cannot be undone and will fail if the type has existing products.`
            : "Are you sure you want to delete this lens type?"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
