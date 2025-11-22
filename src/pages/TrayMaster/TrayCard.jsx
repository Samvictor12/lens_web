import { Box, Trash2, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function TrayCard({ tray, onView, onEdit, onDelete }) {
  return (
    <Card
      key={tray.id}
      className="p-3 hover:shadow-md transition-shadow flex flex-col h-full"
    >
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between">
          <div className="min-h-[60px] flex-1">
            <h3 className="font-semibold text-sm">{tray.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tray.trayCode}
            </p>
            {tray.description ? (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {tray.description}
              </p>
            ) : (
              <p className="text-xs text-transparent mt-1 h-8">
                &nbsp;
              </p>
            )}
          </div>
          <Badge
            variant={tray.activeStatus ? "default" : "secondary"}
            className="text-xs px-1.5 py-0 h-5"
          >
            {tray.activeStatus ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="pt-2 border-t space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Box className="h-3 w-3" />
              <span>Capacity:</span>
            </div>
            <span className="font-semibold text-xs">
              {tray.capacity || 0}
            </span>
          </div>
          {tray.location && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>Location:</span>
              </div>
              <span className="font-semibold text-xs">
                {tray.location.name}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 pt-2 mt-auto">
        <Button
          variant="outline"
          size="xs"
          className="flex-1 h-7 text-xs"
          onClick={() => onView(tray.id)}
        >
          View
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete && onDelete(tray)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
