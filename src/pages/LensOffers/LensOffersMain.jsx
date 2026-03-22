import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { getLensOffers, deleteLensOffer } from "@/services/lensOffers";
import { lensOffersFilters } from "./LensOffers.constants";
import { useLensOffersColumns } from "./useLensOffersColumns";
import LensOffersFilter from "./LensOffersFilter";

export default function LensOffersMain() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  // Pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Sorting
  const [sorting, setSorting] = useState([]);

  // Filters
  const [filters, setFilters] = useState(lensOffersFilters);
  const [tempFilters, setTempFilters] = useState(lensOffersFilters);

  // Data
  const [offers, setOffers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (offer) => {
    setOfferToDelete(offer);
    setDeleteDialogOpen(true);
  };

  const columns = useLensOffersColumns(navigate, handleDeleteClick);

  const fetchOffers = async () => {
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
        offerType: filters.offerType !== "all" ? filters.offerType : undefined,
      };

      const response = await getLensOffers(params);
      setOffers(response.data);
      setTotalCount(response.pagination.total);
    } catch (error) {
      console.error("Error fetching lens offers:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch lens offers",
        variant: "destructive",
      });
      setOffers([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [pageIndex, pageSize, searchQuery, filters, sorting]);

  const handleDeleteConfirm = async () => {
    if (!offerToDelete) return;
    try {
      setIsDeleting(true);
      await deleteLensOffer(offerToDelete.id);
      toast({
        title: "Success",
        description: `Lens offer "${offerToDelete.offerName}" has been deleted successfully.`,
      });
      setDeleteDialogOpen(false);
      setOfferToDelete(null);
      fetchOffers();
    } catch (error) {
      console.error("Error deleting lens offer:", error);
      toast({
        title: "Error",
        description:
          error.message ||
          "Failed to delete lens offer. It may be linked to existing sale orders.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = useMemo(() => {
    return filters.activeStatus !== "all" || filters.offerType !== "all";
  }, [filters]);

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterDialog(false);
  };

  const handleClearFilters = () => {
    setTempFilters(lensOffersFilters);
    setFilters(lensOffersFilters);
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
            Lens Offers
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage promotional offers on lenses
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => navigate("/masters/lens-offers/add")}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Offer</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search lens offers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <LensOffersFilter
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

      {/* Table */}
      <div className="flex-1 min-h-0">
        <Table
          data={offers}
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
          emptyMessage="No lens offers found"
        />
      </div>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Lens Offer?"
        description={
          offerToDelete
            ? `Are you sure you want to delete "${offerToDelete.offerName}"? This cannot be undone and will fail if the offer is linked to sale orders.`
            : "Are you sure you want to delete this lens offer?"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
