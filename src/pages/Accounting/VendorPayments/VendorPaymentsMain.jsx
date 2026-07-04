import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Refresh } from "@/components/ui/Refresh";
import { getVendorPayments, getVendorPaymentById, getOutstandingPOs } from "@/services/vendorPayment";
import { getCashBankLedgers } from "@/services/ledger";
import { getVendorDropdown } from "@/services/vendor";
import { useVendorPaymentColumns } from "./useVendorPaymentColumns";
import CreateVendorPaymentDialog from "./CreateVendorPaymentDialog";
import VendorPaymentDetailDialog from "./VendorPaymentDetailDialog";
import OutstandingPOsQueue from "./OutstandingPOsQueue";
import PaymentHistoryExpandRow from "@/components/accounting/PaymentHistoryExpandRow";

export default function VendorPaymentsMain() {
  const { toast } = useToast();

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
  const [flatPOs, setFlatPOs] = useState([]);
  const [groupedView, setGroupedView] = useState(true);
  const [loadingOutstanding, setLoadingOutstanding] = useState(false);
  const [selectedPoIds, setSelectedPoIds] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [bankLedgers, setBankLedgers] = useState([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedPaymentIds, setExpandedPaymentIds] = useState([]);

  const allPOs = useMemo(
    () => outstandingGroups.flatMap((g) => g.purchaseOrders),
    [outstandingGroups]
  );

  const preselectedPOs = useMemo(
    () => allPOs.filter((po) => selectedPoIds.includes(po.purchaseOrderId)),
    [allPOs, selectedPoIds]
  );

  const preselectedVendorId = preselectedPOs[0]
    ? String(
        outstandingGroups.find((g) =>
          g.purchaseOrders.some((p) => p.purchaseOrderId === preselectedPOs[0].purchaseOrderId)
        )?.vendorId || ""
      )
    : "";

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
      const res = await getOutstandingPOs();
      const groups = res.data?.groups || [];
      setOutstandingGroups(groups);
      setFlatPOs(
        groups.flatMap((g) =>
          g.purchaseOrders.map((po) => ({ ...po, vendorId: g.vendorId }))
        )
      );
    } catch {
      toast({ variant: "destructive", title: "Failed to load outstanding POs" });
    } finally {
      setLoadingOutstanding(false);
    }
  }, [refreshKey]);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { page: pageIndex + 1, limit: pageSize };
      if (searchQuery) params.search = searchQuery;
      const res = await getVendorPayments(params);
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
    else fetchPayments();
  }, [activeTab, fetchOutstanding, fetchPayments]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    toast({ title: "Refreshed" });
  };

  const handleRecordPayment = () => {
    if (!selectedPoIds.length) {
      toast({ variant: "destructive", title: "Select at least one PO" });
      return;
    }
    setCreateOpen(true);
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Vendor Payments</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record and view vendor payment vouchers
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="xs"
            variant="outline"
            className="gap-1.5 h-8"
            onClick={handleRecordPayment}
            disabled={activeTab === "outstanding" && !selectedPoIds.length}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Record Payment</span>
          </Button>
          <Button size="xs" className="gap-1.5 h-8" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Payment</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-2">
          <TabsTrigger value="outstanding">Outstanding Payables</TabsTrigger>
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
              <OutstandingPOsQueue
                groups={outstandingGroups}
                flatPOs={flatPOs}
                grouped={groupedView}
                selectedIds={selectedPoIds}
                onSelectionChange={setSelectedPoIds}
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
                  placeholder="Search by voucher, vendor..."
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
              emptyMessage="No vendor payments found"
              expandedRowIds={expandedPaymentIds}
              renderExpandedRow={(p) => (
                <PaymentHistoryExpandRow type="vendor" payment={p} />
              )}
            />
          </div>
        </TabsContent>
      </Tabs>

      <CreateVendorPaymentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        vendors={vendors}
        bankLedgers={bankLedgers}
        preselectedVendorId={preselectedVendorId}
        preselectedPoIds={selectedPoIds}
        preselectedPOs={preselectedPOs}
        onCreated={() => {
          fetchPayments();
          fetchOutstanding();
          setSelectedPoIds([]);
        }}
      />

      <VendorPaymentDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        payment={loadingDetail ? null : selectedPayment}
        onClosed={() => {
          handleView(selectedPayment);
          fetchPayments();
        }}
      />
    </div>
  );
}
