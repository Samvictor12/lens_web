import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { CardGrid } from "@/components/ui/card-grid";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useToast } from "@/hooks/use-toast";
import { inventoryService } from "@/services/inventory";
import { formatCurrency, formatDate } from "./Inventory.constants";

/**
 * Enhanced Stock Summary tab with groupBy support and value columns.
 * Accepts a `refreshKey` prop: increment it from the parent to trigger a reload.
 */
export default function InventoryStockTab({ refreshKey = 0 }) {
  const { toast } = useToast();
  const [stockSummary, setStockSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [groupBy, setGroupBy] = useState("location");
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [view, setView] = useState(() => localStorage.getItem("inventoryStockView") || "table");

  useEffect(() => {
    localStorage.setItem("inventoryStockView", view);
  }, [view]);

  useEffect(() => {
    loadStockSummary();
  }, [currentPage, pageSize, refreshKey, groupBy, sortConfig]);

  const loadStockSummary = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryService.getInventoryStockGrouped({
        page: currentPage,
        limit: pageSize,
        groupBy: groupBy === "none" ? null : groupBy,
      });
      if (response.success) {
        setStockSummary(response.data || []);
        setTotalCount(response.pagination?.total || response.total || 0);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load stock summary",
        variant: "destructive",
      });
      setStockSummary([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupByChange = (e) => {
    setGroupBy(e.target.value);
    setCurrentPage(1);
  };

  // Define columns for DataTable
  const columns = [
    {
      accessorKey: "lensProduct",
      header: "Lens Product",
      cell: ({ value }) => <span className="text-xs font-medium">{value?.lens_name || "-"}</span>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ value }) => <span className="text-xs">{value?.name || "-"}</span>,
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ value }) => <span className="text-xs">{value?.name || "-"}</span>,
    },
    ...(groupBy !== "none"
      ? [
          {
            accessorKey: "tray",
            header: "Tray",
            cell: ({ value }) => <span className="text-xs">{value?.tray_name || "-"}</span>,
          },
        ]
      : []),
    {
      accessorKey: "totalStock",
      header: "Total Stock",
      cell: ({ value }) => <span className="text-xs font-semibold">{value ?? 0}</span>,
    },
    {
      accessorKey: "availableStock",
      header: "Available",
      cell: ({ value }) => (
        <Badge className="bg-green-100 text-green-800 text-xs">
          {value ?? 0}
        </Badge>
      ),
    },
    {
      accessorKey: "reservedStock",
      header: "Reserved",
      cell: ({ value }) => (
        <Badge className="bg-yellow-100 text-yellow-800 text-xs">
          {value ?? 0}
        </Badge>
      ),
    },
    {
      accessorKey: "damagedStock",
      header: "Damaged",
      cell: ({ value }) => (
        <Badge className="bg-red-100 text-red-800 text-xs">
          {value ?? 0}
        </Badge>
      ),
    },
    {
      accessorKey: "avgCostPrice",
      header: "Avg Cost",
      cell: ({ value }) => <span className="text-xs">{formatCurrency(value)}</span>,
    },
    {
      accessorKey: "lastCostPrice",
      header: "Last Cost",
      cell: ({ value }) => <span className="text-xs">{formatCurrency(value)}</span>,
    },
    {
      accessorKey: "totalValue",
      header: "Total Value",
      cell: ({ value }) => <span className="text-xs font-semibold text-green-700">{formatCurrency(value)}</span>,
    },
    {
      accessorKey: "lastInwardDate",
      header: "Last Inward",
      cell: ({ value }) => <span className="text-xs">{formatDate(value)}</span>,
    },
  ];

  // Render stock card for card view
  const renderStockCard = (stock) => (
    <Card key={stock.id || `${stock.lens_id}-${stock.location_id}`} className="hover:shadow-md transition-all duration-200 p-3">
      <div className="space-y-2">
        <div>
          <p className="text-sm font-semibold">{stock.lensProduct?.lens_name || "-"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{stock.category?.name || "-"}</p>
        </div>
        <div className="border-t pt-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Location:</span>
            <span>{stock.location?.name || "-"}</span>
          </div>
          {groupBy !== "none" && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tray:</span>
              <span>{stock.tray?.tray_name || "-"}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Stock:</span>
            <div className="flex gap-1">
              <Badge className="bg-green-100 text-green-800 text-[10px] h-4 px-1">
                A: {stock.availableStock ?? 0}
              </Badge>
              <Badge className="bg-yellow-100 text-yellow-800 text-[10px] h-4 px-1">
                R: {stock.reservedStock ?? 0}
              </Badge>
              <Badge className="bg-red-100 text-red-800 text-[10px] h-4 px-1">
                D: {stock.damagedStock ?? 0}
              </Badge>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Value:</span>
            <span className="font-semibold text-accent">{formatCurrency(stock.totalValue)}</span>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col h-full gap-3">
      {/* GroupBy Selector and View Toggle */}
      <Card className="p-2 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="groupBy" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Group By:
            </label>
            <select
              id="groupBy"
              value={groupBy}
              onChange={handleGroupByChange}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="location">Location</option>
              <option value="location_tray">Location + Tray</option>
              <option value="none">Individual Items</option>
            </select>
          </div>
          <div className="flex-1" />
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </Card>

      {/* Data Display */}
      {view === "table" ? (
        <Card className="flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={stockSummary}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            onSortChange={setSortConfig}
            isLoading={isLoading}
            emptyMessage="No stock data found"
          />
        </Card>
      ) : (
        <CardGrid
          data={stockSummary}
          renderCard={renderStockCard}
          isLoading={isLoading}
          emptyMessage="No stock data found"
        />
      )}
    </div>
  );
}
