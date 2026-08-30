import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, TrendingUp, Landmark, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Refresh } from "@/components/ui/Refresh";
import { getIncomes, getIncomeSummary, getIncomeCategories, deleteIncome } from "@/services/income";
import { getCashBankCapitalLedgers } from "@/services/ledger";
import { useIncomeColumns } from "./useIncomeColumns";
import AddIncomeDialog from "./AddIncomeDialog";

const LOAN_CATEGORY_NAME = "Loan";

const fmt = (v) =>
  `₹${parseFloat(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function IncomeMain() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("income");
  const [incomes, setIncomes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [sorting, setSorting] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalLoans: 0,
    monthIncome: 0,
    monthLoans: 0,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [transferLedgers, setTransferLedgers] = useState([]);

  const loanCategory = useMemo(
    () => (categories || []).find((c) => c.name === LOAN_CATEGORY_NAME && c.delete_status !== true),
    [categories]
  );

  const incomeLedgerCategory = useMemo(() => {
    const nonLoan = (categories || []).filter(
      (c) => c.name !== LOAN_CATEGORY_NAME && c.delete_status !== true && (c.ledger_id || c.ledger?.id)
    );
    return (
      nonLoan.find((c) => c.name === "Bank Transfer") ||
      nonLoan[0] ||
      null
    );
  }, [categories]);

  const handleDelete = async (row) => {
    const label = activeTab === "loans" ? "loan" : "income";
    if (!window.confirm(`Delete ${label} ${row.incomeNumber}? This reverses the ledger posting.`)) return;
    try {
      await deleteIncome(row.id);
      toast({ title: activeTab === "loans" ? "Loan deleted" : "Income deleted" });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({ variant: "destructive", title: e?.response?.data?.message || "Delete failed" });
    }
  };

  const columns = useIncomeColumns(handleDelete);

  const fetchCategories = useCallback(async () => {
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
  }, [toast]);

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
      if (activeTab === "loans") {
        if (loanCategory?.id) params.categoryId = loanCategory.id;
        else {
          setIncomes([]);
          setTotalCount(0);
          setIsLoading(false);
          return;
        }
      } else if (loanCategory?.id) {
        params.excludeCategoryId = loanCategory.id;
      }
      const res = await getIncomes(params);
      setIncomes(res.data || []);
      setTotalCount(res.pagination?.total ?? (res.data?.length || 0));
    } catch {
      toast({ variant: "destructive", title: "Failed to load incomes" });
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, searchQuery, refreshKey, activeTab, loanCategory?.id, toast]);

  const fetchDialogData = useCallback(async () => {
    await fetchCategories();
    try {
      const ledgers = await getCashBankCapitalLedgers();
      setTransferLedgers(Array.isArray(ledgers) ? ledgers : []);
    } catch (e) {
      toast({
        variant: "destructive",
        title: e?.response?.data?.message || "Failed to load transfer accounts",
      });
    }
  }, [toast, fetchCategories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (!dialogOpen) return;
    fetchDialogData();
  }, [dialogOpen, fetchDialogData]);

  const openLedgerReport = (ledgerId) => {
    if (!ledgerId) {
      toast({
        variant: "destructive",
        title: "No ledger linked to this category",
      });
      return;
    }
    navigate(`/accounts/reports?tab=ledger&ledgerId=${ledgerId}`);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPageIndex(0);
    setSearchQuery("");
  };

  const isLoans = activeTab === "loans";

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">Income and loans</h1>
          <p className="text-xs text-muted-foreground">
            Record income and loans with From/To ledger posting
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              openLedgerReport(incomeLedgerCategory?.ledger_id || incomeLedgerCategory?.ledger?.id)
            }
          >
            <FileText className="h-4 w-4" />
            Income ledger
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => openLedgerReport(loanCategory?.ledger_id || loanCategory?.ledger?.id)}
          >
            <FileText className="h-4 w-4" />
            Loan ledger
          </Button>
          <Refresh onClick={() => setRefreshKey((k) => k + 1)} />
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            {isLoans ? "Add Loan" : "Add Income"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Total Income</p>
              <p className="text-lg font-semibold">{fmt(summary.totalIncome)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Landmark className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Total Loans</p>
              <p className="text-lg font-semibold">{fmt(summary.totalLoans)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Total Income this Month</p>
              <p className="text-lg font-semibold">{fmt(summary.monthIncome)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Landmark className="h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Total Loans this Month</p>
              <p className="text-lg font-semibold">{fmt(summary.monthLoans)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8 h-9"
          placeholder={isLoans ? "Search loans…" : "Search income…"}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPageIndex(0);
          }}
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
        mode={isLoans ? "loans" : "income"}
        loanCategory={loanCategory}
        categories={categories}
        transferLedgers={transferLedgers}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
