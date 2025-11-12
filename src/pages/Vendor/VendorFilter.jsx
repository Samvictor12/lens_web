import { useState, useEffect } from "react";
import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
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
            <DialogTitle className="text-lg">Filter Vendors</DialogTitle>
            <DialogDescription className="text-xs">
              Apply filters to refine your vendor list
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Active Status Filter */}
            <FormSelect
              label="Status"
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

            {/* Business Category Filter */}
            <FormSelect
              label="Business Category"
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

            {/* City Filter */}
            <FormInput
              label="City"
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancelFilters}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onApplyFilters}
            >
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
