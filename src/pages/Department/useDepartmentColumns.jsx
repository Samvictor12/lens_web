import { Briefcase, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Custom hook that returns the table columns configuration for the department list
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onDelete - Delete handler function
 * @returns {Array} Array of column definitions
 */
export const useDepartmentColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "department",
      header: "Department Name",
      sortable: true,
      cell: (department) => (
        <a
          href={`/masters/departments/view/${department.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/departments/view/${department.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <Briefcase className="h-3 w-3 text-muted-foreground" />
          <div className="font-medium text-xs text-primary">{department.department}</div>
        </a>
      ),
    },
    {
      accessorKey: "active_status",
      header: "Status",
      sortable: true,
      cell: (department) => (
        <Badge
          variant={department.active_status ? "success" : "secondary"}
          className="text-xs"
        >
          {department.active_status ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "users",
      header: "Users",
      sortable: false,
      cell: (department) => (
        <span className="text-xs">
          {department._count?.Users || 0}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      sortable: true,
      cell: (department) => (
        <span className="text-xs">
          {new Date(department.createdAt).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (department) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(department)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
