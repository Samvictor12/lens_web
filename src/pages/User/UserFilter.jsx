import { useState, useEffect } from "react";
import { X, Filter } from "lucide-react";
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
import { getDepartmentDropdown } from "@/services/department";
import { roleOptions } from "./User.constants";

export default function UserFilter({
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
  const [departments, setDepartments] = useState([]);

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await getDepartmentDropdown();
        if (response.success) {
          setDepartments(response.data);
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };

    fetchDepartments();
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
            <DialogTitle className="text-lg">Filter Users</DialogTitle>
            <DialogDescription className="text-xs">
              Apply filters to refine your user list
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Status Filter */}
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
              placeholder="All users"
              isSearchable={false}
              isClearable={false}
            />

            {/* Department Filter */}
            <FormSelect
              label="Department"
              name="department_id"
              options={departments}
              value={tempFilters.department_id}
              onChange={(value) => {
                setTempFilters({
                  ...tempFilters,
                  department_id: value,
                });
              }}
              placeholder="All departments"
              isSearchable={true}
              isClearable={true}
            />

            {/* Role Filter */}
            <FormSelect
              label="Role"
              name="role_id"
              options={roleOptions}
              value={tempFilters.role_id}
              onChange={(value) => {
                setTempFilters({
                  ...tempFilters,
                  role_id: value,
                });
              }}
              placeholder="All roles"
              isSearchable={false}
              isClearable={true}
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
              variant="outline"
              size="sm"
              onClick={onClearFilters}
            >
              Clear All
            </Button>
            <Button type="button" size="sm" onClick={onApplyFilters}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
