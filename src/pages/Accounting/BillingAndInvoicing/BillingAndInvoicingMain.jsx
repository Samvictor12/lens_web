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
import { getInvoiceStats } from "@/services/invoice";
import {
  getCustomerPayments,
  getCustomerPaymentById,
  getOutstandingInvoices,
} from "@/services/customerPayment";
import { getCustomerDropdown } from "@/services/customer";
import { getCashBankLedgers } from "@/services/ledger";
import { getLensProductsDropdown } from "@/services/saleOrder";
import { canRecordPayment } from "@/pages/Billing/Billing.constants";
import CreateInvoiceDialog from "@/pages/Billing/CreateInvoiceDialog";
import InvoiceDetailDialog from "@/pages/Billing/InvoiceDetailDialog";
import InvoicePreviewDialog from "@/pages/Billing/InvoicePreviewDialog";
import DispatchedOrdersTab from "@/pages/Billing/DispatchedOrdersTab";
import OutstandingInvoicesQueue from "@/pages/Accounting/CustomerPayments/OutstandingInvoicesQueue";
import CreditDebitNotesTab from "@/pages/Accounting/CustomerPayments/CreditDebitNotesTab";
import { useCustomerPaymentColumns } from "@/pages/Accounting/CustomerPayments/useCustomerPaymentColumns";
import CreateCustomerPaymentDialog from "@/pages/Accounting/CustomerPayments/CreateCustomerPaymentDialog";
import CustomerPaymentDetailDialog from "@/pages/Accounting/CustomerPayments/CustomerPaymentDetailDialog";
import PaymentHistoryExpandRow from "@/components/accounting/PaymentHistoryExpandRow";
import { currentMonthRange } from "@/constants/accountingPaths";
import BillingAndInvoicingKpis from "./BillingAndInvoicingKpis";
import CollectionTab from "./CollectionTab";
import CustomerLedgerTab from "./CustomerLedgerTab";

function matchesInvoiceSearch(inv, q, group) {
  if (!q) return true;
  const hay = [
    inv.invoiceNo,
    group?.customerName,
    group?.customerCode,
    group?.shopname,
    group?.city,
    group?.phone,
    inv.customer?.name,
    inv.customer?.code,
    inv.customer?.shopname,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export default function BillingAndInvoicingMain() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthDefaults = useMemo(() => currentMonthRange(), []);

  const [activeTab, setActiveTab] = useState(
    () => searchParams.get("tab") || "awaiting"
  );
  const [filters, setFilters] = useState({
    startDate: monthDefaults.startDate,
    endDate: monthDefaults.endDate,
    customerId: searchParams.get("customerId") || "",
    productId: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForCustomer, setCreateForCustomer] = useState("");
  const [createPaymentOpen, setCreatePaymentOpen] = useState(false);
  const [creditNoteCreateOpen, setCreditNoteCreateOpen] = useState(false);
  const [paymentDialogMode, setPaymentDialogMode] = useState("record");
  const [paymentPreselectedCustomerId, setPaymentPreselectedCustomerId] = useState("");
  const [paymentPreselectedInvoiceIds, setPaymentPreselectedInvoiceIds] = useState([]);
  const [paymentPrefillAmount, setPaymentPrefillAmount] = useState("");
  const [bankLedgers, setBankLedgers] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [outstandingGroups, setOutstandingGroups] = useState([]);
  const [flatInvoices, setFlatInvoices] = useState([]);
  const [loadingOutstanding, setLoadingOutstanding] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [outstandingSearch, setOutstandingSearch] = useState("");
  const [groupBy, setGroupBy] = useState("customer");

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
    const invoiceId = searchParams.get("invoiceId");
    const openDetail = searchParams.get("openDetail");
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
    if (invoiceId && openDetail === "1") {
      setDetailId(parseInt(invoiceId, 10));
      setActiveTab("invoices");
      const next = new URLSearchParams(searchParams);
      next.delete("openDetail");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get("openPayment") !== "1") return;
    const customerId = searchParams.get("customerId") || filters.customerId || "";
    const invoiceIdsParam = searchParams.get("invoiceIds") || searchParams.get("invoiceId") || "";
    const ids = invoiceIdsParam
      ? invoiceIdsParam
          .split(",")
          .map((x) => parseInt(x, 10))
          .filter((n) => !Number.isNaN(n))
      : [];
    setPaymentDialogMode(ids.length ? "record" : "new");
    setPaymentPreselectedCustomerId(customerId ? String(customerId) : "");
    setPaymentPreselectedInvoiceIds(ids);
    setPaymentPrefillAmount(searchParams.get("amount") || "");
    setCreatePaymentOpen(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("openPayment");
      return next;
    });
  }, [searchParams, filters.customerId, setSearchParams]);

  useEffect(() => {
    (async () => {
      try {
        const [custRes, prodRes, ledgers] = await Promise.all([
          getCustomerDropdown(),
          getLensProductsDropdown(),
          getCashBankLedgers(),
        ]);
        if (custRes.success) setCustomers(custRes.data || []);
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
      customerId: filters.customerId || undefined,
      productId: filters.productId || undefined,
    }),
    [filters]
  );

  const awaitingFilters = useMemo(
    () => ({
      customerId: filters.customerId || undefined,
      productId: filters.productId || undefined,
    }),
    [filters.customerId, filters.productId]
  );

  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ["billing-invoicing-stats", statsParams, refreshKey],
    queryFn: () => getInvoiceStats(statsParams),
    staleTime: 30_000,
  });

  const stats = statsRes?.data || {};

  const fetchOutstanding = useCallback(async () => {
    setLoadingOutstanding(true);
    try {
      const params = {
        ...(filters.customerId && { customerId: filters.customerId }),
        ...(filters.productId && { productId: filters.productId }),
      };
      const [groupedRes, flatRes] = await Promise.all([
        getOutstandingInvoices({ groupBy: "customer", ...params }),
        getOutstandingInvoices({ groupBy: "flat", ...params }),
      ]);
      setOutstandingGroups(groupedRes.data?.groups || []);
      setFlatInvoices(flatRes.data?.invoices || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load outstanding invoices" });
    } finally {
      setLoadingOutstanding(false);
    }
  }, [filters.customerId, filters.productId, refreshKey, toast]);

  const fetchPayments = useCallback(async () => {
    setIsLoadingPayments(true);
    try {
      const params = {
        page: pageIndex + 1,
        limit: pageSize,
        ...(paymentSearch && { search: paymentSearch }),
        ...(filters.customerId && { customerId: filters.customerId }),
        ...(filters.startDate && { from: filters.startDate }),
        ...(filters.endDate && { to: filters.endDate }),
      };
      const res = await getCustomerPayments(params);
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
    filters.customerId,
    filters.startDate,
    filters.endDate,
    refreshKey,
    toast,
  ]);

  useEffect(() => {
    fetchOutstanding();
  }, [fetchOutstanding]);

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
      const group = outstandingGroups.find((g) => g.customerId === inv.customerId);
      return matchesInvoiceSearch(inv, q, group);
    });
  }, [flatInvoices, outstandingSearch, outstandingGroups]);

  const hasInvoiceSelection = selectedInvoiceIds.length > 0;

  const openRecordPaymentDialog = useCallback((opts = {}) => {
    if (opts.invoice) {
      const inv = opts.invoice;
      if (!canRecordPayment(inv.status)) {
        toast({ variant: "destructive", title: "Invoice must be issued before recording payment." });
        return;
      }
      setPaymentDialogMode("record");
      setPaymentPreselectedCustomerId(String(inv.customerId));
      setPaymentPreselectedInvoiceIds([inv.id]);
      setPaymentPrefillAmount(
        opts.lockAmount
          ? String(Math.max(0, inv.totalAmount - inv.paidAmount).toFixed(2))
          : ""
      );
      setCreatePaymentOpen(true);
      return;
    }
    if (hasInvoiceSelection) {
      const selected = allInvoices.filter((inv) => selectedInvoiceIds.includes(inv.id));
      const payable = selected.filter((inv) => canRecordPayment(inv.status));
      if (!payable.length) {
        toast({
          variant: "destructive",
          title: "Selected invoices must be issued before recording payment.",
        });
        return;
      }
      const customerId = payable[0]?.customerId;
      if (!customerId) {
        toast({ variant: "destructive", title: "Selected invoices must belong to one customer" });
        return;
      }
      const prefill = payable.reduce((sum, inv) => sum + (parseFloat(inv.outstanding) || 0), 0);
      setPaymentDialogMode("record");
      setPaymentPreselectedCustomerId(String(customerId));
      setPaymentPreselectedInvoiceIds(payable.map((inv) => inv.id));
      setPaymentPrefillAmount(prefill > 0 ? String(prefill.toFixed(2)) : "");
      setCreatePaymentOpen(true);
      return;
    }
    setPaymentDialogMode("new");
    setPaymentPreselectedCustomerId(filters.customerId ? String(filters.customerId) : "");
    setPaymentPreselectedInvoiceIds([]);
    setPaymentPrefillAmount("");
    setCreatePaymentOpen(true);
  }, [
    hasInvoiceSelection,
    allInvoices,
    selectedInvoiceIds,
    filters.customerId,
    toast,
  ]);

  const headerAction = useMemo(() => {
    switch (activeTab) {
      case "awaiting":
        return {
          label: "Create Invoice",
          icon: Plus,
          onClick: () => {
            setCreateForCustomer(filters.customerId || "");
            setCreateOpen(true);
          },
        };
      case "invoices":
        return {
          label: "Record Payment",
          icon: CreditCard,
          onClick: () => openRecordPaymentDialog(),
        };
      case "creditNotes":
        return {
          label: "New Credit Note",
          icon: FileText,
          onClick: () => setCreditNoteCreateOpen(true),
        };
      default:
        return null;
    }
  }, [activeTab, filters.customerId, openRecordPaymentDialog]);

  const handleViewPayment = async (p) => {
    setLoadingDetail(true);
    setDetailOpen(true);
    try {
      const res = await getCustomerPaymentById(p.id);
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

  const columns = useCustomerPaymentColumns(handleViewPayment, {
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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-1 sm:p-1 md:p-3 gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Billing and invoicing</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Invoices · collections · credit notes · customer ledger
          </p>
        </div>
        <div className="flex gap-1.5">
          {headerAction && (
            <Button size="xs" className="gap-1.5 h-8" onClick={headerAction.onClick}>
              <headerAction.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{headerAction.label}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Shared filters */}
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
            <Label className="text-xs">Customer</Label>
            <FormSelect
              options={customers}
              value={filters.customerId || null}
              onChange={(v) =>
                setFilters((f) => ({ ...f, customerId: v != null ? String(v) : "" }))
              }
              placeholder="All customers"
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
                  customerId: "",
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

      <BillingAndInvoicingKpis stats={stats} loading={statsLoading} />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-2 flex-shrink-0 h-auto gap-1">
          <TabsTrigger value="awaiting" className="gap-1 text-xs sm:text-sm">
            <PackageCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Awaiting</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1 text-xs sm:text-sm">
            <Receipt className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Invoices</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1 text-xs sm:text-sm">
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="creditNotes" className="gap-1 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Credit Notes</span>
          </TabsTrigger>
          <TabsTrigger value="collection" className="gap-1 text-xs sm:text-sm">
            <Wallet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Collection</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-1 text-xs sm:text-sm">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Customer Ledger</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="awaiting" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="overflow-y-auto flex-1 pb-4">
            <DispatchedOrdersTab sharedFilters={awaitingFilters} />
          </div>
        </TabsContent>

        <TabsContent
          value="invoices"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden gap-2"
        >
          <Card className="p-1 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search invoice, customer…"
                  value={outstandingSearch}
                  onChange={(e) => setOutstandingSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Group by:
                </span>
                <div className="w-36">
                  <FormSelect
                    name="groupBy"
                    options={[
                      { id: null, name: "No Grouping" },
                      { id: "customer", name: "Customer" },
                    ]}
                    value={groupBy}
                    onChange={(value) => setGroupBy(value ?? null)}
                    placeholder="None"
                    isSearchable={false}
                    isClearable={false}
                  />
                </div>
              </div>
              <Refresh onClick={handleRefresh} />
            </div>
          </Card>
          <Card className="p-2 flex min-h-0 flex-1 flex-col overflow-hidden">
            {loadingOutstanding ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <OutstandingInvoicesQueue
                  groups={filteredGroups}
                  flatInvoices={filteredFlatInvoices}
                  grouped={groupBy === "customer"}
                  selectedIds={selectedInvoiceIds}
                  onSelectionChange={setSelectedInvoiceIds}
                  onViewInvoice={(id) => setDetailId(id)}
                />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-0 flex-1 min-h-0 flex flex-col gap-2">
          <Card className="p-1 flex-shrink-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by receipt, customer…"
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
              emptyMessage="No customer payments found"
              expandedRowIds={expandedPaymentIds}
              renderExpandedRow={(p) => (
                <PaymentHistoryExpandRow type="customer" payment={p} />
              )}
            />
          </div>
        </TabsContent>

        <TabsContent value="creditNotes" className="mt-0 flex-1 min-h-0 flex flex-col gap-2">
          <CreditDebitNotesTab
            type="credit"
            customers={customers}
            createOpen={creditNoteCreateOpen}
            onCreateOpenChange={setCreditNoteCreateOpen}
          />
        </TabsContent>

        <TabsContent value="collection" className="mt-0 flex-1 min-h-0 overflow-y-auto">
          <CollectionTab
            filters={filters}
            collectibleParams={{
              endDate: filters.endDate,
              customerId: filters.customerId,
              productId: filters.productId,
            }}
            refreshKey={refreshKey}
          />
        </TabsContent>

        <TabsContent value="ledger" className="mt-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          <CustomerLedgerTab customers={customers} filters={filters} />
        </TabsContent>
      </Tabs>

      <CreateInvoiceDialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateForCustomer("");
        }}
        onCreated={() => {
          setRefreshKey((k) => k + 1);
          fetchOutstanding();
        }}
        initialCustomerId={createForCustomer}
      />
      <InvoiceDetailDialog
        invoiceId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        onPay={(inv) => {
          setDetailId(null);
          openRecordPaymentDialog({ invoice: inv });
        }}
        onPreview={(inv) => setPreviewInvoice(inv)}
        onUpdated={() => {
          setRefreshKey((k) => k + 1);
          fetchOutstanding();
        }}
      />
      <InvoicePreviewDialog
        invoice={previewInvoice}
        open={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
      />
      <CreateCustomerPaymentDialog
        open={createPaymentOpen}
        onOpenChange={setCreatePaymentOpen}
        mode={paymentDialogMode}
        customers={customers}
        bankLedgers={bankLedgers}
        preselectedCustomerId={paymentPreselectedCustomerId}
        preselectedInvoiceIds={paymentPreselectedInvoiceIds}
        preselectedInvoices={flatInvoices}
        prefillAmount={paymentPrefillAmount}
        onCreated={() => {
          setRefreshKey((k) => k + 1);
          setSelectedInvoiceIds([]);
          fetchOutstanding();
          fetchPayments();
        }}
      />
      <CustomerPaymentDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        payment={loadingDetail ? null : selectedPayment}
        onCancelled={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
