import { Filter } from "lucide-react";
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

const activeStatusOptions = [
  { id: "all", name: "All" },
  { id: true, name: "Active" },
  { id: false, name: "Inactive" },
];

const offerTypeOptions = [
  { id: "all", name: "All Types" },
  { id: "VALUE", name: "Value (Fixed Amount)" },
  { id: "PERCENTAGE", name: "Percentage" },
  { id: "EXCHANGE_PRODUCT", name: "Exchange Product" },
];

export default function LensOffersFilter({
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
  return (
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
            <SheetTitle>Filter Lens Offers</SheetTitle>
            <SheetDescription>
              Apply filters to refine your lens offers list
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Offer Type Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Offer Type</Label>
              <FormSelect
                name="offerType"
                options={offerTypeOptions}
                value={tempFilters.offerType}
                onChange={(value) =>
                  setTempFilters({ ...tempFilters, offerType: value })
                }
                placeholder="All types"
                isSearchable={false}
                isClearable={false}
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <FormSelect
                name="activeStatus"
                options={activeStatusOptions}
                value={tempFilters.activeStatus}
                onChange={(value) =>
                  setTempFilters({ ...tempFilters, activeStatus: value })
                }
                placeholder="All"
                isSearchable={false}
                isClearable={false}
              />
            </div>
          </div>

          <SheetFooter className="flex flex-row gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={onClearFilters}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={onCancelFilters}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button size="xs" onClick={onApplyFilters} className="flex-1">
              Apply
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
