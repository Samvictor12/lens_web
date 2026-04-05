import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { inventoryService } from "@/services/inventory";
import {
  transactionColumns,
  transactionTypeOptions,
  formatCurrency,
  formatDate,
} from "./Inventory.constants";

/**
 * Self-contained Transactions tab — manages its own loading, pagination and search.
 * Accepts a `refreshKey` prop: increment it from the parent to trigger a reload.
 */
export default function InventoryTransactionsTab({ refreshKey = 0 }) {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadTransactions();
  }, [pageIndex, pageSize, searchQuery, refreshKey]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryService.getInventoryTransactions({
        page: pageIndex + 1,
        limit: pageSize,
        search: searchQuery,
      });
      if (response.success) {
        setTransactions(response.data || []);
        setTotalCount(response.pagination?.total || 0);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeBadge = (type) => {
    const opt = transactionTypeOptions.find((o) => o.value === type);
    return (
      <Badge className={`${opt?.color || "bg-gray-100 text-gray-800"} text-xs`}>
        {opt?.label || type}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Search bar */}
      <Card className="p-1 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPageIndex(0);
            }}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </Card>

      {/* Table */}
      <div className="flex-1 min-h-0">
        <Table
          data={transactions}
          columns={transactionColumns}
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
          emptyMessage="No transactions found"
          renderRow={(tx) => (
            <tr key={tx.id}>
              <td className="text-xs font-medium">#{tx.id}</td>
              <td className="text-xs font-mono">{tx.transactionNo || "-"}</td>
              <td>{getTypeBadge(tx.type)}</td>
              <td className="text-xs">{tx.inventoryItem?.lensProduct?.lens_name || "-"}</td>
              <td className="text-xs font-semibold">{tx.quantity}</td>
              <td className="text-xs">{formatCurrency(tx.unitPrice)}</td>
              <td className="text-xs">{formatCurrency(tx.totalValue)}</td>
              <td className="text-xs text-muted-foreground max-w-[140px] truncate">
                {tx.reason || "-"}
              </td>
              <td className="text-xs">{formatDate(tx.transactionDate || tx.createdAt)}</td>
              <td className="text-xs text-muted-foreground">
                {tx.createdByUser?.name || "-"}
              </td>
            </tr>
          )}
        />
      </div>
    </div>
  );
}
