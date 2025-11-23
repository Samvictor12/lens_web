import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { getLensTintings, deleteLensTinting } from "@/services/lensTinting";
import { lensTintingFilters } from "./LensTinting.constants";
import { useLensTintingColumns } from "./useLensTintingColumns";
import LensTintingFilter from "./LensTintingFilter";

export default function LensTintings() {
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
  const [filters, setFilters] = useState(lensTintingFilters);
  const [tempFilters, setTempFilters] = useState(lensTintingFilters);

  // Tinting data
  const [tintings, setTintings] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tintingToDelete, setTintingToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle delete tinting click
  const handleDeleteClick = (tinting) => {
    setTintingToDelete(tinting);
    setDeleteDialogOpen(true);
  };

  // Get table columns with delete handler
  const columns = useLensTintingColumns(navigate, handleDeleteClick);

  // Fetch tintings from API
  const fetchTintings = async () => {
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

      const response = await getLensTintings(params);
      setTintings(response.data);
      setTotalCount(response.pagination.total);
    } catch (error) {
      console.error("Error fetching lens tintings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch lens tintings",
        variant: "destructive",
      });
      setTintings([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch tintings on mount and when dependencies change
  useEffect(() => {
    fetchTintings();
  }, [pageIndex, pageSize, searchQuery, filters, sorting]);

  // Handle delete tinting
  const handleDeleteConfirm = async () => {
    if (!tintingToDelete) return;

    try {
      setIsDeleting(true);
      await deleteLensTinting(tintingToDelete.id);

      toast({
        title: "Success",
        description: `Lens tinting "${tintingToDelete.name}" has been deleted successfully.`,
      });

      setDeleteDialogOpen(false);
      setTintingToDelete(null);

      // Refresh tinting list
      fetchTintings();
    } catch (error) {
      console.error("Error deleting lens tinting:", error);
      toast({
        title: "Error",
        description:
          error.message ||
          "Failed to delete lens tinting. The tinting may have existing sale orders.",
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
    const clearedFilters = lensTintingFilters;
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
    setShowFilterDialog(false);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters);
    setShowFilterDialog(false);
  };

  // For client-side display, we use the tintings directly from API
  // Backend handles filtering, so we just display what we receive
  const displayTintings = tintings;

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Lens Tintings
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage lens tinting master data
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => navigate("/masters/lens-tinting/add")}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Tinting</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search lens tintings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <LensTintingFilter
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
          data={displayTintings}
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
          emptyMessage="No lens tintings found"
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Lens Tinting?"
        description={
          tintingToDelete
            ? `Are you sure you want to delete "${tintingToDelete.name}"? This action cannot be undone and will fail if the tinting has existing sale orders.`
            : "Are you sure you want to delete this lens tinting?"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
