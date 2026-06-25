import { Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const useLensIndexColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "indexName",
      header: "Index",
      sortable: true,
      cell: (index) => (
        <a
          href={`/masters/lens-index/view/${index.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/lens-index/view/${index.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <div className="font-medium text-xs text-primary">{index.indexName}</div>
        </a>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      sortable: false,
      cell: (index) => (
        <span className="text-xs line-clamp-2">{index.description || "-"}</span>
      ),
    },
    {
      accessorKey: "productCount",
      header: "Products",
      sortable: false,
      cell: (index) => (
        <div className="flex items-center gap-1.5">
          <Package className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">{index.productCount || 0}</span>
        </div>
      ),
    },
    {
      accessorKey: "activeStatus",
      header: "Status",
      sortable: true,
      cell: (index) => (
        <Badge
          variant={index.activeStatus ? "default" : "secondary"}
          className="text-xs"
        >
          {index.activeStatus ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (index) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete && onDelete(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
