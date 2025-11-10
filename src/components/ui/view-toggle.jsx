import { LayoutGrid, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ViewToggle Component - Toggle between card and table views
 * 
 * @param {Object} props
 * @param {string} props.view - Current view: "card" or "table"
 * @param {Function} props.onViewChange - Callback when view changes
 */
export function ViewToggle({ view, onViewChange }) {
  return (
    <div className="flex items-center gap-0.5 border rounded-md p-0.5">
      <Button
        variant={view === "card" ? "default" : "ghost"}
        size="xs"
        onClick={() => onViewChange("card")}
        className={cn(
          "gap-1.5",
          view === "card" && "shadow-sm"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Cards</span>
      </Button>
      <Button
        variant={view === "table" ? "default" : "ghost"}
        size="xs"
        onClick={() => onViewChange("table")}
        className={cn(
          "gap-1.5",
          view === "table" && "shadow-sm"
        )}
      >
        <Table className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Table</span>
      </Button>
    </div>
  );
}
