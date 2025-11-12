import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { getDepartments, deleteDepartment } from "@/services/department";
import { departmentFilters } from "./Department.constants";
import DepartmentFilter from "./DepartmentFilter";
import { useDepartmentColumns } from "./useDepartmentColumns";

export default function Departments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  
  // Pagination states
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Sorting state
  const [sorting, setSorting] = useState([]);

  // Filter states
  const [filters, setFilters] = useState(departmentFilters);
  const [tempFilters, setTempFilters] = useState(departmentFilters);
  
  // Department data
  const [departments, setDepartments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle delete department click
  const handleDeleteClick = (department) => {
    setDepartmentToDelete(department);
    setDeleteDialogOpen(true);
  };

  // Get table columns with delete handler
  const columns = useDepartmentColumns(navigate, handleDeleteClick);

  // Fetch departments from API
  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const sortField = sorting[0]?.id || "createdAt";
      const sortDirection = sorting[0]?.desc ? "desc" : "asc";
      
      const response = await getDepartments(
        pageIndex + 1, // Backend uses 1-indexed pages
        pageSize,
        searchQuery,
        filters,
        sortField,
        sortDirection
      );
      
      if (response.success) {
        setDepartments(response.data);
        setTotalCount(response.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch departments",
        variant: "destructive",
      });
      setDepartments([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch departments on mount and when dependencies change
  useEffect(() => {
    fetchDepartments();
  }, [pageIndex, pageSize, searchQuery, filters, sorting]);

  // Handle delete department
  const handleDeleteConfirm = async () => {
    if (!departmentToDelete) return;

    try {
      setIsDeleting(true);
      await deleteDepartment(departmentToDelete.id);
      
      toast({
        title: "Success",
        description: `Department "${departmentToDelete.department}" has been deleted successfully.`,
      });
      
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
      
      // Refresh department list
      fetchDepartments();
    } catch (error) {
      console.error("Error deleting department:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete department.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.active_status !== "all";
  }, [filters]);

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterDialog(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = departmentFilters;
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
    setShowFilterDialog(false);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters);
    setShowFilterDialog(false);
  };

  // For client-side display, we use the departments directly from API
  // Backend handles filtering, so we just display what we receive
  const displayDepartments = departments;

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Departments
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage department master data
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => navigate("/masters/departments/add")}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Department</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <DepartmentFilter
              filters={filters}
              tempFilters={tempFilters}
              setTempFilters={setTempFilters}
              showFilterDialog={showFilterDialog}
              setShowFilterDialog={setShowFilterDialog}
              hasActiveFilters={hasActiveFilters}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              onCancelFilters={handleCancelFilters}
            />
          </div>
        </div>
      </Card>

      {/* Table View */}
      <div className="flex-1 min-h-0">
        <Table
          data={displayDepartments}
          columns={columns}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPageIndex}
          loading={isLoading}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
          setSorting={setSorting}
          sorting={sorting}
          pagination={true}
          emptyMessage="No departments found"
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Department?"
        description={
          departmentToDelete
            ? `Are you sure you want to delete "${departmentToDelete.department}"? This action cannot be undone.`
            : "Are you sure you want to delete this department?"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
