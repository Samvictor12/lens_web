import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { STATUS_CONFIG } from "./Billing.constants";

export default function BillingFilter({
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
          <SheetTitle>Filter Invoices</SheetTitle>
          <SheetDescription>
            Apply filters to refine your invoice list
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Invoice Status</Label>
            <Select
              value={tempFilters.status}
              onValueChange={(v) => setTempFilters({ ...tempFilters, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">From Date</Label>
            <Input
              type="date"
              value={tempFilters.startDate}
              onChange={(e) =>
                setTempFilters({ ...tempFilters, startDate: e.target.value })
              }
            />
          </div>

          {/* To Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">To Date</Label>
            <Input
              type="date"
              value={tempFilters.endDate}
              onChange={(e) =>
                setTempFilters({ ...tempFilters, endDate: e.target.value })
              }
            />
          </div>
        </div>

        <SheetFooter className="gap-2 flex-row justify-end">
          <Button variant="outline" onClick={onClearFilters}>
            Clear All
          </Button>
          <Button variant="outline" onClick={onCancelFilters}>
            Cancel
          </Button>
          <Button onClick={onApplyFilters}>Apply Filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
