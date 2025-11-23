import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { getLocations, deleteLocation } from "@/services/location";
import { locationFilters } from "./Location.constants";
import { useLocationColumns } from "./useLocationColumns";
import LocationFilter from "./LocationFilter";

export default function Locations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState([]);
  const [filters, setFilters] = useState(locationFilters);
  const [tempFilters, setTempFilters] = useState(locationFilters);

  const [locations, setLocations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (location) => {
    setLocationToDelete(location);
    setDeleteDialogOpen(true);
  };

  const columns = useLocationColumns(navigate, handleDeleteClick);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const sortField = sorting[0]?.id || "createdAt";
      const sortDirection = sorting[0]?.desc ? "desc" : "asc";

      const response = await getLocations(
        pageIndex + 1,
        pageSize,
        searchQuery,
        filters,
        sortField,
        sortDirection
      );

      if (response.success) {
        setLocations(response.data);
        setTotalCount(response.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch locations",
        variant: "destructive",
      });
      setLocations([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [pageIndex, pageSize, searchQuery, filters, sorting]);

  const handleDeleteConfirm = async () => {
    if (!locationToDelete) return;

    try {
      setIsDeleting(true);
      await deleteLocation(locationToDelete.id);

      toast({
        title: "Success",
        description: `Location "${locationToDelete.name}" has been deleted successfully.`,
      });

      setDeleteDialogOpen(false);
      setLocationToDelete(null);
      fetchLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
      toast({
        title: "Error",
        description:
          error.message ||
          "Failed to delete location. The location may have existing trays.",
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
    const clearedFilters = locationFilters;
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
    setShowFilterDialog(false);
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
            Locations
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage warehouse location master data
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => navigate("/masters/location/add")}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Location</span>
          </Button>
        </div>
      </div>

      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <LocationFilter
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
          data={locations}
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
          emptyMessage="No locations found"
        />
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Location?"
        description={
          locationToDelete
            ? `Are you sure you want to delete "${locationToDelete.name}"? This action cannot be undone and will fail if the location has existing trays.`
            : "Are you sure you want to delete this location?"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
