import { useState, useEffect } from "react";
import { X, Filter } from "lucide-react";
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
              <SheetTitle>Filter Users</SheetTitle>
              <SheetDescription>
                Apply filters to refine your user list
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 py-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status-filter" className="text-sm font-medium">
                  Status
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
                  placeholder="All users"
                  isSearchable={false}
                  isClearable={false}
                />
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <Label htmlFor="department-filter" className="text-sm font-medium">
                  Department
                </Label>
                <FormSelect
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
              </div>

              {/* Role Filter */}
              <div className="space-y-2">
                <Label htmlFor="role-filter" className="text-sm font-medium">
                  Role
                </Label>
                <FormSelect
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
