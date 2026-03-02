import { useState, useEffect } from "react";
import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
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
import { getBusinessCategoryDropdown } from "@/services/businessCategory";

export default function VendorFilter({
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
  const [vendorCategories, setVendorCategories] = useState([]);

  // Fetch business categories on mount
  useEffect(() => {
    const fetchBusinessCategories = async () => {
      try {
        const response = await getBusinessCategoryDropdown();
        if (response.success) {
          setVendorCategories(response.data);
        }
      } catch (error) {
        console.error("Error fetching business categories:", error);
      }
    };

    fetchBusinessCategories();
  }, []);

  // Active status options for dropdown
  const activeStatusOptions = [
    { id: "all", name: "All" },
    { id: true, name: "Active" },
    { id: false, name: "Inactive" },
  ];

  return (
    <>
      {/* Filter Button */}
      <div className="flex items-center gap-1.5">
        <Sheet open={showFilterDialog} onOpenChange={setShowFilterDialog}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              className="gap-1.5 h-8 relative"
              onClick={() => setTempFilters(filters)}
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
              <SheetTitle>Filter Vendors</SheetTitle>
              <SheetDescription>
                Apply filters to refine your vendor list
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 py-4">
              {/* Active Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status-filter" className="text-sm font-medium">
                  Status
                </Label>
                <FormSelect
                  name="active_status"
                  options={activeStatusOptions}
                  value={tempFilters.active_status}
                  onChange={(value) => {
                    setTempFilters({
                      ...tempFilters,
                      active_status: value,
                    });
                  }}
                  placeholder="All vendors"
                  isSearchable={false}
                  isClearable={false}
                />
              </div>

              {/* Business Category Filter */}
              <div className="space-y-2">
                <Label htmlFor="category-filter" className="text-sm font-medium">
                  Business Category
                </Label>
                <FormSelect
                  name="category"
                  options={vendorCategories}
                  value={tempFilters.category}
                  onChange={(value) => {
                    setTempFilters({
                      ...tempFilters,
                      category: value,
                    });
                  }}
                  placeholder="All categories"
                  isSearchable={true}
                  isClearable={true}
                />
              </div>

              {/* City Filter */}
              <div className="space-y-2">
                <Label htmlFor="city-filter" className="text-sm font-medium">
                  City
                </Label>
                <FormInput
                  name="city"
                  type="text"
                  placeholder="Enter city name"
                  value={tempFilters.city}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      city: e.target.value,
                    })
                  }
                  helperText="Search vendors by city (case insensitive)"
                />
              </div>
            </div>

            <SheetFooter className="flex flex-row gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={onCancelFilters}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button size="xs" onClick={onApplyFilters} className="flex-1">
                Apply Filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
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
    </>
  );
}
