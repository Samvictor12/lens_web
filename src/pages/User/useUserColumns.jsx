import { User, Trash2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Custom hook that returns the table columns configuration for the user list
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onDelete - Delete handler function
 * @param {Function} onLoginClick - Login settings handler function
 * @returns {Array} Array of column definitions
 */
export const useUserColumns = (navigate, onDelete, onLoginClick) => {
  return [
    {
      accessorKey: "name",
      header: "Name",
      sortable: true,
      cell: (user) => (
        <a
          href={`/masters/users/view/${user.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/users/view/${user.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <User className="h-3 w-3 text-muted-foreground" />
          <div className="font-medium text-xs text-primary">{user.name}</div>
        </a>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      sortable: true,
      cell: (user) => (
        <span className="text-xs">{user.email}</span>
      ),
    },
    {
      accessorKey: "usercode",
      header: "User Code",
      sortable: true,
      cell: (user) => (
        <span className="text-xs font-mono">{user.usercode}</span>
      ),
    },
    {
      accessorKey: "phonenumber",
      header: "Phone",
      sortable: false,
      cell: (user) => (
        <span className="text-xs">{user.phonenumber || "-"}</span>
      ),
    },
    {
      accessorKey: "department",
      header: "Department",
      sortable: false,
      cell: (user) => (
        <span className="text-xs">
          {user.departmentDetails?.department || "-"}
        </span>
      ),
    },
    {
      accessorKey: "active_status",
      header: "Status",
      sortable: true,
      cell: (user) => (
        <Badge
          variant={user.active_status ? "success" : "secondary"}
          className="text-xs"
        >
          {user.active_status ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (user) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => onLoginClick(user)}
            title="Login Settings"
          >
            <Key className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(user)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
