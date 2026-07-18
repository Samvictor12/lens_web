import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table } from "@/components/ui/table";
import { Refresh } from "@/components/ui/Refresh";
import { useToast } from "@/hooks/use-toast";
import { inventoryService } from "@/services/inventory";
import { transactionTypeOptions, formatCurrency, formatDate } from "./Inventory.constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "react-router-dom";

import { useState, useEffect, useMemo } from "react";

/**
 * Self-contained Transactions tab — manages its own loading, pagination and search.
 * Accepts a `refreshKey` prop: increment it from the parent to trigger a reload.
 */
export default function InventoryTransactionsTab({ refreshKey = 0, godownType }) {
  const { toast } = useToast();
  const location = useLocation();
  
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionType, setTransactionType] = useState("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sorting, setSorting] = useState([]);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  // Sync with router state if navigated from dashboard
  useEffect(() => {
    if (location.state?.filterType) {
      setTransactionType(location.state.filterType);
      setPageIndex(0);
    }
  }, [location.state]);

  useEffect(() => {
    loadTransactions();
  }, [pageIndex, pageSize, searchQuery, sorting, refreshKey, localRefreshKey, transactionType, godownType]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryService.getInventoryTransactions({
        page: pageIndex + 1,
        limit: pageSize,
        search: searchQuery,
        type: transactionType !== "all" ? transactionType : undefined,
        godownType: godownType || undefined,
      });
      if (response.success) {
        setTransactions(response.data || []);
        setTotalCount(response.pagination?.total || 0);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
      setTransactions([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeBadge = (type) => {
    const opt = transactionTypeOptions.find((o) => o.value === type);
    return opt ? { label: opt.label, color: opt.color } : { label: type, color: "bg-gray-100 text-gray-800" };
  };

  // Define columns for standard Table component
  const columns = [
    {
      accessorKey: "id",
      header: "ID",
      cell: (item) => <span className="text-xs font-medium">#{item.id}</span>,
    },
    {
      accessorKey: "transactionNo",
      header: "Transaction No",
      cell: (item) => <span className="text-xs font-mono">{item.transactionNo || "-"}</span>,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: (item) => {
        const badge = getTypeBadge(item.type);
        return <Badge className={`${badge.color} text-xs`}>{badge.label}</Badge>;
      },
    },
    {
      accessorKey: "lensProduct",
      header: "Lens Product",
      cell: (item) => <span className="text-xs">{item.lensProduct?.lens_name || "-"}</span>,
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
      cell: (item) => <span className="text-xs font-semibold">{item.quantity}</span>,
    },
    {
      accessorKey: "unitPrice",
      header: "Unit Price",
      cell: (item) => <span className="text-xs">{formatCurrency(item.unitPrice)}</span>,
    },
    {
      accessorKey: "totalValue",
      header: "Total Value",
      cell: (item) => <span className="text-xs font-semibold">{formatCurrency(item.totalValue)}</span>,
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: (item) => <span className="text-xs text-muted-foreground max-w-[140px] truncate">{item.reason || "-"}</span>,
    },
    {
      accessorKey: "transactionDate",
      header: "Date",
      sortable: true,
      cell: (item) => <span className="text-xs">{formatDate(item.transactionDate || item.createdAt)}</span>,
    },
    {
      accessorKey: "createdByUser",
      header: "Created By",
      cell: (item) => <span className="text-xs text-muted-foreground">{item.createdByUser?.name || "-"}</span>,
    },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden gap-3">
      {/* Search Bar */}
      <Card className="p-2 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(0);
              }}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="w-48">
            <Select
              value={transactionType}
              onValueChange={(val) => {
                setTransactionType(val);
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-white border">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {transactionTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Refresh onClick={() => {
              setLocalRefreshKey(prev => prev + 1);
              setPageIndex(0);
            }} />
          </div>
        </div>
      </Card>

      {/* Data Display */}
      <div className="flex-1 min-h-0">
      <Table
        columns={columns}
        data={transactions}
        totalCount={totalCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPageChange={setPageIndex}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPageIndex(0);
        }}
        setSorting={setSorting}
        sorting={sorting}
        loading={isLoading}
        emptyMessage="No transactions found"
      />
      </div>
    </div>
  );
}
