import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * CardGrid Component - Responsive grid for displaying data as cards with pagination
 * 
 * @param {Object} props
 * @param {Array} props.data or props.items - Array of data to display
 * @param {Function} props.renderCard - Function to render each card: (item) => JSX
 * @param {string} props.emptyMessage - Message when no data
 * @param {boolean} props.isLoading or props.loading - Loading state
 * @param {number} props.columns - Number of columns (default: responsive)
 * @param {boolean} props.pagination - Whether to show pagination (default: false)
 * @param {number} props.pageIndex - Current page (0-indexed)
 * @param {number} props.pageSize - Items per page
 * @param {number} props.totalCount - Total number of items
 * @param {Function} props.onPageChange - Page change handler
 * @param {Function} props.onPageSizeChange - Page size change handler
 */
export function CardGrid({
  data,
  items,
  renderCard,
  emptyMessage = "No data available",
  isLoading = false,
  loading = false,
  columns,
  className,
  pagination = false,
  pageIndex = 0,
  pageSize = 10,
  totalCount = 0,
  onPageChange,
  onPageSizeChange,
}) {
  // Support both 'data' and 'items' prop names
  const itemsArray = data || items || [];
  const loadingState = isLoading || loading;

  const gridClass = columns
    ? `grid-cols-1 md:grid-cols-${Math.min(columns, 2)} lg:grid-cols-${columns}`
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  // Calculate pagination values
  const totalPages = pagination ? Math.ceil(totalCount / pageSize) : 1;
  const currentPage = pageIndex + 1;
  const startIndex = pagination ? pageIndex * pageSize + 1 : 1;
  const endIndex = pagination ? Math.min((pageIndex + 1) * pageSize, totalCount) : totalCount;

  const renderContent = () => {
    if (loadingState) {
      return (
        <div className={cn("grid gap-4", gridClass, className)}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={`skeleton-${index}`} className="h-48 animate-pulse bg-muted" />
          ))}
        </div>
      );
    }

    if (itemsArray.length === 0) {
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
        {itemsArray.map((item, index) => renderCard(item, index))}
      </div>
    );
  };

  if (!pagination) {
    return renderContent();
  }

  // With pagination
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-2 pt-2 border-t bg-background rounded-md flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {startIndex} to {endIndex} of {totalCount} results
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Page Size Selector */}
            {onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Per page:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => onPageSizeChange(parseInt(value))}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Pagination Controls */}
            {onPageChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(0)}
                    disabled={pageIndex === 0}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(pageIndex - 1)}
                    disabled={pageIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(pageIndex + 1)}
                    disabled={pageIndex >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(totalPages - 1)}
                    disabled={pageIndex >= totalPages - 1}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
