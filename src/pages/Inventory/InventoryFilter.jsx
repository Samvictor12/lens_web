import React from 'react';
import { X, Filter } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { FormSelect } from '@/components/ui/form-select';
import { Badge } from '@/components/ui/badge';

// Constants
import { inventoryStatusOptions } from './Inventory.constants';

const InventoryFilter = ({
  filters,
  tempFilters,
  setTempFilters,
  showFilterDialog,
  setShowFilterDialog,
  hasActiveFilters,
  onApplyFilters,
  onClearFilters,
  onCancelFilters,
  dropdownData = {}, 
}) => {
  // Transform status options for FormSelect
  const statusOptions = [
    { id: 'all', name: 'All Statuses' },
    ...inventoryStatusOptions.map(option => ({ id: option.value, name: option.label }))
  ];

  // Transform dropdown data for FormSelect
  const lensProductOptions = dropdownData.lensProducts?.map(item => ({ id: item.id, name: item.name })) || [];
  const categoryOptions = dropdownData.categories?.map(item => ({ id: item.id, name: item.name })) || [];
  const locationOptions = dropdownData.locations?.map(item => ({ id: item.id, name: item.name })) || [];



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
              <SheetTitle>Filter Inventory</SheetTitle>
              <SheetDescription>
                Apply filters to refine your inventory list
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
                  isClearable={false}
                />
              </div>

              {/* Lens Product Filter */}
              <div className="space-y-2">
                <Label htmlFor="lens-filter" className="text-sm font-medium">
                  Lens Product
                </Label>
                <FormSelect
                  name="lens_id"
                  options={lensProductOptions}
                  value={tempFilters.lens_id}
                  onChange={(value) => {
                    setTempFilters({
                      ...tempFilters,
                      lens_id: value,
                    });
                  }}
                  placeholder="All lens products"
                  isSearchable={true}
                  isClearable={true}
                />
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label htmlFor="category-filter" className="text-sm font-medium">
                  Category
                </Label>
                <FormSelect
                  name="category_id"
                  options={categoryOptions}
                  value={tempFilters.category_id}
                  onChange={(value) => {
                    setTempFilters({
                      ...tempFilters,
                      category_id: value,
                    });
                  }}
                  placeholder="All categories"
                  isSearchable={true}
                  isClearable={true}
                />
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <Label htmlFor="location-filter" className="text-sm font-medium">
                  Location
                </Label>
                <FormSelect
                  name="location_id"
                  options={locationOptions}
                  value={tempFilters.location_id}
                  onChange={(value) => {
                    setTempFilters({
                      ...tempFilters,
                      location_id: value,
                    });
                  }}
                  placeholder="All locations"
                  isSearchable={true}
                  isClearable={true}
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

export default InventoryFilter;