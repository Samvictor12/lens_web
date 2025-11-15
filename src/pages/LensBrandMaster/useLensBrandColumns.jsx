import { Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Custom hook that returns the table columns configuration for the lens brand list
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onDelete - Delete handler function
 * @returns {Array} Array of column definitions
 */
export const useLensBrandColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "name",
      header: "Brand Name",
      sortable: true,
      cell: (brand) => (
        <a
          href={`/masters/lens-brand/view/${brand.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/lens-brand/view/${brand.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <div>
            <div className="font-medium text-xs text-primary">{brand.name}</div>
          </div>
        </a>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      sortable: false,
      cell: (brand) => (
        <span className="text-xs line-clamp-2">
          {brand.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "productCount",
      header: "Products",
      sortable: false,
      cell: (brand) => (
        <div className="flex items-center gap-1.5">
          <Package className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">
            {brand.productCount || 0}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "activeStatus",
      header: "Status",
      sortable: true,
      cell: (brand) => (
        <Badge
          variant={brand.activeStatus ? "default" : "secondary"}
          className="text-xs"
        >
          {brand.activeStatus ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (brand) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete && onDelete(brand)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
