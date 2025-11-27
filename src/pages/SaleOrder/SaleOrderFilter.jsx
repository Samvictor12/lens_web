import { Button } from "@/components/ui/button";
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
import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FormSelect } from "@/components/ui/form-select";
import { FormInput } from "@/components/ui/form-input";
import { orderStatusOptions } from "./SaleOrder.constants";

export default function SaleOrderFilter({
  filters,
  tempFilters,
  setTempFilters,
  showFilterDialog,
  setShowFilterDialog,
  hasActiveFilters,
  onApplyFilters,
  onClearFilters,
  onCancelFilters,
  customers = [],
}) {
  return (
    <Sheet open={showFilterDialog} onOpenChange={setShowFilterDialog}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 relative"
        >
          <Filter className="h-3.5 w-3.5" />
          <span className="text-sm">Filters</span>
          {hasActiveFilters && (
            <Badge
              variant="default"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
            >
              !
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Sale Orders</SheetTitle>
          <SheetDescription>
            Apply filters to narrow down the sale orders list
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status-filter" className="text-sm font-medium">
              Status
            </Label>
            <FormSelect
              name="status"
              options={[
                { id: null, name: "All Statuses" },
                ...orderStatusOptions.map((opt) => ({
                  id: opt.value,
                  name: opt.label,
                })),
              ]}
              value={tempFilters.status}
              onChange={(value) =>
                setTempFilters({ ...tempFilters, status: value })
              }
              placeholder="Select status"
              isSearchable={false}
            />
          </div>

          {/* Customer Filter */}
          <div className="space-y-2">
            <Label htmlFor="customer-filter" className="text-sm font-medium">
              Customer
            </Label>
            <FormSelect
              name="customerId"
              options={[
                { id: null, name: "All Customers" },
                ...customers.map((customer) => ({
                  id: customer.id,
                  name: customer.name,
                })),
              ]}
              value={tempFilters.customerId}
              onChange={(value) =>
                setTempFilters({ ...tempFilters, customerId: value })
              }
              placeholder="Select customer"
              isSearchable={true}
            />
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <FormInput
                label="Start Date"
                type="date"
                name="startDate"
                value={tempFilters.startDate || ""}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, startDate: e.target.value })
                }
              />
              <FormInput
                label="End Date"
                type="date"
                name="endDate"
                value={tempFilters.endDate || ""}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, endDate: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <SheetFooter className="flex flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="flex-1"
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Clear All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelFilters}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button size="sm" onClick={onApplyFilters} className="flex-1">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
