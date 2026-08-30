import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  CreditCard,
  PackageCheck,
  Receipt,
  History,
  FileText,
  Wallet,
  BookOpen,
  Search,
  X,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormSelect } from "@/components/ui/form-select";
import { Refresh } from "@/components/ui/Refresh";
import { useToast } from "@/hooks/use-toast";
import {
  getVendorPayments,
  getVendorPaymentById,
  getOutstandingVendorInvoices,
  getVendorPaymentStats,
} from "@/services/vendorPayment";
import { getCashBankLedgers } from "@/services/ledger";
import { getVendorDropdown } from "@/services/vendor";
import { getLensProductsDropdown } from "@/services/saleOrder";
import { currentMonthRange } from "@/constants/accountingPaths";
import { useVendorPaymentColumns } from "./useVendorPaymentColumns";
import CreateVendorInvoiceDialog from "./CreateVendorInvoiceDialog";
import CreateVendorPaymentFromInvoicesDialog from "./CreateVendorPaymentFromInvoicesDialog";
import MarkIndirectExpenseDialog from "./MarkIndirectExpenseDialog";
import PayExpenseBillDialog from "./PayExpenseBillDialog";
import VendorPaymentDetailDialog from "./VendorPaymentDetailDialog";
import OutstandingVendorInvoicesQueue from "./OutstandingVendorInvoicesQueue";
import PaymentHistoryExpandRow from "@/components/accounting/PaymentHistoryExpandRow";
import VendorCreditDebitNotesTab from "./VendorCreditDebitNotesTab";
import VendorPaymentsKpis from "./VendorPaymentsKpis";
import AwaitingVendorBillsTab from "./AwaitingVendorBillsTab";
import TargetPaymentTab from "./TargetPaymentTab";
import VendorLedgerTab from "./VendorLedgerTab";
import IndirectExpensesTab from "./IndirectExpensesTab";

function matchesInvoiceSearch(inv, q, group) {
  if (!q) return true;
  const hay = [
    inv.invoiceNumber,
    inv.supplierInvoiceNo,
    group?.vendorName,
    group?.vendorCode,
    inv.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export default function VendorPaymentsMain() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthDefaults = useMemo(() => currentMonthRange(), []);

  const [activeTab, setActiveTab] = useState(
    () => searchParams.get("tab") || "awaiting"
  );
  const [filters, setFilters] = useState({
    startDate: monthDefaults.startDate,
    endDate: monthDefaults.endDate,
    vendorId: searchParams.get("vendorId") || "",
    productId: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [createForVendor, setCreateForVendor] = useState("");
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentPreselectedVendorId, setPaymentPreselectedVendorId] = useState("");
  const [paymentPreselectedInvoiceIds, setPaymentPreselectedInvoiceIds] = useState([]);
  const [paymentPrefillAmount, setPaymentPrefillAmount] = useState("");
  const [markExpenseOpen, setMarkExpenseOpen] = useState(false);
  const [payExpenseBillOpen, setPayExpenseBillOpen] = useState(false);
  const [debitNoteCreateOpen, setDebitNoteCreateOpen] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [bankLedgers, setBankLedgers] = useState([]);

  const [outstandingGroups, setOutstandingGroups] = useState([]);
  const [flatInvoices, setFlatInvoices] = useState([]);
  const [loadingOutstanding, setLoadingOutstanding] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [outstandingSearch, setOutstandingSearch] = useState("");

  const [payments, setPayments] = useState([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [sorting, setSorting] = useState([]);
  const [expandedPaymentIds, setExpandedPaymentIds] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("openPayment") !== "1") return;
    const vendorId = searchParams.get("vendorId") || filters.vendorId || "";
    const invoiceIdsParam = searchParams.get("invoiceIds") || searchParams.get("invoiceId") || "";
    const ids = invoiceIdsParam
      ? invoiceIdsParam
          .split(",")
          .map((x) => parseInt(x, 10))
          .filter((n) => !Number.isNaN(n))
      : [];
    setPaymentPreselectedVendorId(vendorId ? String(vendorId) : "");
    setPaymentPreselectedInvoiceIds(ids);
    setPaymentPrefillAmount(searchParams.get("amount") || "");
    setRecordPaymentOpen(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("openPayment");
      return next;
    });
  }, [searchParams, filters.vendorId, setSearchParams]);

  useEffect(() => {
    (async () => {
      try {
        const [vendorRes, prodRes, ledgers] = await Promise.all([
          getVendorDropdown(),
          getLensProductsDropdown(),
          getCashBankLedgers(),
        ]);
        if (vendorRes.success) setVendors(vendorRes.data || []);
        setBankLedgers(Array.isArray(ledgers) ? ledgers : []);
        const prodList = prodRes?.data || prodRes || [];
        setProducts(
          (Array.isArray(prodList) ? prodList : []).map((p) => ({
            id: p.id ?? p.value,
            name: p.lens_name || p.name || p.label || `Product #${p.id}`,
          }))
        );
      } catch {
        // non-critical
      }
    })();
  }, []);

  const statsParams = useMemo(
    () => ({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      vendorId: filters.vendorId || undefined,
      productId: filters.productId || undefined,
    }),
    [filters]
  );

  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ["vendor-payments-stats", statsParams, refreshKey],
    queryFn: () => getVendorPaymentStats(statsParams),
    staleTime: 30_000,
  });

  const stats = statsRes?.data || {};

  const fetchOutstanding = useCallback(async () => {
    setLoadingOutstanding(true);
    try {
      const params = {
        ...(filters.vendorId && { vendorId: filters.vendorId }),
        ...(filters.productId && { productId: filters.productId }),
      };
      const [groupedRes, flatRes] = await Promise.all([
        getOutstandingVendorInvoices({ groupBy: "vendor", ...params }),
        getOutstandingVendorInvoices({ groupBy: "flat", ...params }),
      ]);
      setOutstandingGroups(groupedRes.data?.groups || []);
      setFlatInvoices(flatRes.data?.invoices || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load vendor bills" });
    } finally {
      setLoadingOutstanding(false);
    }
  }, [filters.vendorId, filters.productId, refreshKey, toast]);

  const fetchPayments = useCallback(async () => {
    setIsLoadingPayments(true);
    try {
      const params = {
        page: pageIndex + 1,
        limit: pageSize,
        ...(paymentSearch && { search: paymentSearch }),
        ...(filters.vendorId && { vendorId: filters.vendorId }),
        ...(filters.startDate && { from: filters.startDate }),
        ...(filters.endDate && { to: filters.endDate }),
      };
      const res = await getVendorPayments(params);
      setPayments(res.data || []);
      setTotalCount(res.pagination?.total ?? (res.data?.length || 0));
    } catch {
      toast({ variant: "destructive", title: "Failed to load payments" });
    } finally {
      setIsLoadingPayments(false);
    }
  }, [
    pageIndex,
    pageSize,
    paymentSearch,
    filters.vendorId,
    filters.startDate,
    filters.endDate,
    refreshKey,
    toast,
  ]);

  useEffect(() => {
    if (activeTab === "bills") fetchOutstanding();
  }, [activeTab, fetchOutstanding]);

  useEffect(() => {
    if (activeTab === "payments") fetchPayments();
  }, [activeTab, fetchPayments]);

  const allInvoices = useMemo(
    () => outstandingGroups.flatMap((g) => g.invoices),
    [outstandingGroups]
  );

  const filteredGroups = useMemo(() => {
    const q = outstandingSearch.trim().toLowerCase();
    return outstandingGroups
      .map((g) => ({
        ...g,
        invoices: g.invoices.filter((inv) => matchesInvoiceSearch(inv, q, g)),
      }))
      .filter((g) => g.invoices.length > 0);
  }, [outstandingGroups, outstandingSearch]);

  const filteredFlatInvoices = useMemo(() => {
    const q = outstandingSearch.trim().toLowerCase();
    return flatInvoices.filter((inv) => {
      const group = outstandingGroups.find((g) => g.vendorId === inv.vendorId);
      return matchesInvoiceSearch(inv, q, group);
    });
  }, [flatInvoices, outstandingSearch, outstandingGroups]);

  const hasInvoiceSelection = selectedInvoiceIds.length > 0;

  const openRecordPayment = useCallback((opts = {}) => {
    if (opts.invoice) {
      const inv = opts.invoice;
      setPaymentPreselectedVendorId(String(inv.vendorId));
      setPaymentPreselectedInvoiceIds([inv.id]);
      setPaymentPrefillAmount(String(Math.max(0, inv.outstanding || 0).toFixed(2)));
      setRecordPaymentOpen(true);
      return;
    }
    if (hasInvoiceSelection) {
      const selected = allInvoices.filter((inv) => selectedInvoiceIds.includes(inv.id));
      const vendorId = selected[0]?.vendorId;
      if (!vendorId) {
        toast({ variant: "destructive", title: "Selected bills must belong to one vendor" });
        return;
      }
      const sameVendor = selected.every((inv) => inv.vendorId === vendorId);
      if (!sameVendor) {
        toast({ variant: "destructive", title: "Select bills from a single vendor" });
        return;
      }
      const prefill = selected.reduce((sum, inv) => sum + (parseFloat(inv.outstanding) || 0), 0);
      setPaymentPreselectedVendorId(String(vendorId));
      setPaymentPreselectedInvoiceIds([...selectedInvoiceIds]);
      setPaymentPrefillAmount(prefill > 0 ? String(prefill.toFixed(2)) : "");
      setRecordPaymentOpen(true);
      return;
    }
    setPaymentPreselectedVendorId(filters.vendorId ? String(filters.vendorId) : "");
    setPaymentPreselectedInvoiceIds([]);
    setPaymentPrefillAmount("");
    setRecordPaymentOpen(true);
  }, [
    hasInvoiceSelection,
    allInvoices,
    selectedInvoiceIds,
    filters.vendorId,
    toast,
  ]);

  const headerActions = useMemo(() => {
    switch (activeTab) {
      case "awaiting":
        return [
          {
            label: "Register Bill",
            icon: Plus,
            onClick: () => {
              setCreateForVendor(filters.vendorId || "");
              setCreateInvoiceOpen(true);
            },
          },
        ];
      case "bills":
        return [
          {
            label: "Record Payment",
            icon: CreditCard,
            onClick: () => openRecordPayment(),
          },
        ];
      case "indirect":
        return [
          {
            label: "Mark Expense",
            icon: Banknote,
            onClick: () => setMarkExpenseOpen(true),
          },
          {
            label: "Pay Expense Bill",
            icon: CreditCard,
            onClick: () => setPayExpenseBillOpen(true),
          },
        ];
      case "debitNotes":
        return [
          {
            label: "New Debit Note",
            icon: FileText,
            onClick: () => setDebitNoteCreateOpen(true),
          },
        ];
      default:
        return [];
    }
  }, [activeTab, filters.vendorId, openRecordPayment]);

  const handleViewPayment = async (p) => {
    setLoadingDetail(true);
    setDetailOpen(true);
    try {
      const res = await getVendorPaymentById(p.id);
      setSelectedPayment(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load payment details" });
      setDetailOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedPaymentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const columns = useVendorPaymentColumns(handleViewPayment, {
    expandedIds: expandedPaymentIds,
    onToggleExpand: toggleExpand,
  });

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    toast({ title: "Refreshed" });
  };

  const productOptions = useMemo(
    () => products.map((p) => ({ id: p.id, name: p.name })),
    [products]
  );

  const collectibleParams = useMemo(
    () => ({
      endDate: filters.endDate,
      vendorId: filters.vendorId,
      productId: filters.productId,
    }),
    [filters.endDate, filters.vendorId, filters.productId]
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-1 sm:p-1 md:p-3 gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Vendor Bills & Expenses</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Direct bills · expenses · payments · vendor ledger
          </p>
        </div>
        <div className="flex gap-1.5">
          {headerActions.map((action) => (
            <Button key={action.label} size="xs" className="gap-1.5 h-8" onClick={action.onClick}>
              <action.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <Card className="p-2 flex-shrink-0">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              className="h-8 w-36 text-sm"
              value={filters.startDate}
              onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              className="h-8 w-36 text-sm"
              value={filters.endDate}
              onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1 w-full sm:w-48">
            <Label className="text-xs">Vendor</Label>
            <FormSelect
              options={vendors}
              value={filters.vendorId || null}
              onChange={(v) =>
                setFilters((f) => ({ ...f, vendorId: v != null ? String(v) : "" }))
              }
              placeholder="All vendors"
              isSearchable
              isClearable
            />
          </div>
          <div className="space-y-1 w-full sm:w-48">
            <Label className="text-xs">Product</Label>
            <FormSelect
              options={productOptions}
              value={filters.productId || null}
              onChange={(v) =>
                setFilters((f) => ({ ...f, productId: v != null ? String(v) : "" }))
              }
              placeholder="All products"
              isSearchable
              isClearable
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="xs"
              className="h-8 px-2"
              onClick={() =>
                setFilters({
                  startDate: monthDefaults.startDate,
                  endDate: monthDefaults.endDate,
                  vendorId: "",
                  productId: "",
                })
              }
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Refresh onClick={handleRefresh} />
          </div>
        </div>
      </Card>

      <VendorPaymentsKpis stats={stats} loading={statsLoading} />

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set("tab", v);
            return next;
          });
        }}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 mb-2 flex-shrink-0 h-auto gap-1">
          <TabsTrigger value="awaiting" className="gap-1 text-xs sm:text-sm">
            <PackageCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Awaiting Bills</span>
          </TabsTrigger>
          <TabsTrigger value="bills" className="gap-1 text-xs sm:text-sm">
            <Receipt className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Vendor Bills</span>
          </TabsTrigger>
          <TabsTrigger value="indirect" className="gap-1 text-xs sm:text-sm">
            <Banknote className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Expenses</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1 text-xs sm:text-sm">
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="debitNotes" className="gap-1 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Debit Notes</span>
          </TabsTrigger>
          <TabsTrigger value="target" className="gap-1 text-xs sm:text-sm">
            <Wallet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Target</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-1 text-xs sm:text-sm">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ledger</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="awaiting" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="overflow-y-auto flex-1 pb-4">
            <AwaitingVendorBillsTab filters={filters} refreshKey={refreshKey} />
          </div>
        </TabsContent>

        <TabsContent value="bills" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden gap-2">
          <Card className="p-1 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search invoice, vendor..."
                  value={outstandingSearch}
                  onChange={(e) => setOutstandingSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
            </div>
          </Card>
          <Card className="p-2 flex min-h-0 flex-1 flex-col overflow-hidden">
            {loadingOutstanding ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <OutstandingVendorInvoicesQueue
                  groups={filteredGroups}
                  flatInvoices={filteredFlatInvoices}
                  grouped
                  selectedIds={selectedInvoiceIds}
                  onSelectionChange={setSelectedInvoiceIds}
                />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="indirect" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <IndirectExpensesTab filters={filters} refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="payments" className="mt-0 flex min-h-0 flex-1 flex-col gap-2">
          <Card className="p-1 flex-shrink-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search voucher, vendor..."
                value={paymentSearch}
                onChange={(e) => {
                  setPaymentSearch(e.target.value);
                  setPageIndex(0);
                }}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </Card>
          <div className="flex-1 min-h-0">
            <Table
              data={payments}
              columns={columns}
              pageIndex={pageIndex}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPageIndex}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPageIndex(0);
              }}
              loading={isLoadingPayments}
              sorting={sorting}
              setSorting={setSorting}
              pagination
              emptyMessage="No vendor payments found"
              expandedRowIds={expandedPaymentIds}
              renderExpandedRow={(p) => (
                <PaymentHistoryExpandRow type="vendor" payment={p} />
              )}
            />
          </div>
        </TabsContent>

        <TabsContent value="debitNotes" className="mt-0 flex min-h-0 flex-1 flex-col">
          <VendorCreditDebitNotesTab
            type="debit"
            vendors={vendors}
            createOpen={debitNoteCreateOpen}
            onCreateOpenChange={setDebitNoteCreateOpen}
          />
        </TabsContent>

        <TabsContent value="target" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="overflow-y-auto flex-1">
            <TargetPaymentTab
              filters={filters}
              collectibleParams={collectibleParams}
              refreshKey={refreshKey}
            />
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <VendorLedgerTab vendors={vendors} filters={filters} />
        </TabsContent>
      </Tabs>

      <CreateVendorInvoiceDialog
        open={createInvoiceOpen}
        onOpenChange={setCreateInvoiceOpen}
        vendors={vendors}
        initialVendorId={createForVendor}
        onCreated={() => {
          setRefreshKey((k) => k + 1);
          fetchOutstanding();
        }}
      />

      <CreateVendorPaymentFromInvoicesDialog
        open={recordPaymentOpen}
        onOpenChange={setRecordPaymentOpen}
        vendors={vendors}
        bankLedgers={bankLedgers}
        preselectedVendorId={paymentPreselectedVendorId}
        preselectedInvoiceIds={paymentPreselectedInvoiceIds}
        prefillAmount={paymentPrefillAmount}
        onCreated={() => {
          setRefreshKey((k) => k + 1);
          setSelectedInvoiceIds([]);
          fetchOutstanding();
          if (activeTab === "payments") fetchPayments();
        }}
      />

      <MarkIndirectExpenseDialog
        open={markExpenseOpen}
        onOpenChange={setMarkExpenseOpen}
        onCreated={handleRefresh}
      />

      <PayExpenseBillDialog
        open={payExpenseBillOpen}
        onOpenChange={setPayExpenseBillOpen}
        bankLedgers={bankLedgers}
        onCreated={handleRefresh}
      />

      <VendorPaymentDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        payment={loadingDetail ? null : selectedPayment}
        onCancelled={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
