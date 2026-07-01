import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Shield, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { getRoles, deleteRoles } from "@/services/role";
import { useRolePermissionsContext } from "@/contexts/RolePermissionsContext";

export default function RoleListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { has } = useRolePermissionsContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Pagination states
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Sorting state
  const [sorting, setSorting] = useState([]);

  // Role data
  const [roles, setRoles] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check action permissions (linked to "users" permission key)
  const canCreate = has("users", "Create");
  const canEdit = has("users", "Edit");
  const canDelete = has("users", "Delete");

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const fetchRolesList = useCallback(async () => {
    try {
      setIsLoading(true);
      const sortField = sorting[0]?.id || "id";
      const sortDirection = sorting[0]?.desc ? "desc" : "asc";

      const response = await getRoles({
        page: pageIndex + 1,
        limit: pageSize,
        search: searchQuery,
        sort_by: sortField,
        sort_order: sortDirection
      });

      if (response.success) {
        setRoles(response.data.records);
        setTotalCount(response.data.total);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch roles",
        variant: "destructive",
      });
      setRoles([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, searchQuery, sorting, toast]);

  useEffect(() => {
    fetchRolesList();
  }, [fetchRolesList, refreshKey]);

  const handleDeleteClick = (role) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;
    try {
      setIsDeleting(true);
      await deleteRoles([roleToDelete.id]);
      toast({
        title: "Success",
        description: `Role "${roleToDelete.name}" has been deleted successfully.`,
      });
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      handleRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo(() => [
    {
      accessorKey: "name",
      header: "Role Name",
      sortable: true,
      cell: (role) => (
        <a
          href={`/masters/roles/view/${role.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/roles/view/${role.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="font-medium text-xs text-primary">{role.name}</div>
        </a>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      sortable: false,
      cell: (role) => (
        <span className="text-xs text-muted-foreground">{role.description || "-"}</span>
      ),
    },
    {
      accessorKey: "active_status",
      header: "Status",
      sortable: true,
      cell: (role) => (
        <Badge
          variant={role.active_status ? "success" : "secondary"}
          className="text-xs"
        >
          {role.active_status ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (role) => (
        <div className="flex gap-1">
          {/* {canEdit && (
            <Button
              variant="ghost"
              size="xs"
              className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => navigate(`/masters/roles/edit/${role.id}`)}
              title="Edit Role"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )} */}
          {canDelete && role.id !== 1 && (
            <Button
              variant="ghost"
              size="xs"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleDeleteClick(role)}
              title="Delete Role"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ], [canEdit, canDelete, navigate]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden p-3 gap-3 w-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Roles & Permissions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure system access roles and feature permission matrix
          </p>
        </div>
        {canCreate && (
          <div className="flex gap-1.5">
            <Button
              size="xs"
              className="gap-1.5 h-8"
              onClick={() => navigate("/masters/roles/create")}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Role</span>
            </Button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <Card className="p-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPageIndex(0);
            }}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </Card>

      {/* Table view */}
      <div className="flex-1 min-h-0">
        <Table
          data={roles}
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
          emptyMessage="No roles found"
        />
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Role?"
        description={
          roleToDelete
            ? `Are you sure you want to delete the role "${roleToDelete.name}"? This action cannot be undone.`
            : "Are you sure you want to delete this role?"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
