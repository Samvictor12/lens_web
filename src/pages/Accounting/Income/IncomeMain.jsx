import { useState, useEffect, useCallback } from "react";
import { Plus, Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Refresh } from "@/components/ui/Refresh";
import { getIncomes, getIncomeSummary, getIncomeCategories, deleteIncome } from "@/services/income";
import { getCashBankCapitalLedgers } from "@/services/ledger";
import { useIncomeColumns } from "./useIncomeColumns";
import AddIncomeDialog from "./AddIncomeDialog";

const fmt = (v) =>
  `₹${parseFloat(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function IncomeMain() {
  const { toast } = useToast();
  const [incomes, setIncomes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [sorting, setSorting] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [transferLedgers, setTransferLedgers] = useState([]);

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete income ${row.incomeNumber}? This reverses the ledger posting.`)) return;
    try {
      await deleteIncome(row.id);
      toast({ title: "Income deleted" });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({ variant: "destructive", title: e?.response?.data?.message || "Delete failed" });
    }
  };

  const columns = useIncomeColumns(handleDelete);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await getIncomeSummary();
      if (res.success) setSummary(res.data || {});
    } catch {
      // ignore
    }
  }, [refreshKey]);

  const fetchIncomes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { page: pageIndex + 1, limit: pageSize };
      if (searchQuery) params.search = searchQuery;
      const res = await getIncomes(params);
      setIncomes(res.data || []);
      setTotalCount(res.pagination?.total ?? (res.data?.length || 0));
    } catch {
      toast({ variant: "destructive", title: "Failed to load incomes" });
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, searchQuery, refreshKey]);

  const fetchDialogData = useCallback(async () => {
    // Independent loads so a ledger failure cannot wipe categories (and vice versa)
    try {
      const catRes = await getIncomeCategories();
      if (catRes?.success) setCategories(catRes.data || []);
      else if (Array.isArray(catRes)) setCategories(catRes);
      else if (Array.isArray(catRes?.data)) setCategories(catRes.data);
    } catch (e) {
      toast({
        variant: "destructive",
        title: e?.response?.data?.message || "Failed to load income categories",
      });
    }
    try {
      const ledgers = await getCashBankCapitalLedgers();
      setTransferLedgers(Array.isArray(ledgers) ? ledgers : []);
    } catch (e) {
      toast({
        variant: "destructive",
        title: e?.response?.data?.message || "Failed to load transfer accounts",
      });
    }
  }, [toast]);

  useEffect(() => { fetchIncomes(); }, [fetchIncomes]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  // Reload categories + transfer ledgers whenever Record Income opens
  useEffect(() => {
    if (!dialogOpen) return;
    fetchDialogData();
  }, [dialogOpen, fetchDialogData]);

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">Income</h1>
          <p className="text-xs text-muted-foreground">Record bank transfers, loans, and other income</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Refresh onClick={() => setRefreshKey((k) => k + 1)} />
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Record Income
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-xs text-muted-foreground">Total Income</p>
            <p className="text-lg font-semibold">{fmt(summary.totalIncome)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8 h-9"
          placeholder="Search…"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPageIndex(0); }}
        />
      </div>

      <Table
        columns={columns}
        data={incomes}
        isLoading={isLoading}
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={{ pageIndex, pageSize, total: totalCount }}
        onPaginationChange={({ pageIndex: pi, pageSize: ps }) => {
          setPageIndex(pi);
          setPageSize(ps);
        }}
      />

      <AddIncomeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        transferLedgers={transferLedgers}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
