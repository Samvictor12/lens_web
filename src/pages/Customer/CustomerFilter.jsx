import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CustomerFilter({
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
            <DialogTitle className="text-lg">Filter Customers</DialogTitle>
            <DialogDescription className="text-xs">
              Apply filters to refine your customer list
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status Filter */}
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-medium">
                Outstanding Status
              </Label>
              <select
                id="status"
                value={tempFilters.status}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, status: e.target.value })
                }
                className="w-full h-8 px-2 text-xs border rounded-md bg-background"
              >
                <option value="all">All</option>
                <option value="outstanding">Outstanding</option>
                <option value="clear">Clear</option>
              </select>
            </div>

            {/* Credit Limit Range */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Credit Limit Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={tempFilters.minCreditLimit}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        minCreditLimit: e.target.value,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={tempFilters.maxCreditLimit}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        maxCreditLimit: e.target.value,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Outstanding Balance Range */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Outstanding Balance Range
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={tempFilters.minOutstanding}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        minOutstanding: e.target.value,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={tempFilters.maxOutstanding}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        maxOutstanding: e.target.value,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Email Filter */}
            <div className="space-y-1.5">
              <Label htmlFor="hasEmail" className="text-xs font-medium">
                Has Email
              </Label>
              <select
                id="hasEmail"
                value={tempFilters.hasEmail}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, hasEmail: e.target.value })
                }
                className="w-full h-8 px-2 text-xs border rounded-md bg-background"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* GST Filter */}
            <div className="space-y-1.5">
              <Label htmlFor="hasGST" className="text-xs font-medium">
                Has GST Number
              </Label>
              <select
                id="hasGST"
                value={tempFilters.hasGST}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, hasGST: e.target.value })
                }
                className="w-full h-8 px-2 text-xs border rounded-md bg-background"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
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
