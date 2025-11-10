import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * CardGrid Component - Responsive grid for displaying data as cards
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of data to display
 * @param {Function} props.renderCard - Function to render each card: (item) => JSX
 * @param {string} props.emptyMessage - Message when no data
 * @param {boolean} props.isLoading - Loading state
 * @param {number} props.columns - Number of columns (default: responsive)
 */
export function CardGrid({
  data = [],
  renderCard,
  emptyMessage = "No data available",
  isLoading = false,
  columns,
  className,
}) {
  const gridClass = columns
    ? `grid-cols-1 md:grid-cols-${Math.min(columns, 2)} lg:grid-cols-${columns}`
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  if (isLoading) {
    return (
      <div className={cn("grid gap-4", gridClass, className)}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={`skeleton-${index}`} className="h-48 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-muted-foreground">
          {emptyMessage}
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("grid gap-4", gridClass, className)}>
      {data.map((item, index) => renderCard(item, index))}
    </div>
  );
}
