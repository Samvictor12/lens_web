import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { getLensProducts, deleteLensProduct } from "@/services/lensProduct";
import { lensProductFilters } from "./LensProduct.constants";
import LensProductFilter from "./LensProductFilter";
import { useLensProductColumns } from "./useLensProductColumns";

export default function LensProductMain() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState([]);
  const [filters, setFilters] = useState(lensProductFilters);
  const [tempFilters, setTempFilters] = useState(lensProductFilters);
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const columns = useLensProductColumns(navigate, handleDeleteClick);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const sortField = sorting[0]?.id || "createdAt";
      const sortDirection = sorting[0]?.desc ? "desc" : "asc";
      const response = await getLensProducts({
        page: pageIndex + 1,
        limit: pageSize,
        search: searchQuery,
        ...filters,
        sortBy: sortField,
        sortOrder: sortDirection,
      });
      setProducts(response.data);
      setTotalCount(response.pagination.total);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch lens products",
        variant: "destructive",
      });
      setProducts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [pageIndex, pageSize, searchQuery, filters, sorting]);

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await deleteLensProduct(productToDelete.id);
      toast({
        title: "Success",
        description: "Lens product deleted successfully",
      });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete lens product",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    const defaultValue = lensProductFilters[key];
    if (key === "activeStatus") return value !== "all";
    return value !== defaultValue && value !== null && value !== "";
  });

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterDialog(false);
    setPageIndex(0);
  };

  const handleClearFilters = () => {
    const clearedFilters = { ...lensProductFilters };
    setFilters(clearedFilters);
    setTempFilters(clearedFilters);
    setShowFilterDialog(false);
    setPageIndex(0);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters);
    setShowFilterDialog(false);
  };

  const handleSort = (columnId) => {
    setSorting((prev) => {
      const existingSort = prev.find((s) => s.id === columnId);
      if (existingSort) return [{ id: columnId, desc: !existingSort.desc }];
      return [{ id: columnId, desc: false }];
    });
  };

  const handlePageChange = (newPage) => setPageIndex(newPage);
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPageIndex(0);
  };

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Lens Products
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your lens product catalog with pricing
          </p>
        </div>
        <Button
          size="xs"
          className="gap-1.5 h-8"
          onClick={() => navigate("/masters/lens-product/add")}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add Product</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search products by code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <LensProductFilter
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
          data={products}
          columns={columns}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          loading={isLoading}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
          setSorting={setSorting}
          sorting={sorting}
          pagination={true}
          emptyMessage="No lens products found"
        />
      </div>
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteProduct}
        title="Delete Lens Product"
        description={
          productToDelete
            ? `Are you sure you want to delete "${productToDelete.lensName}" (${productToDelete.productCode})? This action cannot be undone.`
            : ""
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
