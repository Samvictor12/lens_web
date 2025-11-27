import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Layers, ChevronDown, ChevronRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { getLensProducts, getGroupedLensProducts, deleteLensProduct } from "@/services/lensProduct";
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
  const [groupBy, setGroupBy] = useState(null);
  const [groupedData, setGroupedData] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [groupProducts, setGroupProducts] = useState({});
  const [loadingGroups, setLoadingGroups] = useState({});
  const [secondaryGroupBy, setSecondaryGroupBy] = useState({});
  const [secondaryGroupedData, setSecondaryGroupedData] = useState({});

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleGroupClick = async (groupKey, groupValue) => {
    // Toggle expansion
    if (expandedGroups[groupKey]) {
      setExpandedGroups({ ...expandedGroups, [groupKey]: false });
      return;
    }

    // If already fetched, just expand
    if (groupProducts[groupKey] || secondaryGroupedData[groupKey]) {
      setExpandedGroups({ ...expandedGroups, [groupKey]: true });
      return;
    }

    // Check if secondary grouping is enabled for this group
    const hasSecondaryGroup = secondaryGroupBy[groupKey];

    // Fetch products for this group
    setLoadingGroups({ ...loadingGroups, [groupKey]: true });
    try {
      if (hasSecondaryGroup) {
        // Fetch grouped data for secondary grouping
        const response = await getGroupedLensProducts(hasSecondaryGroup, {
          [groupBy]: groupValue,
          search: searchQuery,
          activeStatus: filters.activeStatus,
        });
        setSecondaryGroupedData({ 
          ...secondaryGroupedData, 
          [groupKey]: response.data || [] 
        });
      } else {
        // Fetch products directly
        const groupFilter = {
          page: 1,
          limit: 100,
          search: searchQuery,
          activeStatus: filters.activeStatus,
        };
        
        groupFilter[groupBy] = groupValue;
        
        const response = await getLensProducts(groupFilter);
        setGroupProducts({ ...groupProducts, [groupKey]: response.data });
      }
      
      setExpandedGroups({ ...expandedGroups, [groupKey]: true });
    } catch (error) {
      console.error("Error fetching group products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products for this group",
        variant: "destructive",
      });
    } finally {
      setLoadingGroups({ ...loadingGroups, [groupKey]: false });
    }
  };

  const handleSecondaryGroupClick = async (primaryGroupKey, secondaryGroupKey, primaryGroupValue, secondaryGroupValue) => {
    const fullKey = `${primaryGroupKey}_${secondaryGroupKey}`;
    
    // Toggle expansion
    if (expandedGroups[fullKey]) {
      setExpandedGroups({ ...expandedGroups, [fullKey]: false });
      return;
    }

    // If already fetched, just expand
    if (groupProducts[fullKey]) {
      setExpandedGroups({ ...expandedGroups, [fullKey]: true });
      return;
    }

    // Fetch products for this secondary group
    setLoadingGroups({ ...loadingGroups, [fullKey]: true });
    try {
      const groupFilter = {
        page: 1,
        limit: 100,
        search: searchQuery,
        activeStatus: filters.activeStatus,
        [groupBy]: primaryGroupValue,
        [secondaryGroupBy[primaryGroupKey]]: secondaryGroupValue,
      };
      
      const response = await getLensProducts(groupFilter);
      setGroupProducts({ ...groupProducts, [fullKey]: response.data });
      setExpandedGroups({ ...expandedGroups, [fullKey]: true });
    } catch (error) {
      console.error("Error fetching secondary group products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products for this group",
        variant: "destructive",
      });
    } finally {
      setLoadingGroups({ ...loadingGroups, [fullKey]: false });
    }
  };

  const handleSecondaryGroupChange = async (groupKey, value, groupValue) => {
    setSecondaryGroupBy({ ...secondaryGroupBy, [groupKey]: value });
    // Clear cached data for this group
    const newGroupProducts = { ...groupProducts };
    const newSecondaryGroupedData = { ...secondaryGroupedData };
    
    delete newGroupProducts[groupKey];
    delete newSecondaryGroupedData[groupKey];
    
    setGroupProducts(newGroupProducts);
    setSecondaryGroupedData(newSecondaryGroupedData);

    // If a secondary grouping is selected, fetch and auto-expand
    if (value) {
      setLoadingGroups({ ...loadingGroups, [groupKey]: true });
      try {
        const response = await getGroupedLensProducts(value, {
          [groupBy]: groupValue,
          search: searchQuery,
          activeStatus: filters.activeStatus,
        });
        setSecondaryGroupedData({ 
          ...secondaryGroupedData, 
          [groupKey]: response.data || [] 
        });
        // Keep the accordion expanded
        setExpandedGroups({ ...expandedGroups, [groupKey]: true });
      } catch (error) {
        console.error("Error fetching secondary grouped data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch sub-grouped data",
          variant: "destructive",
        });
      } finally {
        setLoadingGroups({ ...loadingGroups, [groupKey]: false });
      }
    } else {
      // If "No Sub-grouping" selected, keep expanded and fetch products
      setLoadingGroups({ ...loadingGroups, [groupKey]: true });
      try {
        const groupFilter = {
          page: 1,
          limit: 100,
          search: searchQuery,
          activeStatus: filters.activeStatus,
          [groupBy]: groupValue,
        };
        
        const response = await getLensProducts(groupFilter);
        setGroupProducts({ ...groupProducts, [groupKey]: response.data });
        setExpandedGroups({ ...expandedGroups, [groupKey]: true });
      } catch (error) {
        console.error("Error fetching group products:", error);
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        });
      } finally {
        setLoadingGroups({ ...loadingGroups, [groupKey]: false });
      }
    }
  };

  const columns = useLensProductColumns(navigate, handleDeleteClick);

  const groupingOptions = [
    { id: null, name: "No Grouping" },
    { id: "brand_id", name: "Brand" },
    { id: "category_id", name: "Category" },
    { id: "material_id", name: "Material" },
    { id: "type_id", name: "Type" },
  ];

  const getSecondaryGroupingOptions = (primaryGroup) => {
    return groupingOptions.filter(opt => opt.id !== null && opt.id !== primaryGroup);
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      
      if (groupBy) {
        // Fetch grouped data from backend
        const response = await getGroupedLensProducts(groupBy, {
          search: searchQuery,
          ...filters,
        });
        setGroupedData(response.data || []);
        setProducts([]);
        setTotalCount(0);
      } else {
        // Fetch paginated data
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
        setGroupedData([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch lens products",
        variant: "destructive",
      });
      setProducts([]);
      setTotalCount(0);
      setGroupedData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [pageIndex, pageSize, searchQuery, filters, sorting, groupBy]);

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
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* Group By Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Group by:
            </span>
            <div className="w-40">
              <FormSelect
                name="groupBy"
                options={groupingOptions}
                value={groupBy}
                onChange={(value) => {
                  setGroupBy(value);
                  setExpandedGroups({});
                  setGroupProducts({});
                  setSecondaryGroupBy({});
                  setSecondaryGroupedData({});
                }}
                placeholder="None"
                isSearchable={false}
                isClearable={false}
              />
            </div>
          </div>

          <LensProductFilter
            open={showFilterDialog}
            onOpenChange={setShowFilterDialog}
            filters={tempFilters}
            onFilterChange={setTempFilters}
            onApply={handleApplyFilters}
            onCancel={handleCancelFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="xs"
              className="h-8 px-2"
              onClick={handleClearFilters}
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline ml-1">Clear</span>
            </Button>
          )}
        </div>
      </Card>

      {/* Table View */}
      <div className="flex-1 min-h-0 overflow-auto">
        {groupBy ? (
          isLoading ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading grouped data...</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {groupedData.map((group) => {
                const groupKey = `${groupBy}_${group[groupBy]}`;
                const isExpanded = expandedGroups[groupKey];
                const isLoadingGroup = loadingGroups[groupKey];
                const products = groupProducts[groupKey] || [];
                
                return (
                  <Card key={groupKey} className="overflow-hidden">
                    <div 
                      className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleGroupClick(groupKey, group[groupBy])}
                    >
                      <div className="flex items-center gap-2">
                        {isLoadingGroup ? (
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        ) : isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-primary" />
                        )}
                        <Layers className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm">
                          {group.name}
                          <span className="ml-2 text-xs text-muted-foreground font-normal">
                            ({group.count} {group.count === 1 ? 'product' : 'products'})
                          </span>
                        </h3>
                        {isLoadingGroup && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            Loading...
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="border-t">
                        {/* Secondary Grouping Selector */}
                        <div className="p-3 bg-muted/30 border-b flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Group by:
                          </span>
                          <div className="w-40">
                            <FormSelect
                              name={`secondary_${groupKey}`}
                              options={[
                                { id: null, name: "No Sub-grouping" },
                                ...getSecondaryGroupingOptions(groupBy),
                              ]}
                              value={secondaryGroupBy[groupKey] || null}
                              onChange={(value) => handleSecondaryGroupChange(groupKey, value, group[groupBy])}
                              placeholder="None"
                              isSearchable={false}
                              isClearable={false}
                            />
                          </div>
                          {isLoadingGroup && secondaryGroupBy[groupKey] && (
                            <div className="flex items-center gap-1.5 ml-2">
                              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                              <span className="text-xs text-muted-foreground">Loading sub-groups...</span>
                            </div>
                          )}
                        </div>

                        {/* Secondary Groups or Products */}
                        {secondaryGroupedData[groupKey] && secondaryGroupedData[groupKey].length > 0 ? (
                          <div className="p-2 space-y-2">
                            {secondaryGroupedData[groupKey].map((secondaryGroup) => {
                              const secondaryGroupKey = `${secondaryGroupBy[groupKey]}_${secondaryGroup[secondaryGroupBy[groupKey]]}`;
                              const fullKey = `${groupKey}_${secondaryGroupKey}`;
                              const isSecondaryExpanded = expandedGroups[fullKey];
                              const isSecondaryLoading = loadingGroups[fullKey];
                              const secondaryProducts = groupProducts[fullKey] || [];

                              return (
                                <Card key={secondaryGroupKey} className="overflow-hidden">
                                  <div
                                    className="p-2 cursor-pointer hover:bg-accent/30 transition-colors"
                                    onClick={() => handleSecondaryGroupClick(
                                      groupKey,
                                      secondaryGroupKey,
                                      group[groupBy],
                                      secondaryGroup[secondaryGroupBy[groupKey]]
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      {isSecondaryLoading ? (
                                        <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                                      ) : isSecondaryExpanded ? (
                                        <ChevronDown className="h-3.5 w-3.5 text-primary" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5 text-primary" />
                                      )}
                                      <h4 className="font-medium text-xs">
                                        {secondaryGroup.name}
                                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                                          ({secondaryGroup.count} {secondaryGroup.count === 1 ? 'product' : 'products'})
                                        </span>
                                      </h4>
                                      {isSecondaryLoading && (
                                        <span className="ml-auto text-xs text-muted-foreground">
                                          Loading...
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {isSecondaryExpanded && secondaryProducts.length > 0 && (
                                    <div className="border-t">
                                      <Table
                                        data={secondaryProducts}
                                        columns={columns}
                                        pageIndex={0}
                                        pageSize={secondaryProducts.length}
                                        totalCount={secondaryProducts.length}
                                        loading={false}
                                        setSorting={setSorting}
                                        sorting={sorting}
                                        pagination={false}
                                        emptyMessage="No products"
                                      />
                                    </div>
                                  )}
                                </Card>
                              );
                            })}
                          </div>
                        ) : products.length > 0 ? (
                          <Table
                            data={products}
                            columns={columns}
                            pageIndex={0}
                            pageSize={products.length}
                            totalCount={products.length}
                            loading={false}
                            setSorting={setSorting}
                            sorting={sorting}
                            pagination={false}
                            emptyMessage="No products in this group"
                          />
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {isLoadingGroup ? "Loading..." : "No products found"}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
              {groupedData.length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No lens products found</p>
                </Card>
              )}
            </div>
          )
        ) : (
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
        )}
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
