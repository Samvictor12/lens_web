import { Filter, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../components/ui/sheet';
import { Badge } from '../../components/ui/badge';
import { FormSelect } from '../../components/ui/form-select';
import { Label } from '../../components/ui/label';
import { activeStatusOptions } from './LensMaterial.constants';

export const LensMaterialFilter = ({
  filters,
  tempFilters,
  setTempFilters,
  showFilterDialog,
  setShowFilterDialog,
  hasActiveFilters,
  onApplyFilters,
  onClearFilters,
  onCancelFilters,
}) => {
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
              <SheetTitle>Filter Lens Materials</SheetTitle>
              <SheetDescription>
                Apply filters to narrow down the list of lens materials
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 py-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="filter-status" className="text-sm font-medium">
                  Status
                </Label>
                <FormSelect
                  name="activeStatus"
                  options={[
                    { id: "all", name: "All Status" },
                    ...activeStatusOptions.map(opt => ({ id: opt.value.toString(), name: opt.label }))
                  ]}
                  value={tempFilters.activeStatus}
                  onChange={(value) =>
                    setTempFilters({ ...tempFilters, activeStatus: value })
                  }
                  placeholder="All Status"
                  isSearchable={false}
                  isClearable={false}
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
};
