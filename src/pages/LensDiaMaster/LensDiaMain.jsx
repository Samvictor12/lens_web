import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { getLensDias, deleteLensDia } from "@/services/lensDia";
import { lensDiaFilters } from "./LensDia.constants";
import { useLensDiaColumns } from "./useLensDiaColumns";
import LensDiaFilter from "./LensDiaFilter";
import { Refresh } from "@/components/ui/Refresh";

export default function LensDiaMain() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState([]);
  const [filters, setFilters] = useState(lensDiaFilters);
  const [tempFilters, setTempFilters] = useState(lensDiaFilters);
  const [dias, setDias] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [diaToDelete, setDiaToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (dia) => {
    setDiaToDelete(dia);
    setDeleteDialogOpen(true);
  };

  const columns = useLensDiaColumns(navigate, handleDeleteClick);

  const fetchDias = async () => {
    try {
      setIsLoading(true);
      const sortField = sorting[0]?.id || "createdAt";
      const sortDirection = sorting[0]?.desc ? "desc" : "asc";

      const response = await getLensDias(
        pageIndex + 1,
        pageSize,
        searchQuery,
        filters,
        sortField,
        sortDirection
      );

      if (response.success) {
        setDias(response.data);
        setTotalCount(response.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching lens diameters:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch lens diameters",
        variant: "destructive",
      });
      setDias([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    toast({ title: "Refreshed", description: "Lens diameter list has been refreshed." });
  };

  useEffect(() => {
    fetchDias();
  }, [pageIndex, pageSize, searchQuery, filters, sorting, refreshKey]);

  const handleDeleteConfirm = async () => {
    if (!diaToDelete) return;

    try {
      setIsDeleting(true);
      await deleteLensDia(diaToDelete.id);

      toast({
        title: "Success",
        description: `Lens diameter "${diaToDelete.name}" has been deleted successfully.`,
      });

      setDeleteDialogOpen(false);
      setDiaToDelete(null);
      fetchDias();
    } catch (error) {
      console.error("Error deleting lens diameter:", error);
      toast({
        title: "Error",
        description:
          error.message ||
          "Failed to delete lens diameter. The diameter may be in use.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = useMemo(() => {
    return filters.activeStatus !== "all";
  }, [filters]);

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterDialog(false);
  };

  const handleClearFilters = () => {
    setTempFilters(lensDiaFilters);
    setFilters(lensDiaFilters);
    setShowFilterDialog(false);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters);
    setShowFilterDialog(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Lens Diameters</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage lens diameter (Dia) master data
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => navigate("/masters/lens-dia/add")}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Diameter</span>
          </Button>
        </div>
      </div>

      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search lens diameters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Refresh onClick={handleRefresh} />
            <LensDiaFilter
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

      <div className="flex-1 min-h-0">
        <Table
          data={dias}
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
          emptyMessage="No lens diameters found"
        />
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Lens Diameter?"
        description={
          diaToDelete
            ? `Are you sure you want to delete "${diaToDelete.name}"? This action cannot be undone and will fail if the diameter is in use.`
            : "Are you sure you want to delete this lens diameter?"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
