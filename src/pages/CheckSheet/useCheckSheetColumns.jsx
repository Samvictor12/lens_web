import { ClipboardCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const useCheckSheetColumns = (navigate, onDelete) => [
  {
    accessorKey: "name",
    header: "Check Sheet Name",
    sortable: true,
    cell: (row) => (
      <a
        href={`/masters/check-sheets/view/${row.id}`}
        onClick={(e) => {
          e.preventDefault();
          navigate(`/masters/check-sheets/view/${row.id}`);
        }}
        className="flex items-center gap-1.5 hover:underline cursor-pointer"
      >
        <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="font-medium text-xs text-primary">{row.name}</span>
      </a>
    ),
  },
  {
    accessorKey: "check_key",
    header: "Check Key",
    sortable: true,
    cell: (row) => (
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
        {row.check_key}
      </code>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    sortable: false,
    cell: (row) => (
      <span className="text-xs text-muted-foreground line-clamp-1">
        {row.description || "—"}
      </span>
    ),
  },
  {
    accessorKey: "class",
    header: "Class",
    sortable: true,
    cell: (row) => (
      <span className="text-xs">{row.class || "General"}</span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    sortable: true,
    cell: (row) => (
      <span className="text-xs text-muted-foreground">{row.type || "—"}</span>
    ),
  },
  {
    accessorKey: "itemCount",
    header: "Items",
    sortable: false,
    cell: (row) => (
      <Badge variant="secondary" className="text-xs">
        {row.itemCount} item{row.itemCount !== 1 ? "s" : ""}
      </Badge>
    ),
  },
  {
    accessorKey: "activeStatus",
    header: "Status",
    sortable: true,
    cell: (row) =>
      row.activeStatus ? (
        <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs">Active</Badge>
      ) : (
        <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
      ),
  },
  {
    accessorKey: "actions",
    header: "",
    sortable: false,
    cell: (row) => (
      <div className="flex items-center gap-1 justify-end">
        <Button
          size="xs"
          variant="ghost"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    ),
  },
];
