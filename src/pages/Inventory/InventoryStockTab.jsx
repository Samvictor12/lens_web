import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Table } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { inventoryService } from "@/services/inventory";
import { stockColumns, formatCurrency, formatDate } from "./Inventory.constants";

/**
 * Self-contained Stock Summary tab — manages its own loading and pagination.
 * Accepts a `refreshKey` prop: increment it from the parent to trigger a reload.
 */
export default function InventoryStockTab({ refreshKey = 0 }) {
  const { toast } = useToast();
  const [stockSummary, setStockSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadStockSummary();
  }, [pageIndex, pageSize, refreshKey]);

  const loadStockSummary = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryService.getInventoryStock({
        page: pageIndex + 1,
        limit: pageSize,
      });
      if (response.success) {
        setStockSummary(response.data || []);
        setTotalCount(response.pagination?.total || response.total || 0);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load stock summary",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-0">
      <Table
        data={stockSummary}
        columns={stockColumns}
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPageIndex}
        loading={isLoading}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(0);
        }}
        pagination={true}
        emptyMessage="No stock data found"
        renderRow={(stock) => (
          <tr key={stock.id || `${stock.lens_id}-${stock.location_id}`}>
            <td className="text-xs">{stock.id || "-"}</td>
            <td className="text-xs font-medium">
              {stock.lensProduct?.lens_name || "-"}
            </td>
            <td className="text-xs">{stock.category?.name || "-"}</td>
            <td className="text-xs">
              {stock.location?.name || stock.locationName || "-"}
            </td>
            <td className="text-xs font-semibold">
              {stock.totalStock ?? stock.quantity ?? 0}
            </td>
            <td>
              <Badge className="bg-green-100 text-green-800 text-xs">
                {stock.availableStock ?? 0}
              </Badge>
            </td>
            <td>
              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                {stock.reservedStock ?? 0}
              </Badge>
            </td>
            <td>
              <Badge className="bg-red-100 text-red-800 text-xs">
                {stock.damagedStock ?? 0}
              </Badge>
            </td>
            <td className="text-xs">{formatCurrency(stock.avgCostPrice)}</td>
            <td className="text-xs">{formatDate(stock.lastInwardDate)}</td>
          </tr>
        )}
      />
    </div>
  );
}
