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
import { getVendorDropdown } from "@/services/vendor";
import { statusOptions } from "./PurchaseOrder.constants";

export default function PurchaseOrderFilter({
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
  const [vendors, setVendors] = useState([]);

  // Fetch vendors on mount
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await getVendorDropdown();
        if (response.success) {
          setVendors(response.data);
        }
      } catch (error) {
        console.error("Error fetching vendors:", error);
      }
    };

    fetchVendors();
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
              <SheetTitle>Filter Purchase Orders</SheetTitle>
              <SheetDescription>
                Apply filters to refine your purchase order list
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 py-4">
              {/* Active Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status-filter" className="text-sm font-medium">
                  Active Status
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
                  placeholder="All purchase orders"
                  isSearchable={false}
                  isClearable={false}
                />
              </div>

              {/* PO Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="po-status-filter" className="text-sm font-medium">
                  PO Status
                </Label>
                <FormSelect
                  name="status"
                  options={statusOptions}
                  value={tempFilters.status}
                  onChange={(value) => {
                    setTempFilters({
                      ...tempFilters,
                      status: value,
                    });
                  }}
                  placeholder="All statuses"
                  isSearchable={false}
                  isClearable={true}
                />
              </div>

              {/* Vendor Filter */}
              <div className="space-y-2">
                <Label htmlFor="vendor-filter" className="text-sm font-medium">
                  Vendor
                </Label>
                <FormSelect
                  name="vendor_id"
                  options={vendors}
                  value={tempFilters.vendor_id}
                  onChange={(value) => {
                    setTempFilters({
                      ...tempFilters,
                      vendor_id: value,
                    });
                  }}
                  placeholder="All vendors"
                  isSearchable={true}
                  isClearable={true}
                />
              </div>

              {/* Date Range Filters */}
              <div className="space-y-2">
                <Label htmlFor="start-date-filter" className="text-sm font-medium">
                  Order Date From
                </Label>
                <FormInput
                  name="start_date"
                  type="date"
                  value={tempFilters.start_date}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      start_date: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date-filter" className="text-sm font-medium">
                  Order Date To
                </Label>
                <FormInput
                  name="end_date"
                  type="date"
                  value={tempFilters.end_date}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      end_date: e.target.value,
                    })
                  }
                  helperText={tempFilters.start_date ? "Filter orders by date range" : "Select start date first"}
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
