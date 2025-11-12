import { Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Custom hook that returns the table columns configuration for the business category list
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onDelete - Delete handler function
 * @returns {Array} Array of column definitions
 */
export const useBusinessCategoryColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "name",
      header: "Category Name",
      sortable: true,
      cell: (category) => (
        <a
          href={`/masters/business-categories/view/${category.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/business-categories/view/${category.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <Tag className="h-3 w-3 text-muted-foreground" />
          <div className="font-medium text-xs text-primary">{category.name}</div>
        </a>
      ),
    },
    {
      accessorKey: "active_status",
      header: "Status",
      sortable: true,
      cell: (category) => (
        <Badge
          variant={category.active_status ? "success" : "secondary"}
          className="text-xs"
        >
          {category.active_status ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "customers",
      header: "Customers",
      sortable: false,
      cell: (category) => (
        <span className="text-xs">
          {category._count?.customers || 0}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      sortable: true,
      cell: (category) => (
        <span className="text-xs">
          {new Date(category.createdAt).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (category) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(category)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
