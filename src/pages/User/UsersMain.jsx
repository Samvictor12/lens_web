import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { getUsers, deleteUser } from "@/services/user";
import { userFilters } from "./User.constants";
import UserFilter from "./UserFilter";
import { useUserColumns } from "./useUserColumns";
import UserLoginDialog from "./UserLoginDialog";

export default function Users() {
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
  const [filters, setFilters] = useState(userFilters);
  const [tempFilters, setTempFilters] = useState(userFilters);
  
  // User data
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Login dialog state
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Handle delete user click
  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  // Handle login settings click
  const handleLoginClick = (user) => {
    setSelectedUser(user);
    setLoginDialogOpen(true);
  };

  // Get table columns with delete and login handlers
  const columns = useUserColumns(navigate, handleDeleteClick, handleLoginClick);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const sortField = sorting[0]?.id || "createdAt";
      const sortDirection = sorting[0]?.desc ? "desc" : "asc";
      
      const response = await getUsers(
        pageIndex + 1, // Backend uses 1-indexed pages
        pageSize,
        searchQuery,
        filters,
        sortField,
        sortDirection
      );
      
      if (response.success) {
        setUsers(response.data);
        setTotalCount(response.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      });
      setUsers([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users on mount and when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [pageIndex, pageSize, searchQuery, filters, sorting]);

  // Handle delete user
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      await deleteUser(userToDelete.id);
      
      toast({
        title: "Success",
        description: `User "${userToDelete.name}" has been deleted successfully.`,
      });
      
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      
      // Refresh user list
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.active_status !== "all" ||
      filters.department_id !== null ||
      filters.role_id !== null
    );
  }, [filters]);

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterDialog(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = userFilters;
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
    setShowFilterDialog(false);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters);
    setShowFilterDialog(false);
  };

  // For client-side display, we use the users directly from API
  // Backend handles filtering, so we just display what we receive
  const displayUsers = users;

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Users
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage user master data
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => navigate("/masters/users/add")}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add User</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <UserFilter
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
          data={displayUsers}
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
          emptyMessage="No users found"
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete User?"
        description={
          userToDelete
            ? `Are you sure you want to delete "${userToDelete.name}"? This action cannot be undone.`
            : "Are you sure you want to delete this user?"
        }
        isDeleting={isDeleting}
      />

      {/* Login Credentials Dialog */}
      <UserLoginDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
        user={selectedUser}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
