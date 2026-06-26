import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const useLensDiaColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "name",
      header: "Diameter",
      sortable: true,
      cell: (dia) => (
        <a
          href={`/masters/lens-dia/view/${dia.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/lens-dia/view/${dia.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <div className="font-medium text-xs text-primary">{dia.name}</div>
        </a>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      sortable: false,
      cell: (dia) => (
        <span className="text-xs line-clamp-2">{dia.description || "-"}</span>
      ),
    },
    {
      accessorKey: "activeStatus",
      header: "Status",
      sortable: true,
      cell: (dia) => (
        <Badge
          variant={dia.activeStatus ? "default" : "secondary"}
          className="text-xs"
        >
          {dia.activeStatus ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (dia) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete && onDelete(dia)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
