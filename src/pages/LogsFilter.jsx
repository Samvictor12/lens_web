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
import {
  entityOptions,
  actionOptions,
  severityOptions,
  errorTypeOptions,
  resolvedOptions,
} from "./LogsViewer.constants";

export default function LogsFilter({
  activeTab,
  filters,
  tempFilters,
  setTempFilters,
  showFilterDialog,
  setShowFilterDialog,
  hasActiveFilters,
  onApplyFilters,
  onClearFilters,
  onCancelFilters,
  users = [],
}) {
  const isAuditTab = activeTab === "audit";

  return (
    <Sheet open={showFilterDialog} onOpenChange={setShowFilterDialog}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 relative">
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
          <SheetTitle>
            Filter {isAuditTab ? "Audit" : "Error"} Logs
          </SheetTitle>
          <SheetDescription>
            Apply filters to narrow down the logs list
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Entity Filter (Audit only) */}
          {isAuditTab && (
            <div className="space-y-2">
              <Label htmlFor="entity-filter" className="text-sm font-medium">
                Entity
              </Label>
              <FormSelect
                name="entity"
                options={entityOptions.map((opt) => ({
                  id: opt.value,
                  name: opt.label,
                }))}
                value={tempFilters.entity}
                onChange={(value) =>
                  setTempFilters({ ...tempFilters, entity: value })
                }
                placeholder="Select entity"
                isSearchable={false}
              />
            </div>
          )}

          {/* Action Filter (Audit only) */}
          {isAuditTab && (
            <div className="space-y-2">
              <Label htmlFor="action-filter" className="text-sm font-medium">
                Action
              </Label>
              <FormSelect
                name="action"
                options={actionOptions.map((opt) => ({
                  id: opt.value,
                  name: opt.label,
                }))}
                value={tempFilters.action}
                onChange={(value) =>
                  setTempFilters({ ...tempFilters, action: value })
                }
                placeholder="Select action"
                isSearchable={false}
              />
            </div>
          )}

          {/* Error Type Filter (Error only) */}
          {!isAuditTab && (
            <div className="space-y-2">
              <Label htmlFor="errorType-filter" className="text-sm font-medium">
                Error Type
              </Label>
              <FormSelect
                name="errorType"
                options={errorTypeOptions.map((opt) => ({
                  id: opt.value,
                  name: opt.label,
                }))}
                value={tempFilters.errorType}
                onChange={(value) =>
                  setTempFilters({ ...tempFilters, errorType: value })
                }
                placeholder="Select error type"
                isSearchable={false}
              />
            </div>
          )}

          {/* Severity Filter (Error only) */}
          {!isAuditTab && (
            <div className="space-y-2">
              <Label htmlFor="severity-filter" className="text-sm font-medium">
                Severity
              </Label>
              <FormSelect
                name="severity"
                options={severityOptions.map((opt) => ({
                  id: opt.value,
                  name: opt.label,
                }))}
                value={tempFilters.severity}
                onChange={(value) =>
                  setTempFilters({ ...tempFilters, severity: value })
                }
                placeholder="Select severity"
                isSearchable={false}
              />
            </div>
          )}

          {/* Resolved Status Filter (Error only) */}
          {!isAuditTab && (
            <div className="space-y-2">
              <Label htmlFor="resolved-filter" className="text-sm font-medium">
                Status
              </Label>
              <FormSelect
                name="resolved"
                options={resolvedOptions.map((opt) => ({
                  id: opt.value,
                  name: opt.label,
                }))}
                value={tempFilters.resolved}
                onChange={(value) =>
                  setTempFilters({ ...tempFilters, resolved: value })
                }
                placeholder="Select status"
                isSearchable={false}
              />
            </div>
          )}

          {/* User Filter */}
          <div className="space-y-2">
            <Label htmlFor="userId-filter" className="text-sm font-medium">
              User
            </Label>
            <FormSelect
              name="userId"
              options={[
                { id: null, name: "All Users" },
                ...users.map((user) => ({
                  id: user.id,
                  name: user.name,
                })),
              ]}
              value={tempFilters.userId}
              onChange={(value) =>
                setTempFilters({
                  ...tempFilters,
                  userId: value,
                })
              }
              placeholder="Select user"
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
