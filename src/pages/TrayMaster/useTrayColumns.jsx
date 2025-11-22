import { Box, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Custom hook that returns the table columns configuration for the tray list
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onDelete - Delete handler function
 * @returns {Array} Array of column definitions
 */
export const useTrayColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "name",
      header: "Tray Name",
      sortable: true,
      cell: (tray) => (
        <a
          href={`/masters/tray/view/${tray.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/tray/view/${tray.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <div>
            <div className="font-medium text-xs text-primary">{tray.name}</div>
            <div className="text-xs text-muted-foreground">{tray.trayCode}</div>
          </div>
        </a>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      sortable: false,
      cell: (tray) => (
        <div className="flex items-center gap-1.5">
          {tray.location ? (
            <>
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <div>
                <div className="text-xs font-medium">{tray.location.name}</div>
                <div className="text-xs text-muted-foreground">{tray.location.locationCode}</div>
              </div>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      sortable: false,
      cell: (tray) => (
        <div className="flex items-center gap-1.5">
          <Box className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">
            {tray.capacity || 0}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      sortable: false,
      cell: (tray) => (
        <span className="text-xs line-clamp-2">
          {tray.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "activeStatus",
      header: "Status",
      sortable: true,
      cell: (tray) => (
        <Badge
          variant={tray.activeStatus ? "default" : "secondary"}
          className="text-xs"
        >
          {tray.activeStatus ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (tray) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete && onDelete(tray)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
