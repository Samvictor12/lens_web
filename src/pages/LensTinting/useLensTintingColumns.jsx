import { Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Custom hook that returns the table columns configuration for the lens tinting list
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onDelete - Delete handler function
 * @returns {Array} Array of column definitions
 */
export const useLensTintingColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "name",
      header: "Tinting Name",
      sortable: true,
      cell: (tinting) => (
        <a
          href={`/masters/lens-tinting/view/${tinting.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/lens-tinting/view/${tinting.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <div>
            <div className="font-medium text-xs text-primary">{tinting.name}</div>
            {tinting.short_name && (
              <div className="text-[10px] text-muted-foreground">
                {tinting.short_name}
              </div>
            )}
          </div>
        </a>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      sortable: false,
      cell: (tinting) => (
        <span className="text-xs line-clamp-2">
          {tinting.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "tinting_price",
      header: "Price",
      sortable: true,
      cell: (tinting) => (
        <span className="text-xs font-medium">
          {tinting.tinting_price !== null && tinting.tinting_price !== undefined
            ? `₹${parseFloat(tinting.tinting_price).toFixed(2)}`
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "orderCount",
      header: "Sale Orders",
      sortable: false,
      cell: (tinting) => (
        <div className="flex items-center gap-1.5">
          <Eye className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">
            {tinting.orderCount || 0}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "activeStatus",
      header: "Status",
      sortable: true,
      cell: (tinting) => (
        <Badge
          variant={tinting.activeStatus ? "default" : "secondary"}
          className="text-xs"
        >
          {tinting.activeStatus ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (tinting) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete && onDelete(tinting)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
