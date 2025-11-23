import { X, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { getLocationDropdown } from "@/services/location";

export default function TrayFilter({
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
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await getLocationDropdown();
        if (response.success) {
          setLocations([
            { id: null, name: "All Locations" },
            ...response.data
          ]);
        }
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };

    if (showFilterDialog) {
      fetchLocations();
    }
  }, [showFilterDialog]);

  const activeStatusOptions = [
    { id: "all", name: "All" },
    { id: true, name: "Active" },
    { id: false, name: "Inactive" },
  ];

  return (
    <>
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

      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Filter Trays</DialogTitle>
            <DialogDescription className="text-xs">
              Apply filters to refine your tray list
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <FormSelect
              label="Status"
              name="activeStatus"
              options={activeStatusOptions}
              value={tempFilters.activeStatus}
              onChange={(value) => {
                setTempFilters({
                  ...tempFilters,
                  activeStatus: value,
                });
              }}
              placeholder="All trays"
              isSearchable={false}
              isClearable={false}
            />

            <FormSelect
              label="Location"
              name="location_id"
              options={locations}
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
