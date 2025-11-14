import { Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Custom hook that returns the table columns configuration for the lens category list
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onDelete - Delete handler function
 * @returns {Array} Array of column definitions
 */
export const useLensCategoryColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "name",
      header: "Category Name",
      sortable: true,
      cell: (category) => (
        <a
          href={`/masters/lens-category/view/${category.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/lens-category/view/${category.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <div>
            <div className="font-medium text-xs text-primary">{category.name}</div>
          </div>
        </a>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      sortable: false,
      cell: (category) => (
        <span className="text-xs line-clamp-2">
          {category.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "productCount",
      header: "Products",
      sortable: false,
      cell: (category) => (
        <div className="flex items-center gap-1.5">
          <Package className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">
            {category.productCount || 0}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "activeStatus",
      header: "Status",
      sortable: true,
      cell: (category) => (
        <Badge
          variant={category.activeStatus ? "default" : "secondary"}
          className="text-xs"
        >
          {category.activeStatus ? "Active" : "Inactive"}
        </Badge>
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
            onClick={() => onDelete && onDelete(category)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
