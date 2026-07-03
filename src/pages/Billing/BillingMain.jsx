import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Plus,
  Receipt,
  PackageCheck,
  LayoutDashboard,
  Search,
  Eye,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { ViewToggle } from "@/components/ui/view-toggle";
import { CardGrid } from "@/components/ui/card-grid";
import { Refresh } from "@/components/ui/Refresh";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getInvoices, getInvoiceStats } from "@/services/invoice";

import { fmt, PAGE_SIZE, billingFilters } from "./Billing.constants";
import BillingFilter from "./BillingFilter";
import BillingDashboard from "./BillingDashboard";
import InvoiceCard, { InvoiceStatusBadge } from "./InvoiceCard";
import CreateInvoiceDialog from "./CreateInvoiceDialog";
import RecordPaymentDialog from "./RecordPaymentDialog";
import InvoiceDetailDialog from "./InvoiceDetailDialog";
import InvoicePreviewDialog from "./InvoicePreviewDialog";
import DispatchedOrdersTab from "./DispatchedOrdersTab";

// ─── Column definitions for the smart Table view ─────────────────────────────
function useBillingColumns(onView, onPay) {
  return [
    {
      accessorKey: "invoiceNo",
      header: "Invoice No.",
      sortable: true,
      cell: (row) => <span className="font-medium">{row.invoiceNo}</span>,
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: (row) => (
        <div>
          <div className="font-medium text-sm">{row.customer?.name || "—"}</div>
          {row.customer?.code && (
            <div className="text-xs text-muted-foreground">{row.customer.code}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (row) => <InvoiceStatusBadge status={row.status} />,
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      align: "right",
      sortable: true,
      cell: (row) =>
        row.status === "CANCELLED" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="font-semibold">{fmt(row.totalAmount)}</span>
        ),
    },
    {
      accessorKey: "paidAmount",
      header: "Paid",
      align: "right",
      cell: (row) =>
        row.status === "CANCELLED" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="font-semibold text-green-600">{fmt(row.paidAmount)}</span>
        ),
    },
    {
      accessorKey: "outstanding",
      header: "Outstanding",
      align: "right",
      cell: (row) => {
        if (row.status === "CANCELLED") return <span className="text-muted-foreground">—</span>;
        const rem = row.totalAmount - row.paidAmount;
        return rem > 0.01 ? (
          <span className="font-bold text-orange-600">{fmt(rem)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      sortable: true,
      cell: (row) => new Date(row.dueDate).toLocaleDateString("en-IN"),
    },
    {
      accessorKey: "_count",
      header: "Orders",
      align: "center",
      cell: (row) => row._count?.saleOrders || 0,
    },
    {
      accessorKey: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex gap-1.5 justify-end">
          <Button
            variant="outline"
            size="xs"
            className="h-7 gap-1"
            onClick={() => onView(row.id)}
          >
            <Eye className="h-3 w-3" /> View
          </Button>
          {!["PAID", "CANCELLED"].includes(row.status) && (
            <Button size="xs" className="h-7 gap-1" onClick={() => onPay(row)}>
              <CreditCard className="h-3 w-3" /> Pay
            </Button>
          )}
        </div>
      ),
    },
  ];
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BillingMain() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForCustomer, setCreateForCustomer] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [amountLocked, setAmountLocked] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);

  // Invoice list controls
  const [view, setView] = useState("table");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sorting, setSorting] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter state
  const [filters, setFilters] = useState(billingFilters);
  const [tempFilters, setTempFilters] = useState(billingFilters);
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  // ── Invoice list query (only runs on Invoices tab) ────────────────────────
  const queryParams = {
    status: filters.status !== "ALL" ? filters.status : undefined,
    search: searchQuery || undefined,
    page: pageIndex + 1,
    limit: pageSize,
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate }),
    ...(sorting[0] && { sortField: sorting[0].id, sortDir: sorting[0].desc ? "desc" : "asc" }),
  };

  const { data: res, isLoading } = useQuery({
    queryKey: ["invoices", queryParams, refreshKey],
    queryFn: () => getInvoices(queryParams),
    placeholderData: keepPreviousData,
    enabled: activeTab === "invoices",
  });

  const invoices = res?.data || [];
  const totalCount = res?.pagination?.total || 0;

  // ── Stats query — aggregated from DB directly, no full row scan ──────────
  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ["invoices-stats", refreshKey],
    queryFn: getInvoiceStats,
    staleTime: 60_000,
    enabled: activeTab === "dashboard",
  });

  const stats = useMemo(
    () => ({
      total:       statsRes?.data?.total       || 0,
      pending:     statsRes?.data?.pending     || 0,
      paid:        statsRes?.data?.paid        || 0,
      outstanding: statsRes?.data?.outstanding || 0,
    }),
    [statsRes]
  );

  // ── Recent invoices query — small, separate, fetches only 5 rows ─────────
  const { data: recentRes } = useQuery({
    queryKey: ["invoices-recent", refreshKey],
    queryFn: () => getInvoices({ limit: 5, page: 1 }),
    staleTime: 60_000,
    enabled: activeTab === "dashboard",
  });

  const recentInvoices = recentRes?.data || [];

  // ── Filter helpers ─────────────────────────────────────────────────────────
  const hasActiveFilters = useMemo(
    () =>
      filters.status !== "ALL" ||
      filters.startDate !== "" ||
      filters.endDate !== "",
    [filters]
  );

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    toast.success(
      activeTab === "dashboard"
        ? "Billing dashboard has been refreshed."
        : "Invoice list has been refreshed."
    );
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPageIndex(0);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterDialog(false);
    setPageIndex(0);
  };

  const handleClearFilters = () => {
    setFilters(billingFilters);
    setTempFilters(billingFilters);
    setShowFilterDialog(false);
    setPageIndex(0);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters);
    setShowFilterDialog(false);
  };

  const columns = useBillingColumns(
    (id) => setDetailId(id),
    (inv) => setPaymentInvoice(inv)
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-1 sm:p-1 md:p-3 gap-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Billing</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create invoices · collect payments · track outstanding
          </p>
        </div>
        <div className="flex gap-1.5">
          <Refresh onClick={handleRefresh} />
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Create Invoice</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Dash</span>
          </TabsTrigger>
          <TabsTrigger value="dispatched" className="gap-1.5">
            <PackageCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Awaiting Invoice</span>
            <span className="sm:hidden">Awaiting Inv.</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Invoices</span>
            <span className="sm:hidden">Invoices</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Dashboard Tab ─────────────────────────────────────────────────── */}
        <TabsContent
          value="dashboard"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="overflow-y-auto flex-1 pb-4">
            <BillingDashboard
              stats={stats}
              statsLoading={statsLoading}
              recentInvoices={recentInvoices}
              onCreateInvoice={() => setCreateOpen(true)}
              onViewInvoice={(id) => setDetailId(id)}
            />
          </div>
        </TabsContent>

        {/* ── Dispatch Orders Tab ───────────────────────────────────────────── */}
        <TabsContent
          value="dispatched"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="overflow-y-auto flex-1 pb-4">
            <DispatchedOrdersTab
              onBillCustomer={(customerId) => {
                setCreateForCustomer(customerId);
                setCreateOpen(true);
              }}
            />
          </div>
        </TabsContent>

        {/* ── Invoices Tab ──────────────────────────────────────────────────── */}
        <TabsContent
          value="invoices"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* Search + View + Filter bar */}
          <Card className="p-1 sm:p-1 flex-shrink-0 mb-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search invoice no. or customer…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="xs"
                  variant="outline"
                  className="h-8 px-3"
                  onClick={handleSearch}
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
                <ViewToggle view={view} onViewChange={setView} />
                <BillingFilter
                  filters={filters}
                  tempFilters={tempFilters}
                  setTempFilters={setTempFilters}
                  showFilterDialog={showFilterDialog}
                  setShowFilterDialog={setShowFilterDialog}
                  hasActiveFilters={hasActiveFilters}
                  onApplyFilters={handleApplyFilters}
                  onClearFilters={handleClearFilters}
                  onCancelFilters={handleCancelFilters}
                />
              </div>
            </div>
          </Card>

          {/* Table View */}
          {view === "table" && (
            <div className="flex-1 min-h-0">
              <Table
                data={invoices}
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
                emptyMessage="No invoices found"
              />
            </div>
          )}

          {/* Card View */}
          {view === "card" && (
            <div className="flex-1 min-h-0">
              <CardGrid
                items={invoices}
                renderCard={(inv) => (
                  <InvoiceCard
                    key={inv.id}
                    invoice={inv}
                    onView={(id) => setDetailId(id)}
                    onPreview={(inv) => setPreviewInvoice(inv)}
                    onPay={(inv) => setPaymentInvoice(inv)}
                    onQuickClose={(inv) => {
                      setPaymentInvoice(inv);
                      setAmountLocked(true);
                    }}
                  />
                )}
                isLoading={isLoading}
                emptyMessage="No invoices found"
                pagination={true}
                pageIndex={pageIndex}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPageIndex}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageIndex(0);
                }}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ───────────────────────────────────────────────────────────── */}
      <CreateInvoiceDialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateForCustomer("");
        }}
        initialCustomerId={createForCustomer}
      />
      <InvoiceDetailDialog
        invoiceId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        onPay={(inv) => {
          setDetailId(null);
          setPaymentInvoice(inv);
        }}
        onQuickClose={(inv) => {
          setDetailId(null);
          setPaymentInvoice(inv);
          setAmountLocked(true);
        }}
        onPreview={(inv) => setPreviewInvoice(inv)}
      />
      <RecordPaymentDialog
        invoice={paymentInvoice}
        open={!!paymentInvoice}
        amountLocked={amountLocked}
        onClose={() => {
          setPaymentInvoice(null);
          setAmountLocked(false);
        }}
      />
      <InvoicePreviewDialog
        invoice={previewInvoice}
        open={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
      />
    </div>
  );
}
