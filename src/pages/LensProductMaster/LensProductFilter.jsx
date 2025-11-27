import { useState, useEffect } from "react";
import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  getBrandDropdown,
  getCategoryDropdown,
  getMaterialDropdown,
  getTypeDropdown,
} from "@/services/lensProduct";

export default function LensProductFilter({
  open,
  onOpenChange,
  filters,
  onFilterChange,
  onApply,
  onCancel,
  hasActiveFilters,
}) {
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [types, setTypes] = useState([]);

  // Fetch dropdown data on mount
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [brandsData, categoriesData, materialsData, typesData] =
          await Promise.all([
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
    { id: "all", name: "All Statuses" },
    { id: "active", name: "Active" },
    { id: "inactive", name: "Inactive" },
  ];

  return (
    <>
      {/* Filter Button */}
      <div className="flex items-center gap-1.5">
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              className="gap-1.5 h-8 relative"
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="text-sm">Filters</span>
              {hasActiveFilters && (
                <Badge variant="default" className="ml-1 h-4 px-1 text-xs">
                  •
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter Lens Products</SheetTitle>
              <SheetDescription>
                Apply filters to refine your lens product list
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 py-4">
              {/* Active Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status-filter" className="text-sm font-medium">
                  Status
                </Label>
                <FormSelect
                  name="activeStatus"
                  options={activeStatusOptions}
                  value={filters.activeStatus}
                  onChange={(value) =>
                    onFilterChange({ ...filters, activeStatus: value })
                  }
                  placeholder="Select status"
                  isSearchable={false}
                />
              </div>

              {/* Brand Filter */}
              <div className="space-y-2">
                <Label htmlFor="brand-filter" className="text-sm font-medium">
                  Brand
                </Label>
                <FormSelect
                  name="brand_id"
                  options={[
                    { id: null, name: "All Brands" },
                    ...brands,
                  ]}
                  value={filters.brand_id}
                  onChange={(value) =>
                    onFilterChange({ ...filters, brand_id: value })
                  }
                  placeholder="Select brand"
                  isSearchable={true}
                />
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label
                  htmlFor="category-filter"
                  className="text-sm font-medium"
                >
                  Category
                </Label>
                <FormSelect
                  name="category_id"
                  options={[
                    { id: null, name: "All Categories" },
                    ...categories,
                  ]}
                  value={filters.category_id}
                  onChange={(value) =>
                    onFilterChange({ ...filters, category_id: value })
                  }
                  placeholder="Select category"
                  isSearchable={true}
                />
              </div>

              {/* Material Filter */}
              <div className="space-y-2">
                <Label
                  htmlFor="material-filter"
                  className="text-sm font-medium"
                >
                  Material
                </Label>
                <FormSelect
                  name="material_id"
                  options={[
                    { id: null, name: "All Materials" },
                    ...materials,
                  ]}
                  value={filters.material_id}
                  onChange={(value) =>
                    onFilterChange({ ...filters, material_id: value })
                  }
                  placeholder="Select material"
                  isSearchable={true}
                />
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="type-filter" className="text-sm font-medium">
                  Type
                </Label>
                <FormSelect
                  name="type_id"
                  options={[
                    { id: null, name: "All Types" },
                    ...types,
                  ]}
                  value={filters.type_id}
                  onChange={(value) =>
                    onFilterChange({ ...filters, type_id: value })
                  }
                  placeholder="Select type"
                  isSearchable={true}
                />
              </div>
            </div>

            <SheetFooter className="flex flex-row gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button size="xs" onClick={onApply} className="flex-1">
                Apply Filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        {/* Clear button is outside, handled by parent component */}
      </div>
    </>
  );
}
