import { useState, useEffect } from "react";
import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getBrandDropdown,
  getCategoryDropdown,
  getMaterialDropdown,
  getTypeDropdown,
} from "@/services/lensProduct";

export default function LensProductFilter({
  filters,
  tempFilters,
  setTempFilters,
  showFilterDialog,
  setShowFilterDialog,
  hasActiveFilters,
  onApplyFilters,
  onClearFilters,
  onCancelFilters,
}) {
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [types, setTypes] = useState([]);

  // Fetch dropdown data on mount
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [brandsData, categoriesData, materialsData, typesData] = await Promise.all([
          getBrandDropdown(),
          getCategoryDropdown(),
          getMaterialDropdown(),
          getTypeDropdown(),
        ]);
        
        setBrands(brandsData);
        setCategories(categoriesData);
        setMaterials(materialsData);
        setTypes(typesData);
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      }
    };

    fetchDropdowns();
  }, []);

  // Active status options for dropdown
  const activeStatusOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  return (
    <>
      {/* Filter Button */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="xs"
          className="gap-1.5 h-8"
          onClick={() => {
            setTempFilters(filters);
            setShowFilterDialog(true);
          }}
        >
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <Badge variant="default" className="ml-1 h-4 px-1 text-xs">
              •
            </Badge>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="xs"
            className="h-8 px-2"
            onClick={onClearFilters}
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline ml-1">Clear</span>
          </Button>
        )}
      </div>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Filter Lens Products</DialogTitle>
            <DialogDescription className="text-xs">
              Apply filters to refine your lens product list
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Active Status Filter */}
            <FormSelect
              label="Status"
              name="activeStatus"
              options={activeStatusOptions}
              value={tempFilters.activeStatus}
              onChange={(value) => {
                setTempFilters({
                  ...tempFilters,
                  activeStatus: value,
                });
              }}
              placeholder="All products"
              isSearchable={false}
              isClearable={false}
            />

            {/* Brand Filter */}
            <FormSelect
              label="Brand"
              name="brand_id"
              options={brands}
              value={tempFilters.brand_id}
              onChange={(value) => {
                setTempFilters({
                  ...tempFilters,
                  brand_id: value,
                });
              }}
              placeholder="All brands"
              isSearchable={true}
              isClearable={true}
              formatOptionLabel={(option) => (
                <div>
                  <div className="font-medium">{option.label}</div>
                  {option.code && (
                    <div className="text-xs text-muted-foreground">{option.code}</div>
                  )}
                </div>
              )}
            />

            {/* Category Filter */}
            <FormSelect
              label="Category"
              name="category_id"
              options={categories}
              value={tempFilters.category_id}
              onChange={(value) => {
                setTempFilters({
                  ...tempFilters,
                  category_id: value,
                });
              }}
              placeholder="All categories"
              isSearchable={true}
              isClearable={true}
              formatOptionLabel={(option) => (
                <div>
                  <div className="font-medium">{option.label}</div>
                  {option.code && (
                    <div className="text-xs text-muted-foreground">{option.code}</div>
                  )}
                </div>
              )}
            />

            {/* Material Filter */}
            <FormSelect
              label="Material"
              name="material_id"
              options={materials}
              value={tempFilters.material_id}
              onChange={(value) => {
                setTempFilters({
                  ...tempFilters,
                  material_id: value,
                });
              }}
              placeholder="All materials"
              isSearchable={true}
              isClearable={true}
              formatOptionLabel={(option) => (
                <div>
                  <div className="font-medium">{option.label}</div>
                  {option.code && (
                    <div className="text-xs text-muted-foreground">{option.code}</div>
                  )}
                </div>
              )}
            />

            {/* Type Filter */}
            <FormSelect
              label="Type"
              name="type_id"
              options={types}
              value={tempFilters.type_id}
              onChange={(value) => {
                setTempFilters({
                  ...tempFilters,
                  type_id: value,
                });
              }}
              placeholder="All types"
              isSearchable={true}
              isClearable={true}
              formatOptionLabel={(option) => (
                <div>
                  <div className="font-medium">{option.label}</div>
                  {option.code && (
                    <div className="text-xs text-muted-foreground">{option.code}</div>
                  )}
                </div>
              )}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={onCancelFilters}
              className="h-8"
            >
              Cancel
            </Button>
            <Button size="xs" onClick={onApplyFilters} className="h-8">
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
