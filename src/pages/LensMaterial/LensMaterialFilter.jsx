import { Filter, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
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
      <Button
        variant={hasActiveFilters ? 'default' : 'outline'}
        size="sm"
        onClick={() => setShowFilterDialog(true)}
        className="gap-2"
      >
        <Filter className="h-4 w-4" />
        Filter
        {hasActiveFilters && (
          <span className="ml-1 rounded-full bg-background px-2 py-0.5 text-xs font-semibold">
            {Object.values(filters).filter(Boolean).length}
          </span>
        )}
      </Button>

      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filter Lens Materials</DialogTitle>
            <DialogDescription>
              Apply filters to narrow down the list of lens materials.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="filter-search">Search</Label>
              <Input
                id="filter-search"
                placeholder="Search by name or description..."
                value={tempFilters.search}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, search: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filter-status">Status</Label>
              <Select
                value={tempFilters.activeStatus}
                onValueChange={(value) =>
                  setTempFilters({ ...tempFilters, activeStatus: value })
                }
              >
                <SelectTrigger id="filter-status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  {activeStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClearFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
            <Button type="button" variant="outline" onClick={onCancelFilters}>
              Cancel
            </Button>
            <Button type="submit" onClick={onApplyFilters}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
