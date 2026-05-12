import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { CardGrid } from "@/components/ui/card-grid";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useToast } from "@/hooks/use-toast";
import { inventoryService } from "@/services/inventory";
import { transactionTypeOptions, formatCurrency, formatDate } from "./Inventory.constants";

/**
 * Self-contained Transactions tab — manages its own loading, pagination and search.
 * Accepts a `refreshKey` prop: increment it from the parent to trigger a reload.
 */
export default function InventoryTransactionsTab({ refreshKey = 0 }) {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [view, setView] = useState(() => localStorage.getItem("inventoryTransactionsView") || "table");

  useEffect(() => {
    localStorage.setItem("inventoryTransactionsView", view);
  }, [view]);

  useEffect(() => {
    loadTransactions();
  }, [currentPage, pageSize, searchQuery, sortConfig, refreshKey]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryService.getInventoryTransactions({
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
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

  // Define columns for DataTable
  const columns = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ value }) => <span className="text-xs font-medium">#{value}</span>,
    },
    {
      accessorKey: "transactionNo",
      header: "Transaction No",
      cell: ({ value }) => <span className="text-xs font-mono">{value || "-"}</span>,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ value }) => {
        const badge = getTypeBadge(value);
        return <Badge className={`${badge.color} text-xs`}>{badge.label}</Badge>;
      },
    },
    {
      accessorKey: "lensProduct",
      header: "Lens Product",
      cell: ({ value }) => <span className="text-xs">{value?.lens_name || "-"}</span>,
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
      cell: ({ value }) => <span className="text-xs font-semibold">{value}</span>,
    },
    {
      accessorKey: "unitPrice",
      header: "Unit Price",
      cell: ({ value }) => <span className="text-xs">{formatCurrency(value)}</span>,
    },
    {
      accessorKey: "totalValue",
      header: "Total Value",
      cell: ({ value }) => <span className="text-xs font-semibold">{formatCurrency(value)}</span>,
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ value }) => <span className="text-xs text-muted-foreground max-w-[140px] truncate">{value || "-"}</span>,
    },
    {
      accessorKey: "transactionDate",
      header: "Date",
      sortable: true,
      cell: ({ value, row }) => <span className="text-xs">{formatDate(value || row.createdAt)}</span>,
    },
    {
      accessorKey: "createdByUser",
      header: "Created By",
      cell: ({ value }) => <span className="text-xs text-muted-foreground">{value?.name || "-"}</span>,
    },
  ];

  // Render transaction card for card view
  const renderTransactionCard = (tx) => (
    <Card key={tx.id} className="hover:shadow-md transition-all duration-200 p-3">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-sm font-semibold">#{tx.id}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{tx.transactionNo || "-"}</p>
          </div>
          {(() => {
            const badge = getTypeBadge(tx.type);
            return <Badge className={`${badge.color} text-xs px-2`}>{badge.label}</Badge>;
          })()}
        </div>
        <div className="border-t pt-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lens:</span>
            <span>{tx.inventoryItem?.lensProduct?.lens_name || tx.lensProduct?.lens_name || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quantity:</span>
            <span className="font-semibold">{tx.quantity}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Value:</span>
            <span className="font-semibold text-accent">{formatCurrency(tx.totalValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date:</span>
            <span>{formatDate(tx.transactionDate || tx.createdAt)}</span>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search and View Toggle */}
      <Card className="p-2 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </Card>

      {/* Data Display */}
      {view === "table" ? (
        <Card className="flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={transactions}
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
            emptyMessage="No transactions found"
          />
        </Card>
      ) : (
        <CardGrid
          data={transactions}
          renderCard={renderTransactionCard}
          isLoading={isLoading}
          emptyMessage="No transactions found"
        />
      )}
    </div>
  );
}
