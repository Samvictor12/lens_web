import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, CreditCard, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { Refresh } from "@/components/ui/Refresh";
import { getVendorPayments, getVendorPaymentById, getOutstandingVendorInvoices } from "@/services/vendorPayment";
import { getCashBankLedgers } from "@/services/ledger";
import { getVendorDropdown } from "@/services/vendor";
import { useVendorPaymentColumns } from "./useVendorPaymentColumns";
import CreateVendorPaymentFromInvoicesDialog from "./CreateVendorPaymentFromInvoicesDialog";
import CreateVendorInvoiceDialog from "./CreateVendorInvoiceDialog";
import VendorPaymentDetailDialog from "./VendorPaymentDetailDialog";
import OutstandingVendorInvoicesQueue from "./OutstandingVendorInvoicesQueue";
import PaymentHistoryExpandRow from "@/components/accounting/PaymentHistoryExpandRow";
import VendorCreditDebitNotesTab from "./VendorCreditDebitNotesTab";

const OUTSTANDING_GROUP_OPTIONS = [
  { id: "", name: "No Grouping" },
  { id: "vendor", name: "Vendor" },
];

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

  const [activeTab, setActiveTab] = useState("outstanding");
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [outstandingSearch, setOutstandingSearch] = useState("");
  const [outstandingVendorId, setOutstandingVendorId] = useState(null);
  const [groupBy, setGroupBy] = useState("vendor");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [sorting, setSorting] = useState([]);

  const [outstandingGroups, setOutstandingGroups] = useState([]);
  const [flatInvoices, setFlatInvoices] = useState([]);
  const [loadingOutstanding, setLoadingOutstanding] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);

  const [createPaymentOpen, setCreatePaymentOpen] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [bankLedgers, setBankLedgers] = useState([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedPaymentIds, setExpandedPaymentIds] = useState([]);

  const allInvoices = useMemo(
    () => outstandingGroups.flatMap((g) => g.invoices),
    [outstandingGroups]
  );

  const filteredGroups = useMemo(() => {
    const q = outstandingSearch.trim().toLowerCase();
    return outstandingGroups
      .filter((g) => {
        if (outstandingVendorId != null && String(g.vendorId) !== String(outstandingVendorId)) {
          return false;
        }
        return true;
      })
      .map((g) => ({
        ...g,
        invoices: g.invoices.filter((inv) => matchesInvoiceSearch(inv, q, g)),
      }))
      .filter((g) => g.invoices.length > 0);
  }, [outstandingGroups, outstandingSearch, outstandingVendorId]);

  const filteredFlatInvoices = useMemo(() => {
    const q = outstandingSearch.trim().toLowerCase();
    return flatInvoices.filter((inv) => {
      if (outstandingVendorId != null && String(inv.vendorId) !== String(outstandingVendorId)) {
        return false;
      }
      const group = outstandingGroups.find((g) => g.vendorId === inv.vendorId);
      return matchesInvoiceSearch(inv, q, group);
    });
  }, [flatInvoices, outstandingSearch, outstandingVendorId, outstandingGroups]);

  const preselectedInvoices = useMemo(
    () => allInvoices.filter((inv) => selectedInvoiceIds.includes(inv.id)),
    [allInvoices, selectedInvoiceIds]
  );

  const preselectedVendorId = preselectedInvoices[0]
    ? String(
        outstandingGroups.find((g) =>
          g.invoices.some((i) => i.id === preselectedInvoices[0].id)
        )?.vendorId || ""
      )
    : "";

  const prefillPaymentAmount = useMemo(
    () =>
      preselectedInvoices.reduce((sum, inv) => sum + (parseFloat(inv.outstanding) || 0), 0),
    [preselectedInvoices]
  );

  const handleView = async (p) => {
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

  const columns = useVendorPaymentColumns(handleView, {
    expandedIds: expandedPaymentIds,
    onToggleExpand: toggleExpand,
  });

  const fetchOutstanding = useCallback(async () => {
    setLoadingOutstanding(true);
    try {
      const res = await getOutstandingVendorInvoices();
      const groups = res.data?.groups || [];
      setOutstandingGroups(groups);
      setFlatInvoices(
        groups.flatMap((g) => g.invoices.map((inv) => ({ ...inv, vendorId: g.vendorId })))
      );
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
      if (historyFrom) params.from = historyFrom;
      if (historyTo) params.to = historyTo;
      const res = await getVendorPayments(params);
      setPayments(res.data || []);
      setTotalCount(res.pagination?.total ?? (res.data?.length || 0));
    } catch {
      toast({ variant: "destructive", title: "Failed to load payments" });
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, searchQuery, historyFrom, historyTo, refreshKey]);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [vendorRes, ledgers] = await Promise.all([
        getVendorDropdown(),
        getCashBankLedgers(),
      ]);
      if (vendorRes.success) setVendors(vendorRes.data || []);
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
    else if (activeTab === "history") fetchPayments();
  }, [activeTab, fetchOutstanding, fetchPayments]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    toast({ title: "Refreshed" });
  };

  const handleRecordPayment = () => {
    if (!selectedInvoiceIds.length) {
      toast({ variant: "destructive", title: "Select at least one outstanding invoice" });
      return;
    }
    setCreatePaymentOpen(true);
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Vendor Payments</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Register vendor invoices against POs, then pay against outstanding invoices
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button size="xs" variant="outline" className="gap-1.5 h-8" onClick={() => setCreateInvoiceOpen(true)}>
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Register Invoice</span>
          </Button>
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={handleRecordPayment}
            disabled={activeTab === "outstanding" && !selectedInvoiceIds.length}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Record Payment</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-4 mb-4 flex-shrink-0">
          <TabsTrigger value="outstanding">Outstanding Invoices</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="creditNotes">Credit Notes</TabsTrigger>
          <TabsTrigger value="debitNotes">Debit Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="outstanding" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden gap-2">
          <Card className="p-1 sm:p-1 flex-shrink-0">
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
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Group by:
                </span>
                <div className="w-40">
                  <FormSelect
                    name="groupBy"
                    options={OUTSTANDING_GROUP_OPTIONS}
                    value={groupBy}
                    onChange={(value) => setGroupBy(value ?? null)}
                    placeholder="None"
                    isSearchable={false}
                  />
                </div>
              </div>
              <div className="w-full sm:w-48 shrink-0">
                <FormSelect
                  name="vendorFilter"
                  options={vendors}
                  value={outstandingVendorId}
                  onChange={(value) => setOutstandingVendorId(value ?? null)}
                  placeholder="All vendors"
                  isSearchable={true}
                />
              </div>
              <Refresh onClick={handleRefresh} />
            </div>
          </Card>

          <Card className="p-2 flex min-h-0 flex-1 flex-col overflow-hidden">
            {loadingOutstanding ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Loading...</p>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <OutstandingVendorInvoicesQueue
                  groups={filteredGroups}
                  flatInvoices={filteredFlatInvoices}
                  grouped={groupBy === "vendor"}
                  selectedIds={selectedInvoiceIds}
                  onSelectionChange={setSelectedInvoiceIds}
                />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-0 flex-1 min-h-0 flex flex-col gap-2">
          <Card className="p-1 sm:p-1 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by voucher, vendor..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPageIndex(0);
                  }}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
                <Input
                  type="date"
                  className="h-8 w-36 text-sm"
                  value={historyFrom}
                  onChange={(e) => {
                    setHistoryFrom(e.target.value);
                    setPageIndex(0);
                  }}
                />
                <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
                <Input
                  type="date"
                  className="h-8 w-36 text-sm"
                  value={historyTo}
                  onChange={(e) => {
                    setHistoryTo(e.target.value);
                    setPageIndex(0);
                  }}
                />
                {(historyFrom || historyTo) && (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-8 px-2"
                    onClick={() => {
                      setHistoryFrom("");
                      setHistoryTo("");
                      setPageIndex(0);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
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
              emptyMessage="No vendor payments found"
              expandedRowIds={expandedPaymentIds}
              renderExpandedRow={(p) => (
                <PaymentHistoryExpandRow type="vendor" payment={p} />
              )}
            />
          </div>
        </TabsContent>

        <TabsContent value="creditNotes" className="mt-0 flex-1 min-h-0 flex flex-col gap-2">
          <VendorCreditDebitNotesTab type="credit" vendors={vendors} />
        </TabsContent>

        <TabsContent value="debitNotes" className="mt-0 flex-1 min-h-0 flex flex-col gap-2">
          <VendorCreditDebitNotesTab type="debit" vendors={vendors} />
        </TabsContent>
      </Tabs>

      <CreateVendorPaymentFromInvoicesDialog
        open={createPaymentOpen}
        onOpenChange={setCreatePaymentOpen}
        vendors={vendors}
        bankLedgers={bankLedgers}
        preselectedVendorId={preselectedVendorId}
        preselectedInvoiceIds={selectedInvoiceIds}
        preselectedInvoices={preselectedInvoices}
        prefillAmount={prefillPaymentAmount > 0 ? String(prefillPaymentAmount) : ""}
        onCreated={() => {
          fetchPayments();
          fetchOutstanding();
          setSelectedInvoiceIds([]);
        }}
      />

      <CreateVendorInvoiceDialog
        open={createInvoiceOpen}
        onOpenChange={setCreateInvoiceOpen}
        vendors={vendors}
        onCreated={() => fetchOutstanding()}
      />

      <VendorPaymentDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        payment={loadingDetail ? null : selectedPayment}
      />
    </div>
  );
}
