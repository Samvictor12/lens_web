import * as React from "react";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * DataTable Component - A reusable table component with sorting and pagination
 * 
 * @param {Object} props
 * @param {Array} props.columns - Array of column definitions
 *   Each column should have:
 *   - accessorKey: string - Key to access data in row object
 *   - header: string - Display name for column header
 *   - cell: function (optional) - Custom render function for cell content
 *   - sortable: boolean (optional) - Whether column is sortable (default: false)
 *   - align: string (optional) - Text alignment: "left", "center", "right" (default: "left")
 * 
 * @param {Array} props.data - Array of data objects to display
 * @param {number} props.totalCount - Total number of records (for pagination)
 * @param {number} props.currentPage - Current page number (1-indexed)
 * @param {number} props.pageSize - Number of items per page
 * @param {Function} props.onPageChange - Callback when page changes (page) => void
 * @param {Function} props.onPageSizeChange - Callback when page size changes (pageSize) => void
 * @param {Function} props.onSortChange - Callback when sort changes ({ column, direction }) => void
 * @param {boolean} props.isLoading - Loading state (shows skeleton loaders and loading overlay)
 * @param {string} props.emptyMessage - Message to display when no data (default: "No data available")
 * @param {boolean} props.showPagination - Whether to show pagination controls (default: true)
 * 
 * Features:
 * - Sticky header that stays visible while scrolling
 * - Maximum height of 600px with internal scrolling
 * - Loading state with skeleton rows
 * - Smooth loading overlay with spinner
 * - Responsive and accessible
 */
export function DataTable({
  columns = [],
  data = [],
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  isLoading = false,
  emptyMessage = "No data available",
  showPagination = true,
}) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState(null); // 'asc' or 'desc'

  // Calculate pagination values
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  // Handle sort click
  const handleSort = (column) => {
    if (!column.sortable) return;

    let newDirection = "asc";
    
    if (sortColumn === column.accessorKey) {
      if (sortDirection === "asc") {
        newDirection = "desc";
      } else if (sortDirection === "desc") {
        // Reset sort
        setSortColumn(null);
        setSortDirection(null);
        if (onSortChange) {
          onSortChange({ column: null, direction: null });
        }
        return;
      }
    }

    setSortColumn(column.accessorKey);
    setSortDirection(newDirection);

    if (onSortChange) {
      onSortChange({ column: column.accessorKey, direction: newDirection });
    }
  };

  // Render sort icon
  const renderSortIcon = (column) => {
    if (!column.sortable) return null;

    if (sortColumn !== column.accessorKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }

    if (sortDirection === "asc") {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }

    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  // Get cell alignment class
  const getAlignmentClass = (align) => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  // Render cell content
  const renderCell = (row, column) => {
    if (column.cell) {
      return column.cell({ row, value: row[column.accessorKey] });
    }
    return row[column.accessorKey];
  };

  return (
    <div className="flex flex-col h-[88vh]">
      {/* Table Container */}
      <div className="flex-1 rounded-md border overflow-hidden">
        <div className="relative h-full overflow-auto">
          <Table className="min-w-full border-collapse">
            <TableHeader className="sticky top-0 bg-background z-10 border-b">
              <TableRow>
                {columns.map((column, index) => (
                  <TableHead
                    key={column.accessorKey || index}
                    className={`${getAlignmentClass(column.align)} ${
                      column.sortable ? "cursor-pointer select-none hover:bg-muted/50" : ""
                    }`}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center">
                      <span>{column.header}</span>
                      {renderSortIcon(column)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeleton rows
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    {columns.map((column, colIndex) => (
                      <TableCell
                        key={`skeleton-cell-${colIndex}`}
                        className={getAlignmentClass(column.align)}
                      >
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center h-32 text-muted-foreground border-r-0"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, rowIndex) => (
                  <TableRow key={row.id || rowIndex}>
                    {columns.map((column, colIndex) => (
                      <TableCell
                        key={column.accessorKey || colIndex}
                        className={getAlignmentClass(column.align)}
                      >
                        {renderCell(row, column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Loading overlay for when data is being fetched */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading data...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pagination - Sticky at bottom */}
      {showPagination && totalCount > 0 && (
        <div className="flex items-center justify-between px-2 py-3 border-t bg-background">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {startIndex} to {endIndex} of {totalCount} results
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  if (onPageSizeChange) {
                    onPageSizeChange(parseInt(value));
                  }
                }}
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

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange && onPageChange(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange && onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange && onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange && onPageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
