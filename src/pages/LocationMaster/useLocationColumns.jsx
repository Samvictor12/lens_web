import { MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { godownTypeLabel } from "./Location.constants";

/**
 * Custom hook that returns the table columns configuration for the location list
 */
export const useLocationColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "name",
      header: "Location Name",
      sortable: true,
      cell: (location) => (
        <a
          href={`/masters/location/view/${location.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/location/view/${location.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <div>
            <div className="font-medium text-xs text-primary">{location.name}</div>
          </div>
        </a>
      ),
    },
    {
      accessorKey: "godownType",
      header: "Godown Type",
      sortable: false,
      cell: (location) => (
        <Badge variant="outline" className="text-xs">
          {godownTypeLabel(location.godownType)}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      sortable: false,
      cell: (location) => (
        <span className="text-xs line-clamp-2">
          {location.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "trayCount",
      header: "Trays",
      sortable: false,
      cell: (location) => (
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">
            {location.trayCount || 0}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "activeStatus",
      header: "Status",
      sortable: true,
      cell: (location) => (
        <Badge
          variant={location.activeStatus ? "default" : "secondary"}
          className="text-xs"
        >
          {location.activeStatus ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (location) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete && onDelete(location)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
