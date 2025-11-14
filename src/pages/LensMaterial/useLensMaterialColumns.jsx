import { Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Custom hook that returns the table columns configuration for the lens material list
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onDelete - Delete handler function
 * @returns {Array} Array of column definitions
 */
export const useLensMaterialColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "name",
      header: "Material Name",
      sortable: true,
      cell: (material) => (
        <a
          href={`/masters/lens-material/view/${material.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/lens-material/view/${material.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <div>
            <div className="font-medium text-xs text-primary">{material.name}</div>
          </div>
        </a>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      sortable: false,
      cell: (material) => (
        <span className="text-xs line-clamp-2">
          {material.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "productCount",
      header: "Products",
      sortable: false,
      cell: (material) => (
        <div className="flex items-center gap-1.5">
          <Package className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">
            {material.productCount || 0}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "activeStatus",
      header: "Status",
      sortable: true,
      cell: (material) => (
        <Badge
          variant={material.activeStatus ? "default" : "secondary"}
          className="text-xs"
        >
          {material.activeStatus ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (material) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete && onDelete(material)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
