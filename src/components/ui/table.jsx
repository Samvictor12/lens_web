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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Basic table primitives for manual table construction
const TablePrimitive = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
));
TablePrimitive.displayName = "TablePrimitive";

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted even:bg-muted/30",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 border-r last:border-r-0",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-2 align-middle [&:has([role=checkbox])]:pr-0 border-r last:border-r-0", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

/**
 * Full-Featured Table Component
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of data objects to display
 * @param {Array} props.columns - Array of column definitions
 *   Each column should have:
 *   - accessorKey: string - Key to access data in row object
 *   - header: string - Display name for column header
 *   - cell: function (optional) - Custom render function for cell content (receives full row object)
 *   - sortable: boolean (optional) - Whether column is sortable (default: false)
 *   - align: string (optional) - Text alignment: "left", "center", "right" (default: "left")
 * 
 * @param {number} props.pageIndex - Current page number (0-indexed)
 * @param {number} props.pageSize - Number of items per page
 * @param {number} props.totalCount - Total number of records
 * @param {Function} props.onPageChange - Callback when page changes (pageIndex) => void
 * @param {Function} props.onPageSizeChange - Callback when page size changes (pageSize) => void
 * @param {boolean} props.loading - Loading state
 * @param {Array} props.sorting - Sorting state [{ id: string, desc: boolean }]
 * @param {Function} props.setSorting - Callback to update sorting
 * @param {boolean} props.pagination - Whether to show pagination (default: true)
 * @param {string} props.emptyMessage - Message to display when no data
 */
const Table = React.forwardRef(
  (
    {
      data = [],
      columns = [],
      pageIndex = 0,
      pageSize = 10,
      totalCount = 0,
      onPageChange,
      onPageSizeChange,
      loading = false,
      sorting = [],
      setSorting,
      pagination = true,
      emptyMessage = "No data available",
      className,
      ...props
    },
    ref
  ) => {
    // Handle sorting
    const handleSort = (column) => {
      if (!column.sortable || !setSorting) return;

      const existingSort = sorting.find((s) => s.id === column.accessorKey);
      
      if (!existingSort) {
        // No sort - set to ascending
        setSorting([{ id: column.accessorKey, desc: false }]);
      } else if (!existingSort.desc) {
        // Ascending - set to descending
        setSorting([{ id: column.accessorKey, desc: true }]);
      } else {
        // Descending - clear sort
        setSorting([]);
      }
    };

    // Render sort icon
    const renderSortIcon = (column) => {
      if (!column.sortable) return null;

      const sortState = sorting.find((s) => s.id === column.accessorKey);
      
      if (!sortState) {
        return <ArrowUpDown className="ml-2 h-4 w-4" />;
      }

      return sortState.desc ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUp className="ml-2 h-4 w-4" />
      );
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
        return column.cell(row);
      }
      return row[column.accessorKey];
    };

    // Calculate pagination values
    const totalPages = pagination ? Math.ceil(totalCount / pageSize) : 1;
    const currentPage = pageIndex + 1;
    const startIndex = pagination ? pageIndex * pageSize + 1 : 1;
    const endIndex = pagination ? Math.min((pageIndex + 1) * pageSize, totalCount) : totalCount;

    return (
      <div ref={ref} className={cn("flex flex-col", className)} {...props} style={{ height: '100%' }}>
        {/* Table Container */}
        <div className="flex-1 rounded-md border overflow-hidden min-h-0">
          <div className="relative h-full overflow-auto">
            <table className="min-w-full border-collapse w-full caption-bottom text-sm">
              <TableHeader className="sticky top-0 bg-background z-10 border-b">
                <TableRow>
                  {columns.map((column, index) => (
                    <TableHead
                      key={column.accessorKey || index}
                      className={cn(
                        getAlignmentClass(column.align),
                        column.sortable && "cursor-pointer select-none hover:bg-muted/50"
                      )}
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
                {loading ? (
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
            </table>

            {/* Loading overlay */}
            {loading && (
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
        {pagination && totalCount > 0 && (
          <div className="flex items-center justify-between px-2 pt-2 border-t bg-background">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {startIndex} to {endIndex} of {totalCount} results
              </span>
            </div>

            <div className="flex items-center gap-6">
              {/* Page Size Selector */}
              {onPageSizeChange && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
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
);
Table.displayName = "Table";

export {
  Table,
  TablePrimitive,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};



