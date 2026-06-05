import { useState, useEffect, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Refresh } from "@/components/ui/Refresh";
import { getVendorPayments, getVendorPaymentById } from "@/services/vendorPayment";
import { getCashBankLedgers } from "@/services/ledger";
import { getVendorDropdown } from "@/services/vendor";
import { useVendorPaymentColumns } from "./useVendorPaymentColumns";
import CreateVendorPaymentDialog from "./CreateVendorPaymentDialog";
import VendorPaymentDetailDialog from "./VendorPaymentDetailDialog";

export default function VendorPaymentsMain() {
  const { toast } = useToast();

  // List state
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting
  const [sorting, setSorting] = useState([]);

  // Create dialog data
  const [createOpen, setCreateOpen] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [bankLedgers, setBankLedgers] = useState([]);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  const columns = useVendorPaymentColumns(handleView);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { page: pageIndex + 1, limit: pageSize };
      if (searchQuery) params.search = searchQuery;
      const sortField = sorting[0]?.id || "paymentDate";
      const sortDir = sorting[0]?.desc ? "desc" : "asc";
      params.sortField = sortField;
      params.sortDir = sortDir;

      const res = await getVendorPayments(params);
      setPayments(res.data || []);
      setTotalCount(res.pagination?.total ?? (res.data?.length || 0));
    } catch {
      toast({ variant: "destructive", title: "Failed to load payments" });
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, searchQuery, sorting, refreshKey]);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [vendorRes, ledgerRes] = await Promise.all([
        getVendorDropdown(),
        getCashBankLedgers(),
      ]);
      if (vendorRes.success) setVendors(vendorRes.data || []);
      if (ledgerRes.success) setBankLedgers(ledgerRes.data || []);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    toast({ title: "Refreshed" });
  };

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Vendor Payments
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record and view vendor payment vouchers
          </p>
        </div>
        <Button size="xs" className="gap-1.5 h-8" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Payment</span>
        </Button>
      </div>

      {/* Search bar */}
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

      {/* Table */}
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
          pagination={true}
          emptyMessage="No vendor payments found"
        />
      </div>

      {/* Create Payment Dialog */}
      <CreateVendorPaymentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        vendors={vendors}
        bankLedgers={bankLedgers}
        onCreated={fetchPayments}
      />

      {/* Detail Dialog */}
      <VendorPaymentDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        payment={loadingDetail ? null : selectedPayment}
      />
    </div>
  );
}
