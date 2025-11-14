import { Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Custom hook that returns the table columns configuration for the lens coating list
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onDelete - Delete handler function
 * @returns {Array} Array of column definitions
 */
export const useLensCoatingColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "name",
      header: "Coating Name",
      sortable: true,
      cell: (coating) => (
        <a
          href={`/masters/lens-coating/view/${coating.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/lens-coating/view/${coating.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <div>
            <div className="font-medium text-xs text-primary">{coating.name}</div>
            <div className="text-xs text-muted-foreground">({coating.short_name})</div>
          </div>
        </a>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      sortable: false,
      cell: (coating) => (
        <span className="text-xs line-clamp-2">
          {coating.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "productCount",
      header: "Price Records",
      sortable: false,
      cell: (coating) => (
        <div className="flex items-center gap-1.5">
          <Package className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">
            {coating.productCount || 0}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "activeStatus",
      header: "Status",
      sortable: true,
      cell: (coating) => (
        <Badge
          variant={coating.activeStatus ? "default" : "secondary"}
          className="text-xs"
        >
          {coating.activeStatus ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (coating) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete && onDelete(coating)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
