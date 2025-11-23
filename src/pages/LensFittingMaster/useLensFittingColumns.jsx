import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Custom hook that returns the table columns configuration for the lens fitting list
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onDelete - Delete handler function
 * @returns {Array} Array of column definitions
 */
export const useLensFittingColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "name",
      header: "Fitting Name",
      sortable: true,
      cell: (fitting) => (
        <a
          href={`/masters/lens-fitting/view/${fitting.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/lens-fitting/view/${fitting.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <div>
            <div className="font-medium text-xs text-primary">{fitting.name}</div>
            <div className="text-xs text-muted-foreground">{fitting.short_name}</div>
          </div>
        </a>
      ),
    },
    {
      accessorKey: "fitting_price",
      header: "Price",
      sortable: false,
      cell: (fitting) => (
        <span className="text-xs font-medium">
          ₹{(fitting.fitting_price || 0).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      sortable: false,
      cell: (fitting) => (
        <span className="text-xs line-clamp-2">
          {fitting.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "activeStatus",
      header: "Status",
      sortable: true,
      cell: (fitting) => (
        <Badge
          variant={fitting.activeStatus ? "default" : "secondary"}
          className="text-xs"
        >
          {fitting.activeStatus ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (fitting) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete && onDelete(fitting)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
