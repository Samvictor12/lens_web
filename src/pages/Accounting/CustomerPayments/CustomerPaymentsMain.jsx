import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Refresh } from "@/components/ui/Refresh";
import {
  getCustomerPayments,
  getCustomerPaymentById,
  getOutstandingInvoices,
} from "@/services/customerPayment";
import { getCashBankLedgers } from "@/services/ledger";
import { getCustomerDropdown } from "@/services/customer";
import { useCustomerPaymentColumns } from "./useCustomerPaymentColumns";
import CreateCustomerPaymentDialog from "./CreateCustomerPaymentDialog";
import CustomerPaymentDetailDialog from "./CustomerPaymentDetailDialog";
import OutstandingInvoicesQueue from "./OutstandingInvoicesQueue";
import PaymentHistoryExpandRow from "@/components/accounting/PaymentHistoryExpandRow";

export default function CustomerPaymentsMain() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState("outstanding");
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [sorting, setSorting] = useState([]);

  const [outstandingGroups, setOutstandingGroups] = useState([]);
  const [flatInvoices, setFlatInvoices] = useState([]);
  const [groupedView, setGroupedView] = useState(true);
  const [loadingOutstanding, setLoadingOutstanding] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [bankLedgers, setBankLedgers] = useState([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedPaymentIds, setExpandedPaymentIds] = useState([]);

  const urlCustomerId = searchParams.get("customerId");
  const urlInvoiceId = searchParams.get("invoiceId");
  const urlOpenForm = searchParams.get("openForm");
  const urlAmount = searchParams.get("amount");

  const allInvoices = useMemo(
    () => outstandingGroups.flatMap((g) => g.invoices),
    [outstandingGroups]
  );

  const preselectedInvoices = useMemo(() => {
    const ids = urlInvoiceId
      ? [parseInt(urlInvoiceId)]
      : selectedInvoiceIds;
    return allInvoices.filter((inv) => ids.includes(inv.id));
  }, [allInvoices, selectedInvoiceIds, urlInvoiceId]);

  const preselectedCustomerId =
    urlCustomerId ||
    (preselectedInvoices[0]?.customerId ? String(preselectedInvoices[0].customerId) : "");

  const handleView = async (p) => {
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

  const columns = useCustomerPaymentColumns(handleView, {
    expandedIds: expandedPaymentIds,
    onToggleExpand: toggleExpand,
  });

  const fetchOutstanding = useCallback(async () => {
    setLoadingOutstanding(true);
    try {
      const [groupedRes, flatRes] = await Promise.all([
        getOutstandingInvoices({ groupBy: "customer" }),
        getOutstandingInvoices({ groupBy: "flat" }),
      ]);
      setOutstandingGroups(groupedRes.data?.groups || []);
      setFlatInvoices(flatRes.data?.invoices || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load outstanding invoices" });
    } finally {
      setLoadingOutstanding(false);
    }
  }, [refreshKey]);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { page: pageIndex + 1, limit: pageSize };
      if (searchQuery) params.search = searchQuery;
      const res = await getCustomerPayments(params);
      setPayments(res.data || []);
      setTotalCount(res.pagination?.total ?? (res.data?.length || 0));
    } catch {
      toast({ variant: "destructive", title: "Failed to load payments" });
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, searchQuery, refreshKey]);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [custRes, ledgers] = await Promise.all([
        getCustomerDropdown(),
        getCashBankLedgers(),
      ]);
      if (custRes.success) setCustomers(custRes.data || []);
      setBankLedgers(Array.isArray(ledgers) ? ledgers : []);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    if (activeTab === "outstanding") fetchOutstanding();
    else fetchPayments();
  }, [activeTab, fetchOutstanding, fetchPayments]);

  useEffect(() => {
    if (urlInvoiceId) {
      setSelectedInvoiceIds([parseInt(urlInvoiceId)]);
    }
    if (urlOpenForm === "1") {
      setCreateOpen(true);
      setActiveTab("outstanding");
    }
  }, [urlInvoiceId, urlOpenForm]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    toast({ title: "Refreshed" });
  };

  const handleRecordPayment = () => {
    if (!selectedInvoiceIds.length && !urlInvoiceId) {
      toast({ variant: "destructive", title: "Select at least one invoice" });
      return;
    }
    setCreateOpen(true);
  };

  /** New Payment uses the same OutstandingInvoicesQueue List UI for invoice selection. */
  const handleNewPayment = () => {
    setSelectedInvoiceIds([]);
    setActiveTab("outstanding");
    toast({
      title: "Select invoices",
      description: "Choose invoices from the list, then click Record Payment.",
    });
  };

  const clearDeepLink = () => {
    if (urlCustomerId || urlInvoiceId || urlOpenForm) {
      setSearchParams({});
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Customer Payments</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record receipts against outstanding invoices
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="xs"
            variant="outline"
            className="gap-1.5 h-8"
            onClick={handleRecordPayment}
            disabled={activeTab === "outstanding" && !selectedInvoiceIds.length}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Record Payment</span>
          </Button>
          <Button size="xs" className="gap-1.5 h-8" onClick={handleNewPayment}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Payment</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-2">
          <TabsTrigger value="outstanding">Outstanding Invoices</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="outstanding" className="mt-0 flex-1 min-h-0 overflow-y-auto space-y-2">
          <Card className="p-2">
            <div className="flex items-center justify-between mb-2">
              <Refresh onClick={handleRefresh} />
            </div>
            {loadingOutstanding ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Loading...</p>
            ) : (
              <OutstandingInvoicesQueue
                groups={outstandingGroups}
                flatInvoices={flatInvoices}
                grouped={groupedView}
                selectedIds={selectedInvoiceIds}
                onSelectionChange={setSelectedInvoiceIds}
                onToggleView={() => setGroupedView((v) => !v)}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-0 flex-1 min-h-0 flex flex-col gap-2">
          <Card className="p-1 sm:p-1 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by receipt, customer..."
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
              loading={isLoading}
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
      </Tabs>

      <CreateCustomerPaymentDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) clearDeepLink();
        }}
        customers={customers}
        bankLedgers={bankLedgers}
        preselectedCustomerId={preselectedCustomerId}
        preselectedInvoiceIds={
          urlInvoiceId ? [parseInt(urlInvoiceId)] : selectedInvoiceIds
        }
        preselectedInvoices={preselectedInvoices.length ? preselectedInvoices : allInvoices}
        prefillAmount={urlAmount || ""}
        onCreated={() => {
          fetchPayments();
          fetchOutstanding();
          setSelectedInvoiceIds([]);
          clearDeepLink();
        }}
      />

      <CustomerPaymentDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        payment={loadingDetail ? null : selectedPayment}
      />
    </div>
  );
}
