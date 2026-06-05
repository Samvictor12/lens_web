import { useState, useEffect, useCallback } from "react";
import { Plus, Search, TrendingDown, Calendar, Clock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Refresh } from "@/components/ui/Refresh";
import {
  getExpenses,
  getExpenseSummary,
  getExpenseCategories,
} from "@/services/expense";
import { getCashBankLedgers } from "@/services/ledger";
import { useExpenseColumns } from "./useExpenseColumns";
import AddExpenseDialog from "./AddExpenseDialog";

const fmt = (v) =>
  `₹${parseFloat(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function ExpensesMain() {
  const { toast } = useToast();

  // List state
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting
  const [sorting, setSorting] = useState([]);

  // Summary
  const [summary, setSummary] = useState({
    thisMonth: 0,
    lastMonth: 0,
    thisYear: 0,
    total: 0,
  });

  // Dialog data
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [bankLedgers, setBankLedgers] = useState([]);

  const columns = useExpenseColumns();

  const fetchSummary = useCallback(async () => {
    try {
      const res = await getExpenseSummary();
      if (res.success) setSummary(res.data);
    } catch {
      // Non-critical; ignore
    }
  }, [refreshKey]);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { page: pageIndex + 1, limit: pageSize };
      if (searchQuery) params.search = searchQuery;
      const sortField = sorting[0]?.id || "expenseDate";
      const sortDir = sorting[0]?.desc ? "desc" : "asc";
      params.sortField = sortField;
      params.sortDir = sortDir;

      const res = await getExpenses(params);
      setExpenses(res.data || []);
      setTotalCount(res.pagination?.total ?? (res.data?.length || 0));
    } catch {
      toast({ variant: "destructive", title: "Failed to load expenses" });
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, searchQuery, sorting, refreshKey]);

  const fetchDialogData = useCallback(async () => {
    try {
      const [catRes, ledgerRes] = await Promise.all([
        getExpenseCategories(),
        getCashBankLedgers(),
      ]);
      if (catRes.success) setCategories(catRes.data || []);
      if (ledgerRes.success) setBankLedgers(ledgerRes.data || []);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchDialogData();
  }, []);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    toast({ title: "Refreshed" });
  };

  const handleExpenseCreated = () => {
    fetchExpenses();
    fetchSummary();
  };

  const summaryCards = [
    { label: "This Month", value: fmt(summary.thisMonth), icon: Calendar },
    { label: "Last Month", value: fmt(summary.lastMonth), icon: Clock },
    { label: "This Year", value: fmt(summary.thisYear), icon: BarChart3 },
    { label: "All Time", value: fmt(summary.total), icon: TrendingDown },
  ];

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Expenses</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track and manage business expenses
          </p>
        </div>
        <Button size="xs" className="gap-1.5 h-8" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add Expense</span>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <c.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
              <p className="text-lg font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search bar */}
      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(0);
              }}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Refresh onClick={handleRefresh} />
        </div>
      </Card>

      {/* Table */}
      <div className="flex-1 min-h-0">
        <Table
          data={expenses}
          columns={columns}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPageIndex}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
          loading={isLoading}
          sorting={sorting}
          setSorting={setSorting}
          pagination={true}
          emptyMessage="No expenses found"
        />
      </div>

      {/* Add Expense Dialog */}
      <AddExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        bankLedgers={bankLedgers}
        onCreated={handleExpenseCreated}
      />
    </div>
  );
}
